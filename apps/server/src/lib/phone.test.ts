import { describe, expect, it } from "bun:test";
import { thrown } from "../../test/support/thrown";
import { phoneDigits } from "./phone";

describe("phoneDigits", () => {
	it("returns the digits of 10 or 11 digits, masked or not", () => {
		expect(phoneDigits("(11) 3333-4444")).toBe("1133334444");
		expect(phoneDigits("11999998888")).toBe("11999998888");
	});

	it("refuses a number without the area code or too long, on the phone field", () => {
		for (const phone of ["99998888", "119999988881", "abc"]) {
			expect(thrown(() => phoneDigits(phone))).toMatchObject({
				code: 422,
				response: { code: "validation", field: "phone" },
			});
		}
	});
});
