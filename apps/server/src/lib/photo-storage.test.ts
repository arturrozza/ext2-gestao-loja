import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import {
	disabledPhotoStorage,
	photoStorage,
	photoUrlOf,
	r2Storage,
	setPhotoStorage,
} from "./photo-storage";

/** A stand-in for the R2 S3 API on localhost: stores PUTs, answers HEADs, fails on demand. */
const stored = new Map<string, { body: Uint8Array; type: string | null }>();
let failing = false;
const s3 = Bun.serve({
	port: 0,
	async fetch(request) {
		if (failing) return new Response("boom", { status: 500 });
		const path = new URL(request.url).pathname;
		if (request.method === "PUT") {
			stored.set(path, {
				body: new Uint8Array(await request.arrayBuffer()),
				type: request.headers.get("content-type"),
			});
			return new Response(null, { status: 200 });
		}
		const object = stored.get(path);
		return object
			? new Response(null, {
					status: 200,
					headers: { "content-length": String(object.body.length) },
				})
			: new Response(null, { status: 404 });
	},
});

const storage = r2Storage({
	endpoint: s3.url.origin,
	accessKeyId: "key-id",
	secretAccessKey: "secret",
	bucket: "photos-test",
	publicUrl: "https://pub-abc.r2.dev/",
});

beforeEach(() => {
	stored.clear();
	failing = false;
});

afterAll(() => {
	s3.stop(true);
});

describe("r2Storage", () => {
	it("writes the bytes with the content type, and finds them after", async () => {
		const key = "stores/s/products/p.jpg";

		expect(await storage.exists(key)).toBe(false);
		await storage.write(key, new Uint8Array([1, 2, 3]), "image/jpeg");

		expect(stored.get(`/photos-test/${key}`)).toEqual({
			body: new Uint8Array([1, 2, 3]),
			type: "image/jpeg",
		});
		expect(await storage.exists(key)).toBe(true);
	});

	it("answers 503 when the bucket fails, without the S3 error", async () => {
		failing = true;

		await expect(
			storage.write(
				"stores/s/products/p.jpg",
				new Uint8Array([1]),
				"image/jpeg",
			),
		).rejects.toMatchObject({
			code: 503,
			response: { code: "photos_unavailable" },
		});
		await expect(
			storage.exists("stores/s/products/p.jpg"),
		).rejects.toMatchObject({
			code: 503,
		});
	});

	it("builds the public URL without a double slash", () => {
		expect(storage.publicUrl("stores/s/products/p.jpg")).toBe(
			"https://pub-abc.r2.dev/stores/s/products/p.jpg",
		);
	});
});

describe("photoStorage", () => {
	it("is off in tests (no R2 variables): no address, and storing answers 503", async () => {
		expect(photoStorage()).toBe(disabledPhotoStorage);
		expect(disabledPhotoStorage.publicUrl("x")).toBeNull();
		await expect(disabledPhotoStorage.exists("x")).rejects.toMatchObject({
			code: 503,
		});
		await expect(
			disabledPhotoStorage.write("x", new Uint8Array(), "image/jpeg"),
		).rejects.toMatchObject({ code: 503 });
	});

	it("uses the storage that was set", () => {
		setPhotoStorage(storage);
		expect(photoStorage()).toBe(storage);
		setPhotoStorage(disabledPhotoStorage);
		expect(photoStorage()).toBe(disabledPhotoStorage);
	});

	it("gives a photo's address through the current storage, and none without a photo", () => {
		setPhotoStorage(storage);
		expect(photoUrlOf("stores/s/products/p.jpg")).toBe(
			"https://pub-abc.r2.dev/stores/s/products/p.jpg",
		);
		expect(photoUrlOf(null)).toBeNull();
		setPhotoStorage(disabledPhotoStorage);
		expect(photoUrlOf("stores/s/products/p.jpg")).toBeNull();
	});
});
