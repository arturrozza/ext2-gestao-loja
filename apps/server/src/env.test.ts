import { describe, expect, it } from "bun:test";
import { env, envSchema } from "./env";

const base = { DATABASE_URL: "postgres://u:p@localhost:5432/db" };
const seed = {
	SEED_STORE_NAME: "Loja",
	SEED_USER_NAME: "Dona",
	SEED_USER_EMAIL: "dona@loja.com",
	SEED_USER_PASSWORD: "senha-forte",
};

describe("env", () => {
	it("runs tests with NODE_ENV=test", () => {
		expect(env.NODE_ENV).toBe("test");
	});

	it("treats empty variables as unset", () => {
		const parsed = envSchema.parse({
			...base,
			MASTER_PASSWORD: "",
			SEED_USER_EMAIL: "",
		});
		expect(parsed.MASTER_PASSWORD).toBeUndefined();
		expect(parsed.SEED_USER_EMAIL).toBeUndefined();
	});

	it("requires a master password of at least 16 characters", () => {
		expect(
			envSchema.safeParse({ ...base, MASTER_PASSWORD: "curta" }).success,
		).toBe(false);
		expect(
			envSchema.safeParse({ ...base, MASTER_PASSWORD: "x".repeat(16) }).success,
		).toBe(true);
	});

	it("takes all SEED_* variables or none", () => {
		expect(envSchema.safeParse({ ...base, ...seed }).success).toBe(true);
		const partial = envSchema.safeParse({
			...base,
			SEED_USER_EMAIL: seed.SEED_USER_EMAIL,
		});
		expect(partial.success).toBe(false);
		expect(partial.error?.issues.map((issue) => issue.path[0])).toEqual([
			"SEED_STORE_NAME",
			"SEED_USER_NAME",
			"SEED_USER_PASSWORD",
		]);
	});
});
