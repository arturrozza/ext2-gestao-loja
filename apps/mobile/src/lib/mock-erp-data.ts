// Fake data for the ERP mock screens (design preview only, not real business rules).
// Store: perfumery and cosmetics. "Lucro real" (real profit) = revenue − product cost − sale costs.

const brl = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

export function formatBRL(value: number) {
	return brl.format(value);
}

/** Parses a pt-BR number typed by the user ("1.234,56" → 1234.56). Returns NaN when empty or invalid. */
export function parseBRNumber(text: string) {
	const normalized = text.trim().replace(/\./g, "").replace(",", ".");
	return normalized === "" ? Number.NaN : Number(normalized);
}

export function formatPercent(value: number) {
	return `${Math.round(value * 100)}%`;
}

// ---------- Products, lots and stock movements

export type Lot = {
	code: string;
	available: number;
	initial: number;
	expiry: string | null;
};
export type Movement = {
	date: string;
	type: "Entrada" | "Saída" | "Ajuste" | "Estorno";
	quantity: number;
	note: string;
};

export type MockProduct = {
	sku: string;
	name: string;
	category: string;
	price: number;
	/** Average cost (custo médio). */
	cost: number;
	stock: number;
	minStock: number;
	location: string;
	lots: Lot[];
	movements: Movement[];
};

export const MOCK_PRODUCTS: MockProduct[] = [
	{
		sku: "PER-001",
		name: "Perfume Floral Intenso 100ml",
		category: "Perfumes",
		price: 189.9,
		cost: 92,
		stock: 14,
		minStock: 5,
		location: "Vitrine 1",
		lots: [
			{ code: "L2310", available: 6, initial: 12, expiry: "08/2027" },
			{ code: "L2402", available: 8, initial: 10, expiry: "01/2028" },
		],
		movements: [
			{ date: "Hoje, 14:32", type: "Saída", quantity: -1, note: "Venda #1042" },
			{ date: "02/11", type: "Entrada", quantity: 10, note: "Compra #318" },
			{
				date: "28/10",
				type: "Ajuste",
				quantity: -1,
				note: "Avaria no transporte",
			},
		],
	},
	{
		sku: "PER-014",
		name: "Body splash Baunilha 200ml",
		category: "Perfumes",
		price: 59.9,
		cost: 24,
		stock: 3,
		minStock: 8,
		location: "Gôndola 2",
		lots: [{ code: "L2405", available: 3, initial: 12, expiry: "12/2026" }],
		movements: [
			{ date: "Ontem", type: "Saída", quantity: -2, note: "Venda #1036" },
			{ date: "15/09", type: "Entrada", quantity: 12, note: "Compra #301" },
		],
	},
	{
		sku: "MAQ-007",
		name: "Batom matte Nude 3,5g",
		category: "Maquiagem",
		price: 39.9,
		cost: 14.5,
		stock: 0,
		minStock: 6,
		location: "Expositor A",
		lots: [],
		movements: [
			{ date: "30/10", type: "Saída", quantity: -1, note: "Venda #1012" },
		],
	},
	{
		sku: "MAQ-022",
		name: "Base líquida FPS 30 Média",
		category: "Maquiagem",
		price: 79.9,
		cost: 38,
		stock: 11,
		minStock: 4,
		location: "Expositor A",
		lots: [{ code: "L2398", available: 11, initial: 15, expiry: "05/2027" }],
		movements: [
			{ date: "01/11", type: "Saída", quantity: -2, note: "Venda #1029" },
		],
	},
	{
		sku: "CAB-003",
		name: "Shampoo reconstrução 300ml",
		category: "Cabelos",
		price: 44.9,
		cost: 21,
		stock: 2,
		minStock: 6,
		location: "Prateleira B2",
		lots: [{ code: "L2281", available: 2, initial: 12, expiry: "11/2026" }],
		movements: [
			{ date: "03/11", type: "Saída", quantity: -1, note: "Venda #1033" },
		],
	},
	{
		sku: "COR-010",
		name: "Hidratante corporal Amêndoas 400ml",
		category: "Corpo",
		price: 52.9,
		cost: 55.4,
		stock: 9,
		minStock: 4,
		location: "Gôndola 1",
		lots: [{ code: "L2411", available: 9, initial: 10, expiry: "03/2027" }],
		movements: [
			{
				date: "29/10",
				type: "Entrada",
				quantity: 10,
				note: "Compra #312 (custo subiu)",
			},
		],
	},
	{
		sku: "SKN-005",
		name: "Sérum vitamina C 30ml",
		category: "Skincare",
		price: 119.9,
		cost: 48,
		stock: 7,
		minStock: 3,
		location: "Vitrine 2",
		lots: [
			{ code: "L2207", available: 2, initial: 6, expiry: "10/2026" },
			{ code: "L2409", available: 5, initial: 6, expiry: "09/2027" },
		],
		movements: [
			{ date: "12/08", type: "Saída", quantity: -1, note: "Venda #0954" },
		],
	},
];

