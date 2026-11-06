import { z } from "zod";

/** Unset and empty are the same: Railway and Compose pass `""` for a variable that has no value. */
const optional = <T extends z.ZodType>(schema: T) =>
	z.preprocess(
		(value) => (value === "" ? undefined : value),
		schema.optional(),
	);

const SEED_KEYS = [
	"SEED_STORE_NAME",
	"SEED_USER_NAME",
	"SEED_USER_EMAIL",
	"SEED_USER_PASSWORD",
] as const;

const PHOTO_KEYS = [
	"R2_ENDPOINT",
	"R2_ACCESS_KEY_ID",
	"R2_SECRET_ACCESS_KEY",
	"R2_BUCKET",
	"PHOTOS_PUBLIC_URL",
] as const;

/** Secrets travel in these URLs (signed requests, the bucket's address): never over plain http. */
const httpsUrl = z.url({ protocol: /^https$/ });

/** Every field of the group is set. */
function isComplete<T extends Record<string, unknown>>(
	group: {
		[K in keyof T]: T[K] | undefined;
	},
): group is T {
	return Object.values(group).every((value) => value !== undefined);
}

/** A group of variables that only works together: either every one is set or none is. */
function allOrNone<K extends string>(
	value: Partial<Record<K, unknown>>,
	ctx: z.RefinementCtx,
	keys: readonly K[],
	label: string,
) {
	const missing = keys.filter((key) => value[key] === undefined);
	if (missing.length === 0 || missing.length === keys.length) return;
	for (const key of missing) {
		ctx.addIssue({
			code: "custom",
			path: [key],
			message: `Set all ${label} variables or none of them`,
		});
	}
}

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
		/**
		 * Product photos (Cloudflare R2, S3 API), read as `env.photos`. Unset = photos off (tests, the CI image check):
		 * products show no photo and saving one answers 503. `R2_ENDPOINT` is
		 * `https://<account id>.r2.cloudflarestorage.com`; `PHOTOS_PUBLIC_URL` is the bucket's public address.
		 */
		R2_ENDPOINT: optional(httpsUrl),
		R2_ACCESS_KEY_ID: optional(z.string().min(1)),
		R2_SECRET_ACCESS_KEY: optional(z.string().min(1)),
		R2_BUCKET: optional(z.string().min(3)),
		PHOTOS_PUBLIC_URL: optional(httpsUrl),
	})
	.superRefine((value, ctx) => {
		allOrNone(value, ctx, SEED_KEYS, "SEED_*");
		allOrNone(value, ctx, PHOTO_KEYS, "R2_* and PHOTOS_PUBLIC_URL");
	})
	.transform(
		({
			R2_ENDPOINT,
			R2_ACCESS_KEY_ID,
			R2_SECRET_ACCESS_KEY,
			R2_BUCKET,
			PHOTOS_PUBLIC_URL,
			...rest
		}) => {
			const photos = {
				endpoint: R2_ENDPOINT,
				accessKeyId: R2_ACCESS_KEY_ID,
				secretAccessKey: R2_SECRET_ACCESS_KEY,
				bucket: R2_BUCKET,
				publicUrl: PHOTOS_PUBLIC_URL,
			};
			// The refinement above already made it all or none.
			return { ...rest, photos: isComplete(photos) ? photos : undefined };
		},
	);

export type Env = z.infer<typeof envSchema>;

export type PhotosConfig = NonNullable<Env["photos"]>;

export const env = envSchema.parse(process.env);
