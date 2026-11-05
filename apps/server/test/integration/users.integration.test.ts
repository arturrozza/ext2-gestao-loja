import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { audited } from "../../src/db/audit";
import { users } from "../../src/db/schema";
import { AuthService } from "../../src/modules/auth/auth.service";
import { UsersService } from "../../src/modules/users/users.service";
import { useTestDatabase } from "../support/database";
import { createUser, signedIn } from "../support/factories/accounts";

useTestDatabase();

async function sessionOf(token: string) {
	const session = await AuthService.authenticate(`Bearer ${token}`);
	if (!session) throw new Error("expected a session");
	return session;
}

describe("UsersService.create", () => {
	it("creates a user in the store who can sign in", async () => {
		const { session } = await signedIn();

		const created = await UsersService.create(session, {
			name: "  Bia ",
			email: "Bia@Loja.com",
			password: "senha-da-bia",
		});

		expect(created).toMatchObject({
			name: "Bia",
			email: "bia@loja.com",
			active: true,
		});
		const result = await AuthService.signIn({
			email: "bia@loja.com",
			password: "senha-da-bia",
		});
		expect(result.store.name).toBe("Loja Teste");
	});

	it("refuses an e-mail already in use, whatever the case or the store", async () => {
		await createUser({ email: "bia@loja.com" });
		const { session } = await signedIn();

		await expect(
			UsersService.create(session, {
				name: "Bia",
				email: "BIA@loja.com",
				password: "senha-da-bia",
			}),
		).rejects.toMatchObject({
			code: 409,
			response: { code: "email_taken", field: "email" },
		});
	});
});

describe("UsersService.list", () => {
	it("lists only the session's store, by name", async () => {
		const { user: owner } = await signedIn({ name: "Carla" });
		await createUser({
			storeId: owner.storeId,
			name: "Ana",
			deactivatedAt: new Date(),
		});
		await createUser({ name: "De outra loja" });

		const list = await UsersService.list(owner.storeId);

		expect(list.map((user) => [user.name, user.active])).toEqual([
			["Ana", false],
			["Carla", true],
		]);
	});
});

describe("UsersService.deactivate / reactivate", () => {
	it("deactivates a user and ends their sessions", async () => {
		const owner = await signedIn();
		const other = await signedIn({ storeId: owner.user.storeId });

		const result = await UsersService.deactivate(
			await sessionOf(owner.token),
			other.user.id,
		);

		expect(result.active).toBe(false);
		expect(
			await AuthService.authenticate(other.headers.authorization),
		).toBeNull();
	});

	it("is a no-op on a user who is already deactivated", async () => {
		const owner = await signedIn();
		const gone = await createUser({
			storeId: owner.user.storeId,
			deactivatedAt: new Date(),
		});

		const result = await UsersService.deactivate(
			await sessionOf(owner.token),
			gone.id,
		);

		expect(result.active).toBe(false);
	});

	it("can't leave the store with nobody when two users deactivate each other at once", async () => {
		const a = await signedIn();
		const b = await signedIn({ storeId: a.user.storeId });
		const [sessionA, sessionB] = [
			await sessionOf(a.token),
			await sessionOf(b.token),
		];

		const results = await Promise.allSettled([
			UsersService.deactivate(sessionA, b.user.id),
			UsersService.deactivate(sessionB, a.user.id),
		]);

		expect(results.map((result) => result.status).sort()).toEqual([
			"fulfilled",
			"rejected",
		]);
		const list = await UsersService.list(a.user.storeId);
		expect(list.filter((user) => user.active)).toHaveLength(1);
	});

	it("doesn't let a user deactivate themselves", async () => {
		const owner = await signedIn();
		await expect(
			UsersService.deactivate(await sessionOf(owner.token), owner.user.id),
		).rejects.toMatchObject({
			code: 400,
			response: { code: "cannot_deactivate_self" },
		});
	});

	it("doesn't touch another store's user", async () => {
		const owner = await signedIn();
		const stranger = await createUser();

		await expect(
			UsersService.deactivate(await sessionOf(owner.token), stranger.id),
		).rejects.toMatchObject({
			code: 404,
		});
		await expect(
			UsersService.reactivate(await sessionOf(owner.token), stranger.id),
		).rejects.toMatchObject({ code: 404 });
		await AuthService.signIn({
			email: stranger.email,
			password: stranger.password,
		});
	});

	it("doesn't bring back sessions from before the deactivation", async () => {
		const owner = await signedIn();
		const other = await signedIn({ storeId: owner.user.storeId });
		await audited("system", (tx) =>
			tx
				.update(users)
				.set({ deactivatedAt: new Date() })
				.where(eq(users.id, other.user.id)),
		);

		await UsersService.reactivate(await sessionOf(owner.token), other.user.id);

		expect(
			await AuthService.authenticate(other.headers.authorization),
		).toBeNull();
	});

	it("keeps the sessions of a user who is already active", async () => {
		const owner = await signedIn();
		const other = await signedIn({ storeId: owner.user.storeId });

		const result = await UsersService.reactivate(
			await sessionOf(owner.token),
			other.user.id,
		);

		expect(result.active).toBe(true);
		expect(
			await AuthService.authenticate(other.headers.authorization),
		).not.toBeNull();
	});

	it("reactivates a user, who can sign in again", async () => {
		const owner = await signedIn();
		const gone = await createUser({
			storeId: owner.user.storeId,
			deactivatedAt: new Date(),
		});

		const result = await UsersService.reactivate(
			await sessionOf(owner.token),
			gone.id,
		);

		expect(result.active).toBe(true);
		await AuthService.signIn({ email: gone.email, password: gone.password });
	});
});
