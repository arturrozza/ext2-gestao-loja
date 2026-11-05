import { describe, expect, it } from "bun:test";
import { db } from "../../src/db";
import { stores, users } from "../../src/db/schema";
import { seedAccountFromEnv, seedFirstAccount } from "../../src/db/seed";
import { envSchema } from "../../src/env";
import { AuthService } from "../../src/modules/auth/auth.service";
import { useTestDatabase } from "../support/database";
import { createUser } from "../support/factories/accounts";

useTestDatabase();

const account = {
	storeName: "Mundo Madam",
	userName: "Dona",
	email: "Dona@MundoMadam.com",
	password: "senha-inicial",
};

describe("seedFirstAccount", () => {
	it("creates the store and the first user, who can sign in", async () => {
		expect(await seedFirstAccount(account)).toBe("created");

		const result = await AuthService.signIn({
			email: "dona@mundomadam.com",
			password: "senha-inicial",
		});
		expect(result.store.name).toBe("Mundo Madam");
		expect(result.user.name).toBe("Dona");
	});

	it("does nothing once any user exists (safe on every deploy)", async () => {
		await createUser();

		expect(await seedFirstAccount(account)).toBe("skipped");
		expect(await db.select().from(users)).toHaveLength(1);
		expect(await db.select().from(stores)).toHaveLength(1);
	});

	it("creates a single account when two deploys race", async () => {
		const results = await Promise.all([
			seedFirstAccount(account),
			seedFirstAccount(account),
		]);

		expect(results.sort()).toEqual(["created", "skipped"]);
		expect(await db.select().from(users)).toHaveLength(1);
	});
});

describe("seedAccountFromEnv", () => {
	const base = { DATABASE_URL: "postgres://u:p@localhost:5432/db" };

	it("is null without SEED_* variables", () => {
		expect(seedAccountFromEnv(envSchema.parse(base))).toBeNull();
	});

	it("reads the account from SEED_* variables", () => {
		const source = envSchema.parse({
			...base,
			SEED_STORE_NAME: account.storeName,
			SEED_USER_NAME: account.userName,
			SEED_USER_EMAIL: account.email,
			SEED_USER_PASSWORD: account.password,
		});
		expect(seedAccountFromEnv(source)).toEqual(account);
	});
});
