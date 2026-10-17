import { describe, expect, it } from "bun:test";
import { env } from "./env";

describe("env", () => {
	it("runs tests with NODE_ENV=test", () => {
		expect(env.NODE_ENV).toBe("test");
	});
});
