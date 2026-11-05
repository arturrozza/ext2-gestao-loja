import { describe, expect, it } from "bun:test";
// The app has no test runner yet (docs/testing.md); its money module is plain TypeScript with no React Native import,
// so it's tested here, next to the server's, to keep both on the same numbers.
import * as app from "../../../mobile/src/lib/money";
import * as server from "./money";

describe("app and server money modules", () => {
	it("share the limits", () => {
		expect(app.MAX_CENTS).toBe(server.MAX_CENTS);
		expect(app.FULL_PERCENT).toBe(server.FULL_PERCENT);
	});

	it("round every division the same way", () => {
		const numerators = [
			0, 1, 2, 4, 5, 6, 9, 10, 15, 25, 333, 1000, 2000, 4999, 5000, 5001, 9250,
			99_995, 2_147_483_647,
		];
		for (const magnitude of numerators) {
			for (const numerator of [magnitude, -magnitude]) {
				for (const denominator of [1, 2, 3, 7, 10, 100, 10_000]) {
					expect(app.divideRounded(numerator, denominator)).toBe(
						server.divideRounded(numerator, denominator),
					);
				}
			}
		}
	});

	it("refuse the same inputs", () => {
		for (const [numerator, denominator] of [
			[1.5, 2],
			[1, 2.5],
			[Number.NaN, 2],
			[Number.MAX_SAFE_INTEGER + 1, 2],
			[1, 0],
			[1, -2],
		] as const) {
			expect(() => app.divideRounded(numerator, denominator)).toThrow(
				RangeError,
			);
			expect(() => server.divideRounded(numerator, denominator)).toThrow(
				RangeError,
			);
		}
		for (const [cents, basisPoints] of [
			[92.5, 1000],
			[9250, 12.5],
		] as const) {
			expect(() => app.percentOf(cents, basisPoints)).toThrow(RangeError);
			expect(() => server.percentOf(cents, basisPoints)).toThrow(RangeError);
		}
	});

	it("take the same percentage of an amount", () => {
		const amounts = [0, 1, 4, 5, 15, 3333, 9250, 99_999, server.MAX_CENTS];
		const rates = [0, 1, 50, 999, 1000, 1225, 1650, 5000, 9999, 10_000];
		for (const cents of amounts) {
			for (const basisPoints of rates) {
				expect(app.percentOf(cents, basisPoints)).toBe(
					server.percentOf(cents, basisPoints),
				);
				expect(app.percentOf(-cents, basisPoints)).toBe(
					server.percentOf(-cents, basisPoints),
				);
			}
		}
	});
});

describe("app parseMoneyInput", () => {
	it("reads pt-BR money into exact cents, with no float on the way", () => {
		const cases: [string, number][] = [
			["92,50", 9250],
			["92,5", 9250],
			["92", 9200],
			["92.50", 9250],
			["92.5", 9250],
			["1.234,56", 123_456],
			["1.234", 123_400],
			["1234,56", 123_456],
			["R$ 10,00", 1000],
			[" 7,9 ", 790],
			["0,01", 1],
			["0", 0],
			// Values a float multiplication gets wrong (1.15 × 100 = 114.999…).
			["1,15", 115],
			["4,35", 435],
			["0,07", 7],
			["000000001,00", 100],
			["21.474.836,47", app.MAX_CENTS],
		];
		for (const [text, cents] of cases) {
			expect(app.parseMoneyInput(text)).toBe(cents);
		}
	});

	it("refuses invalid text, negatives and amounts over the limit", () => {
		for (const text of [
			"",
			"-1",
			"1,234",
			"92,",
			",5",
			"abc",
			"1.2.3",
			"21.474.836,48",
			"99999999",
		]) {
			expect(app.parseMoneyInput(text)).toBeNull();
		}
	});

	it("reads back exactly what moneyToInput prefills", () => {
		for (let cents = 0; cents < 100_000; cents += 7) {
			expect(app.parseMoneyInput(app.moneyToInput(cents))).toBe(cents);
		}
		expect(app.parseMoneyInput(app.moneyToInput(app.MAX_CENTS))).toBe(
			app.MAX_CENTS,
		);
	});
});

describe("app parsePercentInput", () => {
	it("reads pt-BR percentages into basis points", () => {
		const cases: [string, number][] = [
			["10", 1000],
			["12,5", 1250],
			["12.5", 1250],
			["12,25", 1225],
			["0,01", 1],
			["7%", 700],
			["0", 0],
			["100", 10_000],
			["100,00", 10_000],
		];
		for (const [text, basisPoints] of cases) {
			expect(app.parsePercentInput(text)).toBe(basisPoints);
		}
	});

	it("refuses invalid text, negatives and more than 100%", () => {
		for (const text of ["", "-1", "1,234", "100,01", "101", "abc"]) {
			expect(app.parsePercentInput(text)).toBeNull();
		}
	});

	it("reads back exactly what percentToInput prefills, for every basis point", () => {
		for (let basisPoints = 0; basisPoints <= app.FULL_PERCENT; basisPoints++) {
			expect(app.parsePercentInput(app.percentToInput(basisPoints))).toBe(
				basisPoints,
			);
		}
	});
});

describe("app formatting", () => {
	// Intl separates "R$" from the number with a no-break space.
	const plain = (text: string) => text.replace(/\s/g, " ");

	it("formats cents as reais, with a real minus sign", () => {
		expect(plain(app.formatMoney(9250))).toBe("R$ 92,50");
		expect(plain(app.formatMoney(123_456))).toBe("R$ 1.234,56");
		expect(plain(app.formatMoney(-100))).toBe("−R$ 1,00");
		expect(plain(app.formatSignedMoney(4000))).toBe("+R$ 40,00");
		expect(plain(app.formatSignedMoney(-18_400))).toBe("−R$ 184,00");
		expect(plain(app.formatSignedMoney(0))).toBe("R$ 0,00");
		expect(app.moneyToInput(123_450)).toBe("1.234,50");
	});

	it("formats basis points and ratios as percentages", () => {
		expect(app.formatPercent(1250)).toBe("12,5%");
		expect(app.formatPercent(10_000)).toBe("100%");
		expect(app.formatPercent(1)).toBe("0,01%");
		expect(app.percentToInput(750)).toBe("7,5");
		expect(app.formatRatio(0.125)).toBe("12,5%");
	});
});