export function productMargin(product: MockProduct) {
	return (product.price - product.cost) / product.price;
}

export function stockValue() {
	return MOCK_PRODUCTS.reduce((sum, p) => sum + p.stock * p.cost, 0);
}

// ---------- Sales

export type SaleStatus = "paid" | "pending" | "canceled";
export type Channel = "store" | "ml" | "reseller";

export const CHANNEL_LABEL: Record<Channel, string> = {
	store: "Loja",
	ml: "Mercado Livre",
	reseller: "Revendedora",
};

export type MockSale = {
	id: string;
	customer: string;
	channel: Channel;
	reseller: string | null;
	time: string;
	payment: string;
	status: SaleStatus;
	items: { name: string; quantity: number; price: number; unitCost: number }[];
	costs: { label: string; value: number }[];
};

export const MOCK_SALES: MockSale[] = [
	{
		id: "1042",
		customer: "Ana Paula",
		channel: "store",
		reseller: null,
		time: "Hoje, 14:32",
		payment: "Pix",
		status: "paid",
		items: [
			{
				name: "Perfume Floral Intenso 100ml",
				quantity: 1,
				price: 189.9,
				unitCost: 92,
			},
			{
				name: "Body splash Baunilha 200ml",
				quantity: 1,
				price: 59.9,
				unitCost: 24,
			},
		],
		costs: [{ label: "Imposto (6%)", value: 14.99 }],
	},
	{
		id: "1041",
		customer: "Pedido #2000004871",
		channel: "ml",
		reseller: null,
		time: "Hoje, 13:58",
		payment: "Mercado Pago",
		status: "paid",
		items: [
			{
				name: "Sérum vitamina C 30ml",
				quantity: 2,
				price: 119.9,
				unitCost: 48,
			},
		],
		costs: [
			{ label: "Taxa Mercado Livre", value: 38.36 },
			{ label: "Frete", value: 22.9 },
			{ label: "Imposto (6%)", value: 14.39 },
		],
	},
	{
		id: "1040",
		customer: "Carla Mendes",
		channel: "reseller",
		reseller: "Juliana Reis",
		time: "Hoje, 12:10",
		payment: "Acerto",
		status: "pending",
		items: [
			{
				name: "Base líquida FPS 30 Média",
				quantity: 2,
				price: 79.9,
				unitCost: 38,
			},
			{
				name: "Batom matte Nude 3,5g",
				quantity: 1,
				price: 39.9,
				unitCost: 14.5,
			},
		],
		costs: [
			{ label: "Comissão (15%)", value: 29.96 },
			{ label: "Imposto (6%)", value: 11.98 },
		],
	},
	{
		id: "1039",
		customer: "Fernanda Lima",
		channel: "store",
		reseller: null,
		time: "Hoje, 11:47",
		payment: "Crédito",
		status: "canceled",
		items: [
			{
				name: "Hidratante corporal Amêndoas 400ml",
				quantity: 1,
				price: 52.9,
				unitCost: 55.4,
			},
		],
		costs: [{ label: "Taxa da maquininha", value: 1.85 }],
	},
	{
		id: "1038",
		customer: "Patrícia Souza",
		channel: "store",
		reseller: null,
		time: "Ontem, 18:20",
		payment: "Dinheiro",
		status: "paid",
		items: [
			{
				name: "Hidratante corporal Amêndoas 400ml",
				quantity: 2,
				price: 52.9,
				unitCost: 55.4,
			},
		],
		costs: [{ label: "Imposto (6%)", value: 6.35 }],
	},
];

