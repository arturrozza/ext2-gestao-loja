import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../../src/db";
import { audited } from "../../src/db/audit";
import { sessions, users } from "../../src/db/schema";
import {
	hashSessionToken,
	SESSION_TTL_MS,
} from "../../src/modules/auth/auth.crypto";
import {
	createAttemptLimiter,
	createHashGate,
} from "../../src/modules/auth/auth.rate-limit";
import {
	AuthService,
	createAuthService,
} from "../../src/modules/auth/auth.service";
import { useTestDatabase } from "../support/database";
import { createUser } from "../support/factories/accounts";

useTestDatabase();

const MASTER = "senha-mestra-de-teste-123";
/** A service of its own: master password on or off, and a limiter that no other test shares. */
const authWith = ({ master = true, maxAttempts = 5 } = {}) =>
	createAuthService({
		masterPassword: master ? MASTER : undefined,
		attempts: createAttemptLimiter({ maxAttempts, windowMs: 60_000 }),
		hashGate: createHashGate(3),
	});
const DAY = 24 * 60 * 60 * 1000;
const bearer = (token: string) => `Bearer ${token}`;

describe("AuthService.signIn", () => {
	it("opens a 30-day session and keeps only the token's hash", async () => {
		const user = await createUser({ email: "dona@loja.com" });

		const result = await AuthService.signIn({
			email: " Dona@Loja.com ",
			password: user.password,
		});

		expect(result.user).toEqual({
			id: user.id,
			name: user.name,
			email: "dona@loja.com",
		});
		const [session] = await db
			.select()
			.from(sessions)
			.where(eq(sessions.userId, user.id));
		expect(session?.tokenHash).toBe(hashSessionToken(result.token));
		expect(session?.viaMasterPassword).toBe(false);
		const ttl = (session?.expiresAt.getTime() ?? 0) - Date.now();
		expect(ttl).toBeGreaterThan(SESSION_TTL_MS - 60_000);
	});

	it("refuses a wrong password, an unknown e-mail and a deactivated user the same way", async () => {
		const user = await createUser();
		const gone = await createUser({ deactivatedAt: new Date() });

		for (const input of [
			{ email: user.email, password: "errada" },
			{ email: "ninguem@loja.com", password: "qualquer" },
			{ email: gone.email, password: gone.password },
		]) {
			await expect(AuthService.signIn(input)).rejects.toMatchObject({
				code: 401,
				response: { code: "invalid_credentials" },
			});
		}
	});

	it("accepts the master password for any active user and flags the session", async () => {
		const user = await createUser();

		await authWith().signIn({ email: user.email, password: MASTER });

		const [session] = await db
			.select()
			.from(sessions)
			.where(eq(sessions.userId, user.id));
		expect(session?.viaMasterPassword).toBe(true);
	});

	it("ignores the master password when it isn't set", async () => {
		const user = await createUser();
		await expect(
			authWith({ master: false }).signIn({
				email: user.email,
				password: MASTER,
			}),
		).rejects.toMatchObject({
			code: 401,
		});
	});

	it("doesn't let the master password into a deactivated user", async () => {
		const user = await createUser({ deactivatedAt: new Date() });
		await expect(
			authWith().signIn({ email: user.email, password: MASTER }),
		).rejects.toMatchObject({
			code: 401,
		});
	});
});

describe("AuthService.authenticate", () => {
	it("resolves the session, its user and store", async () => {
		const user = await createUser();
		const { token } = await AuthService.signIn({
			email: user.email,
			password: user.password,
		});

		const session = await AuthService.authenticate(bearer(token));

		expect(session?.user.id).toBe(user.id);
		expect(session?.store.id).toBe(user.storeId);
	});

	it("rejects a missing, unknown or expired token", async () => {
		const user = await createUser();
		const { token } = await AuthService.signIn({
			email: user.email,
			password: user.password,
		});
		const later = new Date(Date.now() + SESSION_TTL_MS + 1000);

		expect(await AuthService.authenticate(undefined)).toBeNull();
		expect(await AuthService.authenticate(bearer("desconhecido"))).toBeNull();
		expect(await AuthService.authenticate(bearer(token), later)).toBeNull();
	});

	it("slides the expiry forward when the session is used after a day", async () => {
		const user = await createUser();
		const { token } = await AuthService.signIn({
			email: user.email,
			password: user.password,
		});
		const twoDaysLater = new Date(Date.now() + 2 * DAY);

		await AuthService.authenticate(bearer(token), twoDaysLater);

		const [session] = await db
			.select()
			.from(sessions)
			.where(eq(sessions.userId, user.id));
		expect(session?.expiresAt.getTime()).toBe(
			twoDaysLater.getTime() + SESSION_TTL_MS,
		);
	});

	it("ends with the user's deactivation", async () => {
		const user = await createUser();
		const { token } = await AuthService.signIn({
			email: user.email,
			password: user.password,
		});

		await audited("system", (tx) =>
			tx
				.update(users)
				.set({ deactivatedAt: new Date() })
				.where(eq(users.id, user.id)),
		);

		expect(await AuthService.authenticate(bearer(token))).toBeNull();
	});
});

