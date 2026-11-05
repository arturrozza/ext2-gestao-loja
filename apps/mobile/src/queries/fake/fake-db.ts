/**
 * FAKE BACKEND (MUN-21): in-memory tables standing in for the database. Money is kept in integer cents here and
 * converted to decimal strings at the module boundary (`*.fake.ts`), like the API will.
 */
import type { ExpiryMonth, ISODate } from "@/lib/dates";
import type {
	AdjustmentReason,
	MovementType,
} from "@/queries/products/products.types";
import type {
	PaymentCondition,
	PaymentMethod,
	SaleChannel,
	SaleCostKind,
} from "@/queries/sales/sales.types";

export type CategoryRow = { id: string; name: string; createdAt: string };

export type ProductRow = {
	id: string;
	name: string;
	basePriceCents: number;
	categoryId: string | null;
	barcode: string | null;
	internalCode: string | null;
	minStock: number | null;
	location: string | null;
	hasExpiry: boolean;
	photoUri: string | null;
	archived: boolean;
	averageCostCents: number;
	createdAt: string;
};

/** Units of one purchase item (or of a stock increase). The user never sees lots, only their expiry. */
export type LotRow = {
	id: string;
	productId: string;
	purchaseId: string | null;
	expiry: ExpiryMonth | null;
	initialQuantity: number;
	quantity: number;
	createdAt: string;
};

/** Append-only stock ledger entry (docs/product/estoque.md). */
export type MovementRow = {
	id: string;
	productId: string;
	type: MovementType;
	/** Signed change in units (0 for a cost correction). */
	quantity: number;
	unitCostCents: number;
	averageCostAfterCents: number;
	stockAfter: number;
	reason: AdjustmentReason | null;
	note: string | null;
	purchaseId: string | null;
	saleId: string | null;
	createdAt: string;
	author: string;
};

export type PurchaseItemRow = {
	productId: string;
	quantity: number;
	unitCostCents: number;
	expiry: ExpiryMonth | null;
	lotId: string;
};

export type PurchaseRow = {
	id: string;
	number: number;
	date: ISODate;
	note: string | null;
	items: PurchaseItemRow[];
	canceledAt: string | null;
	createdAt: string;
	author: string;
};

export type SaleItemRow = {
	productId: string;
	quantity: number;
	unitPriceCents: number;
	/** Average cost when the sale was registered; never changes afterwards. */
	unitCostCents: number;
	/** Where the units came from, so a cancel puts them back in the same lots. */
	takenFrom: { lotId: string; quantity: number }[];
};

export type SaleCostRow = {
	kind: SaleCostKind;
	mode: "amount" | "percent";
	/** Cents when `amount`, percentage when `percent`. */
	value: number;
	amountCents: number;
	label: string | null;
};

export type SaleRow = {
	id: string;
	number: number;
	date: ISODate;
	channel: SaleChannel;
	items: SaleItemRow[];
	discountCents: number;
	surchargeCents: number;
	costs: SaleCostRow[];
	paymentCondition: PaymentCondition;
	paymentMethod: PaymentMethod;
	customerId: string | null;
	resellerId: string | null;
	revenueCents: number;
	productsCostCents: number;
	saleCostsCents: number;
	profitCents: number;
	canceledAt: string | null;
	cancelReason: string | null;
	createdAt: string;
	author: string;
};

export type ResellerRow = {
	id: string;
	name: string;
	phone: string | null;
	defaultCommission: number;
	note: string | null;
	archived: boolean;
	createdAt: string;
};

export type CustomerRow = {
	id: string;
	name: string;
	phone: string | null;
	note: string | null;
	archived: boolean;
	createdAt: string;
};

/**
 * Copy of the store settings for the fake modules that still read them (alerts, products, sales). The real ones live
 * in the API; `mirrorSettings` keeps this copy in step.
 */
export type SettingsRow = {
	defaultTaxPercent: number;
	mercadoLivreFeePercent: number;
	expiryWarningDays: number;
	staleProductDays: number;
	lowMarginPercent: number;
};

/** Author of the fake records; the signed-in user comes from the API. */
export type UserRow = {
	id: string;
	name: string;
};

export type FakeDb = {
	user: UserRow;
	settings: SettingsRow;
	categories: CategoryRow[];
	products: ProductRow[];
	lots: LotRow[];
	movements: MovementRow[];
	purchases: PurchaseRow[];
	sales: SaleRow[];
	resellers: ResellerRow[];
	customers: CustomerRow[];
	sequence: number;
};

export function emptyDb(): FakeDb {
	return {
		user: {
			id: "user-1",
			name: "Madalena",
		},
		settings: {
			defaultTaxPercent: 6,
			mercadoLivreFeePercent: 16,
			expiryWarningDays: 30,
			staleProductDays: 60,
			lowMarginPercent: 10,
		},
		categories: [],
		products: [],
		lots: [],
		movements: [],
		purchases: [],
		sales: [],
		resellers: [],
		customers: [],
		sequence: 0,
	};
}

/** The live fake database. Replaced wholesale when the demo scenario changes. */
export const db: { current: FakeDb } = { current: emptyDb() };

export function nextId(prefix: string): string {
	db.current.sequence += 1;
	return `${prefix}-${db.current.sequence}`;
}

export function nowISO(): string {
	return new Date().toISOString();
}

export function findOrThrow<T extends { id: string }>(
	rows: T[],
	id: string,
	fail: () => never,
): T {
	return rows.find((row) => row.id === id) ?? fail();
}