export function saleTotal(sale: MockSale) {
	return sale.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
}

export function saleProductCost(sale: MockSale) {
	return sale.items.reduce(
		(sum, item) => sum + item.quantity * item.unitCost,
		0,
	);
}

export function saleProfit(sale: MockSale) {
	const costs = sale.costs.reduce((sum, c) => sum + c.value, 0);
	return saleTotal(sale) - saleProductCost(sale) - costs;
}

// ---------- Resellers

export type MockReseller = {
	id: string;
	name: string;
	city: string;
	phone: string;
	commissionRate: number;
	monthSales: number;
	pendingSettlement: number;
};

export const MOCK_RESELLERS: MockReseller[] = [
	{
		id: "r1",
		name: "Juliana Reis",
		city: "Curitiba",
		phone: "(41) 99812-3344",
		commissionRate: 0.15,
		monthSales: 3820.4,
		pendingSettlement: 412.5,
	},
	{
		id: "r2",
		name: "Ana Paula Costa",
		city: "Joinville",
		phone: "(47) 99123-8877",
		commissionRate: 0.12,
		monthSales: 2910,
		pendingSettlement: 0,
	},
	{
		id: "r3",
		name: "Mariana Alves",
		city: "Londrina",
		phone: "(43) 98877-1020",
		commissionRate: 0.15,
		monthSales: 1475.8,
		pendingSettlement: 980,
	},
	{
		id: "r4",
		name: "Beatriz Nunes",
		city: "Maringá",
		phone: "(44) 99654-0099",
		commissionRate: 0.1,
		monthSales: 860,
		pendingSettlement: 0,
	},
	{
		id: "r5",
		name: "Camila Rocha",
		city: "Ponta Grossa",
		phone: "(42) 99701-5566",
		commissionRate: 0.12,
		monthSales: 4210.9,
		pendingSettlement: 155,
	},
];

// ---------- Purchases (stock entries)

export type MockPurchase = {
	id: string;
	date: string;
	items: {
		name: string;
		quantity: number;
		unitCost: number;
		expiry: string | null;
	}[];
};

export const MOCK_PURCHASES: MockPurchase[] = [
	{
		id: "318",
		date: "02/11/2026",
		items: [
			{
				name: "Perfume Floral Intenso 100ml",
				quantity: 10,
				unitCost: 94,
				expiry: "01/2028",
			},
			{
				name: "Sérum vitamina C 30ml",
				quantity: 6,
				unitCost: 49.5,
				expiry: "09/2027",
			},
		],
	},
	{
		id: "312",
		date: "29/10/2026",
		items: [
			{
				name: "Hidratante corporal Amêndoas 400ml",
				quantity: 10,
				unitCost: 58,
				expiry: "03/2027",
			},
		],
	},
	{
		id: "305",
		date: "18/10/2026",
		items: [
			{
				name: "Base líquida FPS 30 Média",
				quantity: 15,
				unitCost: 38,
				expiry: "05/2027",
			},
			{
				name: "Batom matte Nude 3,5g",
				quantity: 12,
				unitCost: 14.5,
				expiry: null,
			},
			{
				name: "Shampoo reconstrução 300ml",
				quantity: 12,
				unitCost: 21,
				expiry: "11/2026",
			},
		],
	},
];