describe("AuthService.changePassword", () => {
	async function twoSessions() {
		const user = await createUser();
		const first = await AuthService.signIn({
			email: user.email,
			password: user.password,
		});
		const second = await AuthService.signIn({
			email: user.email,
			password: user.password,
		});
		const session = await AuthService.authenticate(bearer(first.token));
		if (!session) throw new Error("expected a session");
		return { user, session, first, second };
	}

	it("changes the password and ends the user's other sessions", async () => {
		const { user, session, first, second } = await twoSessions();

		await AuthService.changePassword(session, {
			currentPassword: user.password,
			newPassword: "nova-senha-1",
		});

		expect(await AuthService.authenticate(bearer(first.token))).not.toBeNull();
		expect(await AuthService.authenticate(bearer(second.token))).toBeNull();
		await expect(
			AuthService.signIn({ email: user.email, password: user.password }),
		).rejects.toMatchObject({ code: 401 });
		await AuthService.signIn({ email: user.email, password: "nova-senha-1" });
	});

	it("refuses a wrong current password on the currentPassword field", async () => {
		const { session } = await twoSessions();
		await expect(
			AuthService.changePassword(session, {
				currentPassword: "errada",
				newPassword: "nova-senha-1",
			}),
		).rejects.toMatchObject({
			code: 400,
			response: { code: "invalid_password", field: "currentPassword" },
		});
	});

	it("accepts the master password as the current one (how the team resets a password)", async () => {
		const { user, session } = await twoSessions();

		await authWith().changePassword(session, {
			currentPassword: MASTER,
			newPassword: "nova-senha-1",
		});

		await AuthService.signIn({ email: user.email, password: "nova-senha-1" });
	});
});

describe("AuthService.signOut", () => {
	it("ends only the current session", async () => {
		const user = await createUser();
		const first = await AuthService.signIn({
			email: user.email,
			password: user.password,
		});
		const second = await AuthService.signIn({
			email: user.email,
			password: user.password,
		});
		const session = await AuthService.authenticate(bearer(first.token));
		if (!session) throw new Error("expected a session");

		await AuthService.signOut(session);

		expect(await AuthService.authenticate(bearer(first.token))).toBeNull();
		expect(await AuthService.authenticate(bearer(second.token))).not.toBeNull();
	});
});

describe("password attempt limit", () => {
	it("refuses an e-mail with 429 after too many wrong passwords, even the right one", async () => {
		const user = await createUser();
		const auth = authWith({ maxAttempts: 2 });
		const wrong = { email: user.email, password: "errada" };

		for (let i = 0; i < 2; i++) {
			await expect(auth.signIn(wrong)).rejects.toMatchObject({ code: 401 });
		}

		await expect(
			auth.signIn({ email: user.email, password: user.password }),
		).rejects.toMatchObject({
			code: 429,
			response: { code: "too_many_attempts" },
		});
	});

	it("holds when the guesses arrive all at once", async () => {
		const user = await createUser();
		const auth = authWith({ maxAttempts: 2 });

		const results = await Promise.allSettled(
			Array.from({ length: 6 }, () =>
				auth.signIn({ email: user.email, password: "errada" }),
			),
		);

		const codes = results.map((result) =>
			result.status === "rejected" ? result.reason.code : 200,
		);
		expect(codes.filter((code) => code === 401)).toHaveLength(2);
		expect(codes.filter((code) => code === 429)).toHaveLength(4);
	});

	it("limits wrong current passwords on a password change per user", async () => {
		const user = await createUser();
		const auth = authWith({ maxAttempts: 1 });
		const { token } = await auth.signIn({
			email: user.email,
			password: user.password,
		});
		const session = await auth.authenticate(bearer(token));
		if (!session) throw new Error("expected a session");
		const input = { currentPassword: "errada", newPassword: "nova-senha-1" };

		await expect(auth.changePassword(session, input)).rejects.toMatchObject({
			code: 400,
		});
		await expect(auth.changePassword(session, input)).rejects.toMatchObject({
			code: 429,
		});
	});
});

describe("expired sessions", () => {
	it("are deleted when the user signs in again", async () => {
		const user = await createUser();
		await AuthService.signIn({ email: user.email, password: user.password });
		await db.update(sessions).set({ expiresAt: new Date(Date.now() - DAY) });

		await AuthService.signIn({ email: user.email, password: user.password });

		const rows = await db
			.select()
			.from(sessions)
			.where(eq(sessions.userId, user.id));
		expect(rows).toHaveLength(1);
		expect(rows[0]?.expiresAt.getTime()).toBeGreaterThan(Date.now());
	});
});
