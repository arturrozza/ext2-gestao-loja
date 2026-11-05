import { describe, expect, it } from "bun:test";
import { thrown } from "../../../test/support/thrown";
import { createAttemptLimiter, createHashGate } from "./auth.rate-limit";

const MINUTE = 60 * 1000;

const tooMany = { code: 429, response: { code: "too_many_attempts" } };

describe("createAttemptLimiter", () => {
	const limiter = () =>
		createAttemptLimiter({ maxAttempts: 2, windowMs: 10 * MINUTE });

	it("refuses a key with 429 once it used up its attempts, other keys still pass", () => {
		const attempts = limiter();
		attempts.reserve("a", 0);
		attempts.reserve("a", 0);

		expect(thrown(() => attempts.reserve("a", MINUTE))).toMatchObject(tooMany);
		attempts.reserve("b", MINUTE);
	});

	it("allows the key again when the window ends", () => {
		const attempts = limiter();
		attempts.reserve("a", 0);
		attempts.reserve("a", 0);

		attempts.reserve("a", 10 * MINUTE);
	});

	it("starts over after a success", () => {
		const attempts = limiter();
		attempts.reserve("a", 0);
		attempts.reserve("a", 0);
		attempts.clear("a");

		attempts.reserve("a", 0);
	});

	it("sweeps expired keys once there are many", () => {
		const attempts = createAttemptLimiter({ maxAttempts: 1, windowMs: MINUTE });
		for (let i = 0; i < 1000; i++) attempts.reserve(`k${i}`, 0);

		// k0 expired and was swept, so it's a fresh key again.
		attempts.reserve("new", 2 * MINUTE);
		attempts.reserve("k0", 2 * MINUTE);
	});
});

describe("createHashGate", () => {
	it("refuses work beyond the cap while the others run, then frees the slot", async () => {
		const gate = createHashGate(1);
		let release = () => {};
		const running = gate(
			() =>
				new Promise<void>((resolve) => {
					release = resolve;
				}),
		);

		await expect(gate(async () => "x")).rejects.toMatchObject(tooMany);
		release();
		await running;
		expect(await gate(async () => "ok")).toBe("ok");
	});
});
