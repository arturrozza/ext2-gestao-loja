import type { Href } from "expo-router";
import { BellIcon } from "phosphor-react-native/src/icons/Bell";
import { ChartBarIcon } from "phosphor-react-native/src/icons/ChartBar";
import { PackageIcon } from "phosphor-react-native/src/icons/Package";
import { ReceiptIcon } from "phosphor-react-native/src/icons/Receipt";
import { StorefrontIcon } from "phosphor-react-native/src/icons/Storefront";
import { TruckIcon } from "phosphor-react-native/src/icons/Truck";
import { UserIcon } from "phosphor-react-native/src/icons/User";
import { UsersIcon } from "phosphor-react-native/src/icons/Users";
import type { IconType } from "@/components/ui/icon";
import {
	MOCK_ALERTS,
	MOCK_PRODUCTS,
	MOCK_PURCHASES,
	MOCK_REPORT,
	MOCK_RESELLERS,
} from "@/lib/mock-erp-data";
import { comingSoonHref } from "@/lib/mock-routes";

export type Shortcut = {
	title: string;
	subtitle: string;
	icon: IconType;
	href: Href;
	/** Pending items: shows a red badge with the number. Only Alerts has one. */
	badge?: number;
};

export type ShortcutSection = { title: string; items: Shortcut[] };

/** Subtitles of the cards that show counts: real numbers, or "nothing yet" for a store that just started. */
function cardCounts(empty: boolean) {
	if (empty) {
		return {
			sales: "Nenhuma ainda",
			purchases: "Nenhuma ainda",
			products: "Nenhum ainda",
			resellers: "Nenhuma ainda",
			alerts: 0,
		};
	}
	return {
		sales: `${MOCK_REPORT.salesCount} no mês`,
		purchases: `${MOCK_PURCHASES.length} entradas`,
		products: `${MOCK_PRODUCTS.length} cadastrados`,
		resellers: `${MOCK_RESELLERS.length} ativas`,
		alerts: MOCK_ALERTS.length,
	};
}

/**
 * Mock grouping from MUN-9. Every module is reachable from the home screen, even the ones without a screen yet.
 * `empty`: the store just started (no products, purchases or sales).
 */
export function homeSections(empty: boolean): ShortcutSection[] {
	const counts = cardCounts(empty);
	return [
		{
			title: "Dia a dia",
			items: [
				{
					title: "Vendas",
					subtitle: counts.sales,
					icon: ReceiptIcon,
					href: "/mock/sales",
				},
				{
					title: "Compras",
					subtitle: counts.purchases,
					icon: TruckIcon,
					href: "/mock/purchases",
				},
			],
		},
		{
			title: "Estoque",
			items: [
				{
					title: "Produtos",
					subtitle: counts.products,
					icon: PackageIcon,
					href: "/mock/stock",
				},
				{
					title: "Alertas",
					subtitle:
						counts.alerts > 0 ? "Estoque, validade e margem" : "Tudo certo",
					icon: BellIcon,
					href: "/mock/alerts",
					badge: counts.alerts,
				},
			],
		},
		{
			title: "Gestão",
			items: [
				{
					title: "Relatórios",
					subtitle: "Lucro e canais",
					icon: ChartBarIcon,
					href: "/mock/reports",
				},
				{
					title: "Revendedoras",
					subtitle: counts.resellers,
					icon: UsersIcon,
					href: "/mock/resellers",
				},
				{
					title: "Clientes",
					subtitle: "Histórico",
					icon: UserIcon,
					href: comingSoonHref("Clientes"),
				},
				{
					title: "Loja",
					subtitle: "Dados e ajustes",
					icon: StorefrontIcon,
					href: comingSoonHref("Loja"),
				},
			],
		},
	];
}
