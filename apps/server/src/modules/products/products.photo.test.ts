import { describe, expect, it } from "bun:test";
import { thrown } from "../../../test/support/thrown";
import {
	assertJpeg,
	assertStorePhotoKey,
	isStorePhotoKey,
	MAX_PHOTO_BYTES,
	newPhotoKey,
} from "./products.photo";

const storeId = "0b4a6c1e-8f3d-4a2b-9c7e-1d2f3a4b5c6d";

const jpeg = (size: number) => {
	const bytes = new Uint8Array(size);
	bytes.set([0xff, 0xd8, 0xff]);
	bytes.set([0xff, 0xd9], size - 2);
	return bytes;
};

describe("photo keys", () => {
	it("hands out a new key in the store's folder every time", () => {
		const a = newPhotoKey(storeId);

		expect(a).toStartWith(`stores/${storeId}/products/`);
		expect(a).toEndWith(".jpg");
		expect(a).not.toBe(newPhotoKey(storeId));
		expect(isStorePhotoKey(storeId, a)).toBe(true);
	});

	it("refuses another store's key, a made-up name and a path that climbs out", () => {
		const folder = `stores/${storeId}/products/`;
		const keys = [
			newPhotoKey("9f8e7d6c-5b4a-4321-8fed-cba987654321"),
			`${folder}foto.jpg`,
			`${folder}../other/${crypto.randomUUID()}.jpg`,
			`${folder}${crypto.randomUUID()}.png`,
			`${folder}${crypto.randomUUID()}.jpg\n`,
		];

		for (const key of keys) {
			expect(isStorePhotoKey(storeId, key)).toBe(false);
		}
		expect(
			thrown(() => assertStorePhotoKey(storeId, keys[0] ?? "")),
		).toMatchObject({
			code: 422,
			response: { code: "photo_key_invalid", field: "photoKey" },
		});
	});
});

describe("assertJpeg", () => {
	it("takes a JPEG up to the limit", () => {
		expect(thrown(() => assertJpeg(jpeg(150_000)))).toBeUndefined();
		expect(thrown(() => assertJpeg(jpeg(MAX_PHOTO_BYTES)))).toBeUndefined();
	});

	it("refuses a bigger one, and anything that isn't a JPEG by its bytes", () => {
		expect(thrown(() => assertJpeg(jpeg(MAX_PHOTO_BYTES + 1)))).toMatchObject({
			code: 422,
			response: { code: "photo_too_large", field: "photo" },
		});
		for (const bytes of [
			new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
			new Uint8Array([0xff, 0xd8]),
			// Starts like a JPEG but doesn't end like one (cut short, or something appended).
			jpeg(100).slice(0, 99),
			new Uint8Array(),
		]) {
			expect(thrown(() => assertJpeg(bytes))).toMatchObject({
				response: { code: "photo_invalid", field: "photo" },
			});
		}
	});
});
