import { describe, expect, it } from "bun:test";
import { invalidField, isUniqueViolation, loggable } from "./http-error";

describe("isUniqueViolation", () => {
	const violation = Object.assign(new Error("duplicate key"), {
		errno: "23505",
	});

	it("finds the Postgres code on the error or down its causes", () => {
		expect(isUniqueViolation(violation)).toBe(true);
		expect(
			isUniqueViolation(new Error("query failed", { cause: violation })),
		).toBe(true);
		expect(
			isUniqueViolation(Object.assign(new Error("x"), { code: "23505" })),
		).toBe(true);
	});

	it("ignores any other error", () => {
		expect(isUniqueViolation(new Error("boom"))).toBe(false);
		expect(isUniqueViolation("23505")).toBe(false);
	});
});

describe("loggable", () => {
	it("keeps only the cause of a Drizzle query error (its message has the SQL params)", () => {
		const cause = new Error("connection reset");
		const query = Object.assign(
			new Error("Failed query: ... params: $argon2id$..."),
			{
				name: "DrizzleQueryError",
				cause,
			},
		);

		expect(loggable(query)).toBe(cause);
	});

	it("logs any other error as is", () => {
		const error = new Error("boom");
		expect(loggable(error)).toBe(error);
	});
});

describe("invalidField", () => {
	it("takes the top-level field of a validation path", () => {
		expect(invalidField("/email")).toBe("email");
		expect(invalidField("/items/0/quantity")).toBe("items");
		expect(invalidField("")).toBeUndefined();
		expect(invalidField(undefined)).toBeUndefined();
	});
});
