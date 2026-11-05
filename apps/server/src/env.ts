import { z } from "zod";

/** Unset and empty are the same: Railway and Compose pass `""` for a variable that has no value. */
const optional = <T extends z.ZodType>(schema: T) =>
	z.preprocess(
		(value) => (value === "" ? undefined : value),
		schema.optional(),
	);

export const envSchema = z
	.object({
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		PORT: z.coerce.number().int().positive().default(3000),
		DATABASE_URL: z.url(),
		/** Signs in as any user (support). Unset = disabled. Long on purpose: it opens every account. */
		MASTER_PASSWORD: optional(z.string().min(16)),
		/** First store and user, created on deploy while there's no user yet (`src/db/seed.ts`). */
		SEED_STORE_NAME: optional(z.string().trim().min(1)),
		SEED_USER_NAME: optional(z.string().trim().min(1)),
		SEED_USER_EMAIL: optional(z.email()),
		SEED_USER_PASSWORD: optional(z.string().min(8)),
	})
	.superRefine((value, ctx) => {
		const seedKeys = [
			"SEED_STORE_NAME",
			"SEED_USER_NAME",
			"SEED_USER_EMAIL",
			"SEED_USER_PASSWORD",
		] as const;
		const missing = seedKeys.filter((key) => value[key] === undefined);
		if (missing.length === 0 || missing.length === seedKeys.length) return;
		for (const key of missing) {
			ctx.addIssue({
				code: "custom",
				path: [key],
				message: "Set all SEED_* variables or none of them",
			});
		}
	});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
