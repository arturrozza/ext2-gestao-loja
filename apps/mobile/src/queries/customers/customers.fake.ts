/** FAKE BACKEND (MUN-21): customers (docs/product/clientes.md). */
import { fromCents } from "@/lib/money";
import { matchesSearch } from "@/lib/search";
import {
	type CustomerRow,
	db,
	findOrThrow,
	nextId,
	nowISO,
} from "@/queries/fake/fake-db";
import { fakeRequest, notFound } from "@/queries/fake/fake-server";
import { paginate } from "@/queries/pagination";
import type {
	Customer,
	CustomerInput,
	CustomerListFilters,
	CustomerPage,
} from "./customers.types";

const customerNotFound = () => notFound("Cliente");

export function findCustomer(id: string): CustomerRow {
	return findOrThrow(db.current.customers, id, customerNotFound);
}

/** History numbers over active sales only. */
function toCustomer(row: CustomerRow): Customer {
	const sales = db.current.sales.filter(
		(sale) => sale.customerId === row.id && !sale.canceledAt,
	);
	const last =
		sales
			.map((sale) => sale.date)
			.sort()
			.at(-1) ?? null;
	return {
		id: row.id,
		name: row.name,
		phone: row.phone,
		note: row.note,
		archived: row.archived,
		purchasesCount: sales.length,
		totalSpent: fromCents(
			sales.reduce((sum, sale) => sum + sale.revenueCents, 0),
		),
		lastPurchaseAt: last,
	};
}

export function insertCustomer(input: CustomerInput): CustomerRow {
	const row: CustomerRow = {
		id: nextId("customer"),
		name: input.name,
		phone: input.phone,
		note: input.note,
		archived: false,
		createdAt: nowISO(),
	};
	db.current.customers.push(row);
	return row;
}

function list(filters: CustomerListFilters, cursor: number): CustomerPage {
	const rows = db.current.customers
		.filter(
			(row) =>
				row.archived === filters.archived &&
				matchesSearch(filters.search, row.name, row.phone),
		)
		.map(toCustomer)
		.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
	return paginate(rows, cursor);
}

export const customersFake = {
	list: (filters: CustomerListFilters, cursor: number) =>
		fakeRequest(() => list(filters, cursor)),

	detail: (id: string) => fakeRequest(() => toCustomer(findCustomer(id))),

	create: (input: CustomerInput) =>
		fakeRequest(() => toCustomer(insertCustomer(input))),

	update: (id: string, input: CustomerInput) =>
		fakeRequest(() => {
			const row = findCustomer(id);
			row.name = input.name;
			row.phone = input.phone;
			row.note = input.note;
			return toCustomer(row);
		}),

	setArchived: (id: string, archived: boolean) =>
		fakeRequest(() => {
			const row = findCustomer(id);
			row.archived = archived;
			return toCustomer(row);
		}),
};
