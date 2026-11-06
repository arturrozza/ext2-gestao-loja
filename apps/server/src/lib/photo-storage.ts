import { S3Client } from "bun";
import { env, type PhotosConfig } from "../env";
import { httpError, loggable } from "./http-error";

/**
 * Where product photos live (Cloudflare R2 in production). Only the API writes to the bucket: the app sends the photo
 * to the API, never straight to the bucket, so what is stored is always a checked JPEG (docs/decisions.md).
 */
export type PhotoStorage = {
	/** Stores `bytes` under `key`, served with `contentType`. */
	write(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
	/** Whether something is stored under `key`. */
	exists(key: string): Promise<boolean>;
	/** The address the app loads the photo from; null while photos are off. */
	publicUrl(key: string): string | null;
};

/** The 503 the photo feature answers while the bucket is off or out of reach. */
export const photosUnavailable = () =>
	httpError(503, {
		code: "photos_unavailable",
		message:
			"As fotos estão indisponíveis no momento. Tente de novo mais tarde.",
	});

/** A bucket that can't be reached is the server's problem, not the photo's: 503, and the S3 error stays in the log. */
async function orUnavailable<T>(call: () => Promise<T>): Promise<T> {
	try {
		return await call();
	} catch (error) {
		console.error("[photos] storage error", loggable(error));
		throw photosUnavailable();
	}
}

export function r2Storage(config: PhotosConfig): PhotoStorage {
	const client = new S3Client({
		endpoint: config.endpoint,
		accessKeyId: config.accessKeyId,
		secretAccessKey: config.secretAccessKey,
		bucket: config.bucket,
	});
	const base = config.publicUrl.replace(/\/+$/, "");
	return {
		write: (key, bytes, contentType) =>
			orUnavailable(async () => {
				await client.write(key, bytes, { type: contentType });
			}),
		exists: (key) => orUnavailable(() => client.exists(key)),
		publicUrl: (key) => `${base}/${key}`,
	};
}

/** Photos off (no R2 variables): products show no photo, and saving one answers 503. */
export const disabledPhotoStorage: PhotoStorage = {
	write: () => Promise.reject(photosUnavailable()),
	exists: () => Promise.reject(photosUnavailable()),
	publicUrl: () => null,
};

const fromEnv = (): PhotoStorage =>
	env.photos ? r2Storage(env.photos) : disabledPhotoStorage;

let current = fromEnv();

/** The configured storage (`disabledPhotoStorage` while photos are off). */
export function photoStorage(): PhotoStorage {
	return current;
}

/** Swaps the storage; tests use an in-memory one. */
export function setPhotoStorage(storage: PhotoStorage): void {
	current = storage;
}
