import { describe, expect, it } from "bun:test";
import { nextCursor, PAGE_SIZE } from "./pagination";

describe("nextCursor", () => {
	it("points to the next page while there are rows left", () => {
		expect(nextCursor(0, PAGE_SIZE + 1)).toBe(PAGE_SIZE);
	});

	it("is null on the last page", () => {
		expect(nextCursor(0, PAGE_SIZE)).toBeNull();
		expect(nextCursor(PAGE_SIZE, PAGE_SIZE + 1)).toBeNull();
		expect(nextCursor(0, 0)).toBeNull();
	});
});
