import type { ISODate } from "@/lib/dates";
import type { Money, Percent } from "@/lib/money";
import type { Page } from "@/queries/pagination";
import type { ItemPreview } from "@/queries/products/products.types";

export type SaleChannel = "store" | "mercado_livre" | "reseller";
export type PaymentMethod = "pix" | "cash" | "credit" | "debit";
/** "À vista" is born paid; "A prazo" is paid later, all at once (vendas.md): installments are out of the MVP. */
export type PaymentCondition = "cash" | "term";
/** Where a term sale stands; `overdue` is an unpaid one past its due date (vendas.md, RN-VEN-29). */
export type PaymentStatus = "unpaid" | "overdue" | "paid";
export type SaleCostKind =
	| "freight"
	| "tax"
	| "platform_fee"
	| "commission"
	| "other";
type SaleStatus = "active" | "canceled";

/** A sale cost (vendas.md): in reais (cents) or a percentage of the revenue (basis points, lib/money.ts). */
export type SaleCostInput = {
	kind: SaleCostKind;
	/** Free description for "outros". */
	label: string | null;
} & ({ mode: "amount"; value: Money } | { mode: "percent"; value: Percent });

export type SaleInput = {
	date: ISODate;
	channel: SaleChannel;
	items: { productId: string; quantity: number; unitPrice: Money }[];
	discount: Money;
	surcharge: Money;
	costs: SaleCostInput[];
	paymentCondition: PaymentCondition;
	/** Required on a cash sale; `null` on a term one, which gets it when it's paid. */
	paymentMethod: PaymentMethod | null;
	/** Required on a term sale; `null` on a cash one. */
	dueDate: ISODate | null;
	/** Required on a term sale. */
	customerId: string | null;
	/** Required on the reseller channel. */
	resellerId: string | null;
};

/** Marking a term sale as paid, all at once (vendas.md, RF-VEN-19). */
export type SalePaymentInput = {
	paidAt: ISODate;
	paymentMethod: PaymentMethod;
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
	/** Only the term sales in this payment status; `null` for every sale. */
	payment?: PaymentStatus | null;
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
	/** Only for a term sale that isn't canceled. */
	paymentStatus: PaymentStatus | null;
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
	photoUrl: string | null;
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
	/** `null` while a term sale is unpaid. */
	paymentMethod: PaymentMethod | null;
	dueDate: ISODate | null;
	paidAt: ISODate | null;
	customerId: string | null;
	resellerId: string | null;
	author: string;
	canceledAt: string | null;
	cancelReason: string | null;
};
