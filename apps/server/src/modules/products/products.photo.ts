import { httpError } from "../../lib/http-error";

/** The only format stored: the app shrinks every photo to a JPEG before sending it (docs/decisions.md). */
export const PHOTO_CONTENT_TYPE = "image/jpeg";

/** Way above the ~150 KB the app sends; anything bigger didn't come from the app. */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/** The biggest request body the API takes: one photo plus the multipart framing (`src/index.ts`). */
export const MAX_REQUEST_BODY_BYTES = MAX_PHOTO_BYTES + 64 * 1024;

/** Every JPEG starts with these bytes (SOI marker + the first marker's prefix)... */
const JPEG_START = [0xff, 0xd8, 0xff];
/** ...and the ones the app writes end with the EOI marker. */
const JPEG_END = [0xff, 0xd9];

const startsWith = (bytes: Uint8Array, prefix: number[]) =>
	prefix.every((byte, index) => bytes[index] === byte);

const endsWith = (bytes: Uint8Array, suffix: number[]) =>
	bytes.length >= suffix.length &&
	suffix.every(
		(byte, index) => bytes[bytes.length - suffix.length + index] === byte,
	);

/** What follows the store folder: the UUID the API picked, and the extension. */
const PHOTO_FILE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/;

/** Where a store's product photos go. A new key per photo, so a saved one is never overwritten. */
const storeFolder = (storeId: string) => `stores/${storeId}/products/`;

export function newPhotoKey(storeId: string): string {
	return `${storeFolder(storeId)}${crypto.randomUUID()}.jpg`;
}

/** A key the API could have handed to this store (and not another store's). */
export function isStorePhotoKey(storeId: string, key: string): boolean {
	const folder = storeFolder(storeId);
	return key.startsWith(folder) && PHOTO_FILE.test(key.slice(folder.length));
}

const invalid = (code: string, message: string, field: string) =>
	httpError(422, { code, message, field });

/**
 * The photo the app sent must be a JPEG (by its first and last bytes, not its name or header) of up to
 * `MAX_PHOTO_BYTES`. Stored as `image/jpeg`, so whatever else it holds is never served as a page.
 */
export function assertJpeg(bytes: Uint8Array): void {
	if (bytes.length > MAX_PHOTO_BYTES) {
		throw invalid("photo_too_large", "A foto é grande demais.", "photo");
	}
	if (!startsWith(bytes, JPEG_START) || !endsWith(bytes, JPEG_END)) {
		throw invalid(
			"photo_invalid",
			"Esse arquivo não é uma foto válida.",
			"photo",
		);
	}
}

/** A product can only point at a photo this store sent and the bucket has. */
export function assertStorePhotoKey(storeId: string, key: string): void {
	if (!isStorePhotoKey(storeId, key)) {
		throw invalid("photo_key_invalid", "Essa foto não é válida.", "photoKey");
	}
}

export const photoNotFound = () =>
	invalid(
		"photo_not_found",
		"A foto não foi encontrada. Escolha a foto de novo.",
		"photoKey",
	);
