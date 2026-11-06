import { afterEach, beforeEach } from "bun:test";
import {
	disabledPhotoStorage,
	type PhotoStorage,
	photosUnavailable,
	setPhotoStorage,
} from "../../src/lib/photo-storage";

/** Bytes that start and end like a JPEG, `size` long. */
export function jpegBytes(size = 128): Uint8Array {
	const bytes = new Uint8Array(size);
	bytes.set([0xff, 0xd8, 0xff, 0xe0]);
	bytes.set([0xff, 0xd9], size - 2);
	return bytes;
}

/** The photo the app sends: a JPEG file, as multipart. */
export function jpegFile(bytes: Uint8Array = jpegBytes()): File {
	return new File([bytes], "foto.jpg", { type: "image/jpeg" });
}

/**
 * Call at the top of a test file: every test gets an empty in-memory bucket, and photos are off again after it (tests
 * run without R2 variables, see .env.test). `objects` is what the API stored; `put` stands in for an earlier upload.
 */
export function useFakePhotoStorage() {
	const objects = new Map<string, { bytes: Uint8Array; type: string }>();
	let down = false;
	const reachable = () => {
		if (down) throw photosUnavailable();
	};
	const storage: PhotoStorage = {
		write: async (key, bytes, type) => {
			reachable();
			objects.set(key, { bytes, type });
		},
		exists: async (key) => {
			reachable();
			return objects.has(key);
		},
		publicUrl: (key) => `https://photos.test/${key}`,
	};
	beforeEach(() => {
		objects.clear();
		down = false;
		setPhotoStorage(storage);
	});
	afterEach(() => {
		setPhotoStorage(disabledPhotoStorage);
	});
	return {
		objects,
		put: (key: string) => {
			objects.set(key, { bytes: jpegBytes(), type: "image/jpeg" });
		},
		/** The bucket can't be reached: what `r2Storage` answers then (503). */
		failing: (value: boolean) => {
			down = value;
		},
		/** Photos off, as without R2 variables. */
		off: () => {
			setPhotoStorage(disabledPhotoStorage);
		},
	};
}
