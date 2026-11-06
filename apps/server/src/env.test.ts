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

	it("takes all photo variables or none", () => {
		const photos = {
			R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
			R2_ACCESS_KEY_ID: "key-id",
			R2_SECRET_ACCESS_KEY: "secret",
			R2_BUCKET: "mundomadam-photos-dev",
			PHOTOS_PUBLIC_URL: "https://pub-abc.r2.dev",
		};
		expect(envSchema.safeParse({ ...base, ...photos }).success).toBe(true);
		expect(envSchema.safeParse(base).success).toBe(true);
		const partial = envSchema.safeParse({
			...base,
			R2_BUCKET: photos.R2_BUCKET,
		});
		expect(partial.error?.issues.map((issue) => issue.path[0])).toEqual([
			"R2_ENDPOINT",
			"R2_ACCESS_KEY_ID",
			"R2_SECRET_ACCESS_KEY",
			"PHOTOS_PUBLIC_URL",
		]);
	});

	it("groups the photo variables as env.photos, https only", () => {
		const photos = {
			R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
			R2_ACCESS_KEY_ID: "key-id",
			R2_SECRET_ACCESS_KEY: "secret",
			R2_BUCKET: "mundomadam-photos-dev",
			PHOTOS_PUBLIC_URL: "https://pub-abc.r2.dev",
		};

		expect(envSchema.parse({ ...base, ...photos }).photos).toEqual({
			endpoint: photos.R2_ENDPOINT,
			accessKeyId: photos.R2_ACCESS_KEY_ID,
			secretAccessKey: photos.R2_SECRET_ACCESS_KEY,
			bucket: photos.R2_BUCKET,
			publicUrl: photos.PHOTOS_PUBLIC_URL,
		});
		expect(envSchema.parse({ ...base, R2_BUCKET: "" }).photos).toBeUndefined();
		expect(
			envSchema.safeParse({
				...base,
				...photos,
				R2_ENDPOINT: "http://account.r2.cloudflarestorage.com",
			}).success,
		).toBe(false);
	});
});
