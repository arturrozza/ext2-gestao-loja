/** pt-BR labels for domain enums shown in more than one screen. */
import type {
	AdjustmentReason,
	MovementType,
	StockFilter,
} from "@/queries/products/products.types";
import type {
	PaymentCondition,
	PaymentMethod,
	SaleChannel,
	SaleCostKind,
	SalePeriod,
} from "@/queries/sales/sales.types";

export const ADJUSTMENT_REASONS: Record<AdjustmentReason, string> = {
	count: "Contagem",
	damage: "Avaria",
	loss: "Perda",
	expired_discarded: "Vencido descartado",
	gift_internal_use: "Brinde ou uso interno",
	other: "Outro",
};

export const MOVEMENT_TYPES: Record<MovementType, string> = {
	purchase: "Compra",
	purchase_canceled: "Compra cancelada",
	sale: "Venda",
	sale_canceled: "Venda cancelada",
	adjustment: "Ajuste",
	cost_correction: "Custo corrigido",
};

export const STOCK_FILTERS: Record<StockFilter, string> = {
	in_stock: "Com estoque",
	low: "Estoque baixo",
	out: "Sem estoque",
	near_expiry: "Perto de vencer",
	expired: "Vencidos",
};

export const SALE_CHANNELS: Record<SaleChannel, string> = {
	store: "Loja",
	mercado_livre: "Mercado Livre",
	reseller: "Revendedora",
};

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
	pix: "Pix",
	cash: "Dinheiro",
	credit: "Crédito",
	debit: "Débito",
};

export const PAYMENT_CONDITIONS: Record<PaymentCondition, string> = {
	cash: "À vista",
	term: "A prazo",
};

export const SALE_COST_KINDS: Record<SaleCostKind, string> = {
	freight: "Frete",
	tax: "Imposto",
	platform_fee: "Taxa de plataforma",
	commission: "Comissão",
	other: "Outros",
};

export const SALE_PERIODS: Record<SalePeriod, string> = {
	today: "Hoje",
	"7d": "7 dias",
	month: "Mês",
	all: "Tudo",
};

/** A label map as chip options, in declaration order. */
export function toOptions<T extends string>(labels: Record<T, string>) {
	return (Object.entries(labels) as [T, string][]).map(([value, label]) => ({
		value,
		label,
	}));
}

/** "5x": quantity in lists, where the word "unidades" only adds noise. */
export function times(quantity: number): string {
	return `${quantity}x`;
}

/** "1 unidade" / "12 unidades". */
export function units(quantity: number): string {
	return `${quantity} ${Math.abs(quantity) === 1 ? "unidade" : "unidades"}`;
}

/** "1 venda" / "3 vendas". */
export function plural(count: number, one: string, many: string): string {
	return `${count} ${Math.abs(count) === 1 ? one : many}`;
}

/** "1 dia" / "30 dias". */
export function days(count: number): string {
	return `${count} ${Math.abs(count) === 1 ? "dia" : "dias"}`;
}

/** "+2" / "−2" with a real minus sign. */
export function signed(quantity: number): string {
	if (quantity > 0) return `+${quantity}`;
	if (quantity < 0) return `−${Math.abs(quantity)}`;
	return "0";
}
