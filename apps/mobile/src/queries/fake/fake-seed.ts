/**
 * FAKE BACKEND (MUN-21): demo data for a store already in use. Built through the same fake operations the screens
 * use (purchases, sales...), so stock, average cost and the ledger add up. Deterministic: the same data every time.
 */
import { addDays, type ExpiryMonth, todayISODate } from "@/lib/dates";
import { fromCents } from "@/lib/money";
import { insertCustomer } from "@/queries/customers/customers.fake";
import {
	insertCategory,
	insertProduct,
} from "@/queries/products/products.fake";
import type { ProductInput } from "@/queries/products/products.types";
import { insertPurchase } from "@/queries/purchases/purchases.fake";
import { insertReseller } from "@/queries/resellers/resellers.fake";
import { cancelSaleRow, insertSale } from "@/queries/sales/sales.fake";
import type {
	SaleChannel,
	SaleCostInput,
	SaleInput,
} from "@/queries/sales/sales.types";
import { db, emptyDb, type FakeDb } from "./fake-db";
import { sellableStock } from "./stock-ledger";

type SeedProduct = {
	name: string;
	category: string | null;
	price: number;
	cost: number;
	hasExpiry: boolean;
	minStock: number | null;
	location: string | null;
};

const LINES: {
	category: string;
	names: string[];
	sizes: string[];
	price: number;
	cost: number;
	hasExpiry: boolean;
}[] = [
	{
		category: "Perfumes",
		names: [
			"Floral",
			"Amadeirado",
			"Cítrico",
			"Oriental",
			"Frutal",
			"Baunilha",
		],
		sizes: ["50ml", "100ml"],
		price: 159.9,
		cost: 82,
		hasExpiry: false,
	},
	{
		category: "Corpo e banho",
		names: [
			"Hidratante corporal",
			"Creme para mãos",
			"Óleo corporal",
			"Esfoliante",
			"Sabonete líquido",
		],
		sizes: ["200ml", "400ml"],
		price: 49.9,
		cost: 21.5,
		hasExpiry: true,
	},
	{
		category: "Maquiagem",
		names: [
			"Batom matte",
			"Base líquida",
			"Máscara de cílios",
			"Pó compacto",
			"Delineador",
			"Blush",
			"Gloss labial",
			"Corretivo",
		],
		sizes: ["Nude", "Rosa", "Vermelho", "Coral", "Vinho", "Marrom"],
		price: 39.9,
		cost: 16,
		hasExpiry: true,
	},
	{
		category: "Cabelos",
		names: [
			"Shampoo",
			"Condicionador",
			"Máscara capilar",
			"Leave-in",
			"Óleo capilar",
		],
		sizes: ["300ml"],
		price: 44.9,
		cost: 19,
		hasExpiry: true,
	},
	{
		category: "Kits",
		names: ["Kit presente Floral", "Kit cuidados diários", "Kit viagem"],
		sizes: [""],
		price: 219.9,
		cost: 118,
		hasExpiry: false,
	},
];

/** Small deterministic pseudo-random sequence, so the demo is the same on every launch. */
function sequence(seed: number) {
	let state = seed;
	return () => {
		state = (state * 1103515245 + 12345) % 2147483648;
		return state / 2147483648;
	};
}

function seedLine(line: (typeof LINES)[number], random: () => number) {
	return line.names.flatMap((name) =>
		line.sizes.map((size): SeedProduct => {
			const bump = size === "100ml" || size === "400ml" ? 1.6 : 1;
			return {
				name: [name, size].filter(Boolean).join(" "),
				category: line.category,
				price:
					Math.round(line.price * bump * (0.85 + random() * 0.3) * 10) / 10,
				cost:
					Math.round(line.cost * bump * (0.85 + random() * 0.3) * 100) / 100,
				hasExpiry: line.hasExpiry,
				minStock: random() > 0.3 ? 3 : null,
				location: `Prateleira ${"ABCD"[Math.floor(random() * 4)]}${1 + Math.floor(random() * 5)}`,
			};
		}),
	);
}

