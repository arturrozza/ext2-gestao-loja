import type { ISODate } from "@/lib/dates";
import type { Money, Percent } from "@/lib/money";
import type { Page } from "@/queries/pagination";
import type { ItemPreview } from "@/queries/products/products.types";

export type SaleChannel = "store" | "mercado_livre" | "reseller";
export type PaymentMethod = "pix" | "cash" | "credit" | "debit";
/** Informative only (vendas.md): installments and credit are out of the MVP. */
export type PaymentCondition = "cash" | "term";
export type SaleCostKind =
	| "freight"
	| "tax"
	| "platform_fee"
	| "commission"
	| "other";
export type SaleStatus = "active" | "canceled";

/** A sale cost (vendas.md): in reais or a percentage of the revenue. */
export type SaleCostInput = {
	kind: SaleCostKind;
	mode: "amount" | "percent";
	/** Money when `amount`, percentage when `percent`. */
	value: Money | Percent;
	/** Free description for "outros". */
	label: string | null;
};

export type SaleInput = {
	date: ISODate;
	channel: SaleChannel;
	items: { productId: string; quantity: number; unitPrice: Money }[];
	discount: Money;
	surcharge: Money;
	costs: SaleCostInput[];
	paymentCondition: PaymentCondition;
	paymentMethod: PaymentMethod;
	customerId: string | null;
	/** Required on the reseller channel. */
	resellerId: string | null;
};

export type SalePeriod = "today" | "7d" | "month" | "all";

/** A sale's outcome: real profit above zero, or a loss. */
export type SaleResult = "profit" | "loss";

export type SaleListFilters = {
	period: SalePeriod;
	/** Any of these; empty means every channel. */
	channels: SaleChannel[];
	/** Only sales with a profit, or only those with a loss; `null` for both. */
	result?: SaleResult | null;
	customerId?: string;
	resellerId?: string;
};

export type SaleSummary = {
	id: string;
	number: number;
	date: ISODate;
	createdAt: string;
	channel: SaleChannel;
	status: SaleStatus;
	description: string;
	customerName: string | null;
	resellerName: string | null;
	revenue: Money;
	profit: Money;
	/** First products, for the thumbs of the row. */
	preview: ItemPreview[];
	/** Distinct products in it. */
	productCount: number;
};

export type SalePage = Page<SaleSummary> & {
	/** Totals of the active sales matching the filters (canceled ones never count, vendas.md). */
	totals: { revenue: Money; profit: Money; count: number };
};

export type SaleItem = {
	id: string;
	productId: string;
	productName: string;
	photoUri: string | null;
	quantity: number;
	unitPrice: Money;
	/** Average cost when the sale was registered; never changes. */
	unitCost: Money;
	total: Money;
};

export type SaleCost = SaleCostInput & { id: string; amount: Money };

export type SaleDetail = SaleSummary & {
	items: SaleItem[];
	discount: Money;
	surcharge: Money;
	costs: SaleCost[];
	productsCost: Money;
	saleCosts: Money;
	/** Profit ÷ revenue, `null` when the revenue is zero. */
	margin: number | null;
	paymentCondition: PaymentCondition;
	paymentMethod: PaymentMethod;
	customerId: string | null;
	resellerId: string | null;
	author: string;
	canceledAt: string | null;
	cancelReason: string | null;
};
