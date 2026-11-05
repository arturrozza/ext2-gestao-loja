import { and, eq, gt, isNull, lte, ne } from "drizzle-orm";
import { db } from "../../db";
import { sessions, stores, users } from "../../db/schema";
import { env } from "../../env";
import { httpError } from "../../lib/http-error";
import {
	generateSessionToken,
	hashPassword,
	hashSessionToken,
	isMasterPassword,
	normalizeEmail,
	readBearerToken,
	renewedExpiry,
	SESSION_TTL_MS,
	verifyAgainstDummy,
	verifyPassword,
} from "./auth.crypto";
import type { AuthModel, AuthSession } from "./auth.model";
import {
	type AttemptLimiter,
	createAttemptLimiter,
	createHashGate,
	type HashGate,
} from "./auth.rate-limit";

const invalidCredentials = () =>
	httpError(401, {
		code: "invalid_credentials",
		message: "E-mail ou senha inválidos.",
	});

const invalidCurrentPassword = () =>
	httpError(400, {
		code: "invalid_password",
		message: "A senha atual está incorreta.",
		field: "currentPassword",
	});

type AuthConfig = {
	/** Signs in as any active user; `undefined` turns it off. */
	masterPassword: string | undefined;
	/** Wrong passwords per e-mail (sign-in) or per user (password change). */
	attempts: AttemptLimiter;
	/** Password hashes running at once. */
	hashGate: HashGate;
};

function findActiveAccount(email: string) {
	return db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			passwordHash: users.passwordHash,
			storeName: stores.name,
		})
		.from(users)
		.innerJoin(stores, eq(stores.id, users.storeId))
		.where(and(eq(users.email, email), isNull(users.deactivatedAt)))
		.limit(1)
		.then((rows) => rows[0]);
}

/** Opens a session and drops the user's expired ones, so the table doesn't grow with every sign-in. */
async function openSession(userId: string, viaMasterPassword: boolean) {
	const token = generateSessionToken();
	const now = new Date();
	await db.transaction(async (tx) => {
		await tx
			.delete(sessions)
			.where(and(eq(sessions.userId, userId), lte(sessions.expiresAt, now)));
		await tx.insert(sessions).values({
			userId,
			tokenHash: hashSessionToken(token),
			expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
			viaMasterPassword,
		});
	});
	return token;
}

/** The auth rules with their settings injected, so tests build their own (master password on, a fresh limiter). */
export function createAuthService({
	masterPassword,
	attempts,
	hashGate,
}: AuthConfig) {
	/** The master password only opens an account that exists. */
	function masterMatch(hash: string | null, password: string) {
		return hash && isMasterPassword(password, masterPassword) ? "master" : null;
	}

	/**
	 * The one password check of sign-in and password change: reserves an attempt for `key`, then accepts the user's
	 * own password or the master password. Without an account (`hash` null) it still spends a hash, so timing doesn't
	 * tell which e-mails exist. Every master password use is logged.
	 */
	async function checkPassword(input: {
		key: string;
		hash: string | null;
		password: string;
		who: string;
	}): Promise<"own" | "master" | null> {
		attempts.reserve(input.key);
		const { hash, password } = input;
		const own = await hashGate(() =>
			hash ? verifyPassword(password, hash) : verifyAgainstDummy(password),
		);
		const match = own ? "own" : masterMatch(hash, password);
		if (!match) return null;
		attempts.clear(input.key);
		if (match === "master") {
			console.warn(
				`[auth] master password used for ${input.who} (${input.key})`,
			);
		}
		return match;
	}

	return {
		/** E-mail and password, or the master password for any active user. Opens a 30-day sliding session. */
		async signIn(
			input: AuthModel["signInBody"],
		): Promise<AuthModel["signInResponse"]> {
			const email = normalizeEmail(input.email);
			const account = await findActiveAccount(email);
			const match = await checkPassword({
				key: `sign-in:${email}`,
				hash: account?.passwordHash ?? null,
				password: input.password,
				who: email,
			});
			if (!(account && match)) throw invalidCredentials();

			const token = await openSession(account.id, match === "master");
			return {
				token,
				user: { id: account.id, name: account.name, email: account.email },
				store: { name: account.storeName },
			};
		},

		/** Session behind an `Authorization` header, or `null` (missing, unknown, expired or deactivated user). */
		async authenticate(
			authorization: string | undefined,
			now = new Date(),
		): Promise<AuthSession | null> {
			const token = readBearerToken(authorization);
			if (!token) return null;

			const [row] = await db
				.select({
					id: sessions.id,
					expiresAt: sessions.expiresAt,
					user: { id: users.id, name: users.name, email: users.email },
					store: { id: stores.id, name: stores.name },
				})
				.from(sessions)
				.innerJoin(users, eq(users.id, sessions.userId))
				.innerJoin(stores, eq(stores.id, users.storeId))
				.where(
					and(
						eq(sessions.tokenHash, hashSessionToken(token)),
						gt(sessions.expiresAt, now),
						isNull(users.deactivatedAt),
					),
				)
				.limit(1);
			if (!row) return null;

			const expiresAt = renewedExpiry(row.expiresAt, now);
			if (expiresAt) {
				await db
					.update(sessions)
					.set({ expiresAt })
					.where(eq(sessions.id, row.id));
			}
			const { expiresAt: _, ...session } = row;
			return session;
		},

		view(session: AuthSession): AuthModel["session"] {
			return { user: session.user, store: { name: session.store.name } };
		},

		async signOut(session: AuthSession): Promise<void> {
			await db.delete(sessions).where(eq(sessions.id, session.id));
		},

		/**
		 * The current password (or the master password: that's how the team resets a forgotten one) must match. Every
		 * other session of the user ends, so a password change locks out whoever else had it.
		 */
		async changePassword(
			session: AuthSession,
			input: AuthModel["changePasswordBody"],
		): Promise<void> {
			const [account] = await db
				.select({ passwordHash: users.passwordHash })
				.from(users)
				.where(eq(users.id, session.user.id));
			const match = await checkPassword({
				key: `password:${session.user.id}`,
				hash: account?.passwordHash ?? null,
				password: input.currentPassword,
				who: session.user.email,
			});
			if (!match) throw invalidCurrentPassword();

			const passwordHash = await hashPassword(input.newPassword);
			await db.transaction(async (tx) => {
				await tx
					.update(users)
					.set({ passwordHash })
					.where(eq(users.id, session.user.id));
				await tx
					.delete(sessions)
					.where(
						and(
							eq(sessions.userId, session.user.id),
							ne(sessions.id, session.id),
						),
					);
			});
		},
	};
}

export type AuthService = ReturnType<typeof createAuthService>;

/**
 * 5 wrong passwords in 15 minutes per e-mail or user, and at most 3 hashes at once (~64 MiB each, on a 512 MB box).
 * The lock also holds the master password back for that e-mail until the window ends.
 */
export const AuthService = createAuthService({
	masterPassword: env.MASTER_PASSWORD,
	attempts: createAttemptLimiter({ maxAttempts: 5, windowMs: 15 * 60 * 1000 }),
	hashGate: createHashGate(3),
});