function seedProducts(): SeedProduct[] {
	const random = sequence(7);
	return [
		...LINES.flatMap((line) => seedLine(line, random)),
		{
			name: "Sacola de presente",
			category: null,
			price: 5,
			cost: 1.2,
			hasExpiry: false,
			minStock: 10,
			location: "Caixa",
		},
	];
}

/** "YYYY-MM" this many months from today (negative: past). */
function monthFromNow(months: number): ExpiryMonth {
	const date = new Date();
	date.setDate(1);
	date.setMonth(date.getMonth() + months);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toInput(
	product: SeedProduct,
	categoryIds: Map<string, string>,
	index: number,
): ProductInput {
	const code = String(index + 1).padStart(4, "0");
	return {
		name: product.name,
		basePrice: fromCents(Math.round(product.price * 100)),
		categoryId: product.category
			? (categoryIds.get(product.category) ?? null)
			: null,
		barcode: `789100000${code}`,
		internalCode: `MM-${code}`,
		minStock: product.minStock,
		location: product.location,
		hasExpiry: product.hasExpiry,
		photoUri: null,
	};
}

/** A few expired, a few about to expire, the rest months away. */
function seedExpiry(index: number): ExpiryMonth {
	if (index % 19 === 0) return monthFromNow(-1);
	if (index % 11 === 0) return monthFromNow(0);
	return monthFromNow(6 + (index % 12));
}

/**
 * A replenishment every two weeks over the last ~3 months, a third of the products each. Some products are left without
 * stock on purpose. Sized to the sales below, so the demo numbers look like a real store.
 */
function seedPurchases(products: { id: string; seed: SeedProduct }[]) {
	const random = sequence(11);
	const today = todayISODate();
	const stocked = products.filter((_, index) => index % 9 !== 4);
	for (let round = 0; round < 6; round += 1) {
		const date = addDays(today, -88 + round * 15);
		const items = stocked
			.filter((_, index) => (index + round) % 3 === 0)
			.map((product, index) => ({
				productId: product.id,
				quantity: 3 + Math.floor(random() * 10),
				unitCost: fromCents(
					Math.round(product.seed.cost * (0.92 + random() * 0.16) * 100),
				),
				expiry: product.seed.hasExpiry ? seedExpiry(index) : null,
			}));
		if (items.length > 0) {
			insertPurchase(
				{ date, note: round === 3 ? "Reposição de fim de mês" : null, items },
				`${date}T14:00:00.000Z`,
			);
		}
	}
}

const CUSTOMERS = [
	"Ana Paula Ribeiro",
	"Beatriz Santos",
	"Camila Ferreira",
	"Daniela Costa",
	"Eduarda Lima",
	"Fernanda Alves",
	"Gabriela Rocha",
	"Helena Martins",
	"Isabela Gomes",
	"Juliana Dias",
	"Larissa Mendes",
	"Mariana Souza",
	"Natália Pereira",
	"Patrícia Barbosa",
	"Renata Oliveira",
];

function seedPeople() {
	const resellers = [
		{ name: "Carla Nunes", commission: "10" },
		{ name: "Simone Araújo", commission: "12" },
		{ name: "Vanessa Prado", commission: "8" },
	].map((reseller, index) =>
		insertReseller({
			name: reseller.name,
			phone: `(11) 9${8700 + index}-12${30 + index}`,
			defaultCommission: reseller.commission,
			note: index === 0 ? "Atende o bairro Jardins" : null,
		}),
	);
	const customers = CUSTOMERS.map((name, index) =>
		insertCustomer({
			name,
			phone: index % 3 === 0 ? `(11) 9${9100 + index}-45${10 + index}` : null,
			note: index === 1 ? "Prefere perfumes florais" : null,
		}),
	);
	return { resellers, customers };
}

function channelFor(index: number): SaleChannel {
	if (index % 7 === 0) return "reseller";
	if (index % 4 === 0) return "mercado_livre";
	return "store";
}

function costsFor(channel: SaleChannel, commission: string): SaleCostInput[] {
	const costs: SaleCostInput[] = [
		{ kind: "tax", mode: "percent", value: "6", label: null },
	];
	if (channel === "mercado_livre") {
		costs.push(
			{ kind: "platform_fee", mode: "percent", value: "16", label: null },
			{ kind: "freight", mode: "amount", value: "18.90", label: null },
		);
	}
	if (channel === "reseller") {
		costs.push({
			kind: "commission",
			mode: "percent",
			value: commission,
			label: null,
		});
	}
	return costs;
}

const METHODS = ["pix", "credit", "cash", "debit"] as const;

type SeededProduct = { id: string; seed: SeedProduct };

/**
 * One to three different products with stock, and every 6th sale four or five, so the row thumbs show "+N". Every 25th
 * sale goes well below cost, so a loss shows up in the demo.
 */
function pickItems(
	products: SeededProduct[],
	random: () => number,
	index: number,
) {
	const count =
		index % 6 === 5
			? 4 + Math.floor(random() * 2)
			: 1 + Math.floor(random() * 3);
	const picks = Array.from(
		{ length: count },
		() => products[Math.floor(random() * products.length * 0.8)],
	).filter((product) => product !== undefined);
	const priceFactor = index % 25 === 24 ? 0.3 : 1;
	return [...new Map(picks.map((p) => [p.id, p])).values()]
		.filter((product) => sellableStock(product.id) >= 1)
		.map((product) => ({
			productId: product.id,
			quantity: 1,
			unitPrice: fromCents(Math.round(product.seed.price * priceFactor * 100)),
		}));
}

/** The sale of a given position in the demo: channel, discount, payment and customer vary with it. */
function saleInput(
	index: number,
	date: string,
	items: ReturnType<typeof pickItems>,
	reseller: ReturnType<typeof seedPeople>["resellers"][number],
	people: ReturnType<typeof seedPeople>,
): SaleInput {
	const channel = channelFor(index);
	const customer =
		index % 3 === 0 ? people.customers[index % people.customers.length] : null;
	return {
		date,
		channel,
		items,
		discount: index % 11 === 0 ? "5.00" : "0.00",
		surcharge: "0.00",
		costs: costsFor(channel, String(reseller.defaultCommission)),
		paymentCondition: "cash",
		paymentMethod: METHODS[index % METHODS.length] ?? "pix",
		customerId: customer?.id ?? null,
		resellerId: channel === "reseller" ? reseller.id : null,
	};
}

/** About five sales a day for the last 60 days (today included), with a loss and a few canceled ones. */
function seedSales(
	products: SeededProduct[],
	people: ReturnType<typeof seedPeople>,
) {
	const random = sequence(23);
	const today = todayISODate();
	const count = 300;
	for (let index = 0; index < count; index += 1) {
		const date = addDays(
			today,
			-Math.floor(((count - 1 - index) / count) * 60),
		);
		const reseller = people.resellers[index % people.resellers.length];
		const items = pickItems(products, random, index);
		if (items.length === 0 || !reseller) continue;
		const hour = String(10 + (index % 9)).padStart(2, "0");
		const sale = insertSale(
			saleInput(index, date, items, reseller, people),
			`${date}T${hour}:30:00.000Z`,
		);
		if (index % 40 === 17) cancelSaleRow(sale.id, "Cliente desistiu da compra");
	}
}

function fillDemoStore() {
	const categoryIds = new Map(
		LINES.map((line) => [line.category, insertCategory(line.category).id]),
	);
	const created = addDays(todayISODate(), -100);
	const products = seedProducts().map((seed, index) => ({
		id: insertProduct(
			toInput(seed, categoryIds, index),
			`${created}T12:00:00.000Z`,
		).id,
		seed,
	}));
	seedPurchases(products);
	seedSales(products, seedPeople());
}

/** Builds the demo store with the real fake operations, which write to `db.current`, and leaves `db.current` as it was. */
export function seededDb(): FakeDb {
	const previous = db.current;
	db.current = emptyDb();
	try {
		fillDemoStore();
		return db.current;
	} finally {
		db.current = previous;
	}
}
