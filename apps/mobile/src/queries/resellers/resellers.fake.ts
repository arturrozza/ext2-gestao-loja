/** FAKE BACKEND (MUN-21): resellers (docs/product/revendedoras.md). */
import { ApiError } from "@/lib/api-error";
import { fromCents } from "@/lib/money";
import { matchesSearch } from "@/lib/search";
import {
	db,
	findOrThrow,
	nextId,
	nowISO,
	type ResellerRow,
} from "@/queries/fake/fake-db";
import { fakeRequest, notFound } from "@/queries/fake/fake-server";
import type {
	Reseller,
	ResellerInput,
	ResellerListFilters,
} from "./resellers.types";

const resellerNotFound = () => notFound("Revendedora");

export function findReseller(id: string): ResellerRow {
	return findOrThrow(db.current.resellers, id, resellerNotFound);
}

/** Totals over active sales; canceled ones don't count for commissions (revendedoras.md). */
function toReseller(row: ResellerRow): Reseller {
	const sales = db.current.sales.filter(
		(sale) => sale.resellerId === row.id && !sale.canceledAt,
	);
	const commission = sales.reduce(
		(sum, sale) =>
			sum +
			sale.costs
				.filter((cost) => cost.kind === "commission")
				.reduce((total, cost) => total + cost.amountCents, 0),
		0,
	);
	return {
		id: row.id,
		name: row.name,
		phone: row.phone,
		defaultCommission: String(row.defaultCommission),
		note: row.note,
		archived: row.archived,
		salesCount: sales.length,
		salesTotal: fromCents(
			sales.reduce((sum, sale) => sum + sale.revenueCents, 0),
		),
		commissionTotal: fromCents(commission),
	};
}

function assertCommission(input: ResellerInput) {
	const value = Number(input.defaultCommission);
	if (!(value >= 0 && value <= 100)) {
		throw new ApiError("invalid_commission", "Comissão entre 0 e 100%.", {
			field: "defaultCommission",
		});
	}
}

export function insertReseller(input: ResellerInput): ResellerRow {
	assertCommission(input);
	const row: ResellerRow = {
		id: nextId("reseller"),
		name: input.name,
		phone: input.phone,
		defaultCommission: Number(input.defaultCommission),
		note: input.note,
		archived: false,
		createdAt: nowISO(),
	};
	db.current.resellers.push(row);
	return row;
}

export const resellersFake = {
	list: (filters: ResellerListFilters) =>
		fakeRequest(() =>
			db.current.resellers
				.filter(
					(row) =>
						row.archived === filters.archived &&
						matchesSearch(filters.search, row.name, row.phone),
				)
				.map(toReseller)
				.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
		),

	detail: (id: string) => fakeRequest(() => toReseller(findReseller(id))),

	create: (input: ResellerInput) =>
		fakeRequest(() => toReseller(insertReseller(input))),

	/** Changing the default commission doesn't touch past sales (revendedoras.md). */
	update: (id: string, input: ResellerInput) =>
		fakeRequest(() => {
			assertCommission(input);
			const row = findReseller(id);
			row.name = input.name;
			row.phone = input.phone;
			row.defaultCommission = Number(input.defaultCommission);
			row.note = input.note;
			return toReseller(row);
		}),

	setArchived: (id: string, archived: boolean) =>
		fakeRequest(() => {
			const row = findReseller(id);
			row.archived = archived;
			return toReseller(row);
		}),
};