export function purchaseTotal(purchase: MockPurchase) {
	return purchase.items.reduce(
		(sum, item) => sum + item.quantity * item.unitCost,
		0,
	);
}

// ---------- Alerts

export type AlertType =
	| "low"
	| "out"
	| "expiring"
	| "expired"
	| "negative-margin"
	| "idle";

export type MockAlert = {
	id: string;
	type: AlertType;
	product: string;
	sku: string;
	detail: string;
};

export const MOCK_ALERTS: MockAlert[] = [
	{
		id: "a1",
		type: "expired",
		product: "Sérum vitamina C 30ml",
		sku: "SKN-005",
		detail: "Lote L2207 venceu em 10/2026 · 2 un.",
	},
	{
		id: "a2",
		type: "negative-margin",
		product: "Hidratante corporal Amêndoas 400ml",
		sku: "COR-010",
		detail: "Custo médio R$ 55,40 acima do preço R$ 52,90",
	},
	{
		id: "a3",
		type: "out",
		product: "Batom matte Nude 3,5g",
		sku: "MAQ-007",
		detail: "Sem estoque · mínimo 6",
	},
	{
		id: "a4",
		type: "expiring",
		product: "Shampoo reconstrução 300ml",
		sku: "CAB-003",
		detail: "Lote L2281 vence em 11/2026 · 2 un.",
	},
	{
		id: "a5",
		type: "low",
		product: "Body splash Baunilha 200ml",
		sku: "PER-014",
		detail: "3 un. · mínimo 8",
	},
	{
		id: "a6",
		type: "idle",
		product: "Sérum vitamina C 30ml",
		sku: "SKN-005",
		detail: "Sem vendas há 84 dias",
	},
];

// ---------- Reports

export const MOCK_REPORT = {
	revenue: 18420.5,
	profit: 5126.3,
	salesCount: 148,
	averageTicket: 124.46,
	daily: [
		{ day: "Qui", revenue: 1820 },
		{ day: "Sex", revenue: 2410 },
		{ day: "Sáb", revenue: 3380 },
		{ day: "Dom", revenue: 960 },
		{ day: "Seg", revenue: 1540 },
		{ day: "Ter", revenue: 2120 },
		{ day: "Qua", revenue: 2847.9 },
	],
	costs: [
		{ label: "Custo dos produtos", value: 9410.2 },
		{ label: "Comissões", value: 1388.4 },
		{ label: "Taxas Mercado Livre", value: 1102.6 },
		{ label: "Impostos", value: 1105.2 },
		{ label: "Frete", value: 287.8 },
	],
	channels: [
		{ channel: "store" as Channel, revenue: 9840.3, profit: 3120.4, count: 86 },
		{
			channel: "reseller" as Channel,
			revenue: 5260.9,
			profit: 1310.5,
			count: 39,
		},
		{ channel: "ml" as Channel, revenue: 3319.3, profit: 695.4, count: 23 },
	],
	topProducts: [
		{ name: "Perfume Floral Intenso 100ml", quantity: 42 },
		{ name: "Base líquida FPS 30 Média", quantity: 31 },
		{ name: "Body splash Baunilha 200ml", quantity: 28 },
	],
};

// ---------- Mercado Livre

export const MOCK_ML = {
	nickname: "MUNDOMADAM_COSMETICOS",
	lastSync: "há 12 min",
	importedThisMonth: 23,
	pending: [
		{
			id: "2000004902",
			title: "Kit Perfume Floral + Body Splash Presente",
			quantity: 1,
			price: 239.9,
			fee: 38.38,
			buyer: "LUCIANA.M",
		},
		{
			id: "2000004899",
			title: "Batom Matte Nude Longa Duração",
			quantity: 2,
			price: 39.9,
			fee: 12.77,
			buyer: "CAROL_SP",
		},
	],
};
