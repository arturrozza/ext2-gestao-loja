/*
 * How a sale's total and costs are split among its lines, to give each product its own revenue and profit
 * (docs/product/relatorios.md, "Margem por produto"): by the value of each line, to the cent, so the lines always add
 * up to the sale.
 */

/**
 * `total` split in proportion to `weights`, in whole cents that add up to exactly `total`: each line gets its share
 * rounded down, and the cents left over go one by one to the lines with the biggest fraction lost (the heavier line
 * first on a tie, then the earlier one). Done in `BigInt`: a line's value times a total outgrows a safe integer.
 */
export function allocate(total: number, weights: number[]): number[] {
	if (total < 0 || !Number.isSafeInteger(total)) {
		throw new RangeError(`total must be a safe integer ≥ 0, got ${total}`);
	}
	const sum = weights.reduce((acc, weight) => acc + BigInt(weight), 0n);
	if (sum <= 0n) throw new RangeError("weights must add up to more than zero");
	const shares = weights.map((weight, index) => {
		const exact = BigInt(total) * BigInt(weight);
		return { index, weight, floor: Number(exact / sum), lost: exact % sum };
	});
	const leftover = total - shares.reduce((acc, share) => acc + share.floor, 0);
	const byLoss = shares.toSorted(
		(a, b) =>
			compareBig(b.lost, a.lost) || b.weight - a.weight || a.index - b.index,
	);
	const extra = new Set(byLoss.slice(0, leftover).map((share) => share.index));
	return shares.map((share) => share.floor + (extra.has(share.index) ? 1 : 0));
}

function compareBig(a: bigint, b: bigint): number {
	if (a === b) return 0;
	return a > b ? 1 : -1;
}

/** One line of a sale as the report reads it. */
export type SaleLine = {
	productId: string;
	productName: string;
	categoryId: string | null;
	categoryName: string | null;
	quantity: number;
	unitPrice: number;
	/** What left the stock with these units, in cents. */
	cost: number;
};

/** What a line brings to the report: its share of the sale's revenue, and of its profit once the costs are shared. */
export type LineResult = SaleLine & { revenue: number; profit: number };

/**
 * The lines of a sale with their revenue and profit. The weight is the line's value (quantity × price); a sale of
 * gifts only has no value to go by, so it's split by units. A gift (price zero) gets no share of the revenue or of the
 * costs, only its own product cost. The profits add up to the sale's profit.
 */
export function resultOfLines(
	sale: { revenue: number; saleCosts: number },
	lines: SaleLine[],
): LineResult[] {
	const values = lines.map((line) => line.quantity * line.unitPrice);
	const hasValue = values.some((value) => value > 0);
	const weights = hasValue ? values : lines.map((line) => line.quantity);
	const revenues = allocate(sale.revenue, weights);
	const costs = allocate(sale.saleCosts, weights);
	return lines.map((line, index) => {
		const revenue = revenues[index] ?? 0;
		return {
			...line,
			revenue,
			profit: revenue - line.cost - (costs[index] ?? 0),
		};
	});
}
