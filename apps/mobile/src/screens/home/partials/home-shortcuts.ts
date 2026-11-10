import type { Href } from "expo-router";
import { BellIcon } from "phosphor-react-native/src/icons/Bell";
import { ChartBarIcon } from "phosphor-react-native/src/icons/ChartBar";
import { HandshakeIcon } from "phosphor-react-native/src/icons/Handshake";
import { PackageIcon } from "phosphor-react-native/src/icons/Package";
import { ReceiptIcon } from "phosphor-react-native/src/icons/Receipt";
import { StorefrontIcon } from "phosphor-react-native/src/icons/Storefront";
import { TruckIcon } from "phosphor-react-native/src/icons/Truck";
import { UserIcon } from "phosphor-react-native/src/icons/User";
import { UsersIcon } from "phosphor-react-native/src/icons/Users";
import type { IconType } from "@/components/ui/icon";
import { useCustomers } from "@/queries/customers/use-customers";
import { useProducts } from "@/queries/products/use-products";
import { usePurchases } from "@/queries/purchases/use-purchases";
import { useResellers } from "@/queries/resellers/use-resellers";
import { useSales } from "@/queries/sales/use-sales";
import { useUsers } from "@/queries/users/use-users";

export type Shortcut = {
	title: string;
	subtitle: string;
	icon: IconType;
	href: Href;
	/** Pending items (the active alerts), shown as a red badge; nothing at zero (docs/conventions.md). */
	badge?: number;
};

export type ShortcutSection = { title: string; items: Shortcut[] };

/** "12 cadastrados", or "Nenhum ainda" for a store that just started; empty while it loads. */
function count(value: number | undefined, some: string, none: string) {
	if (value === undefined) return "";
	return value > 0 ? `${value} ${some}` : none;
}

/** The badge carries the number, so the subtitle only says whether something needs a look; empty while it loads. */
function alertsSubtitle(alerts: number | undefined) {
	if (alerts === undefined) return "";
	return alerts > 0 ? "Pedem atenção" : "Tudo certo";
}

/**
 * Every module is reachable from the home screen, in three groups of three: what's done every day (sell, buy, products),
 * the people around the store, and managing it (results, alerts, settings).
 */
function homeSections(counts: {
	sales: number | undefined;
	products: number | undefined;
	purchases: number | undefined;
	activeCustomers: number | undefined;
	activeResellers: number | undefined;
	activeUsers: number | undefined;
	alerts: number | undefined;
}): ShortcutSection[] {
	return [
		{
			title: "Dia a dia",
			items: [
				{
					title: "Vendas",
					subtitle: count(counts.sales, "este mês", "Nenhuma este mês"),
					icon: ReceiptIcon,
					href: "/sales",
				},
				{
					title: "Compras",
					subtitle: count(counts.purchases, "lançadas", "Nenhuma ainda"),
					icon: TruckIcon,
					href: "/purchases",
				},
				{
					title: "Produtos",
					subtitle: count(counts.products, "cadastrados", "Nenhum ainda"),
					icon: PackageIcon,
					href: "/products",
				},
			],
		},
		{
			title: "Pessoas",
			items: [
				{
					title: "Clientes",
					subtitle: count(counts.activeCustomers, "ativos", "Nenhum ainda"),
					icon: UserIcon,
					href: "/customers",
				},
				{
					title: "Revendedoras",
					subtitle: count(counts.activeResellers, "ativas", "Nenhuma ainda"),
					icon: HandshakeIcon,
					href: "/resellers",
				},
				{
					title: "Usuários",
					subtitle: count(counts.activeUsers, "ativos", "Nenhum ainda"),
					icon: UsersIcon,
					href: "/store/users",
				},
			],
		},
		{
			title: "Gestão",
			items: [
				{
					title: "Relatórios",
					subtitle: "Lucro por período",
					icon: ChartBarIcon,
					href: "/reports",
				},
				{
					title: "Alertas",
					subtitle: alertsSubtitle(counts.alerts),
					icon: BellIcon,
					href: "/alerts",
					badge: counts.alerts,
				},
				{
					title: "Loja",
					subtitle: "Dados e ajustes",
					icon: StorefrontIcon,
					href: "/store",
				},
			],
		},
	];
}

/**
 * The home's shortcut sections, with their counts (this month's sales, products, purchases, customers, resellers,
 * users and active alerts). `failed`: a number behind the subtitles failed to load, so the cards show
 * nothing instead of a loading line forever.
 */
/** `alerts`: the total from the month summary, which the home reads itself. */
export function useHomeShortcuts(alerts: number | undefined) {
	// The same filters as the products tab opens with: one query for both.
	const products = useProducts({
		search: "",
		categoryIds: [],
		archived: false,
		stock: [],
	});
	const purchases = usePurchases({ status: "active" });
	// The same filters as the sales tab opens with: one query for both. Its count leaves the canceled ones out.
	const sales = useSales({ period: "month", channels: [], result: null });
	const customers = useCustomers({ search: "", archived: false });
	const resellers = useResellers({ search: "", archived: false });
	const users = useUsers();
	const queries = [sales, products, purchases, customers, resellers, users];
	return {
		sections: homeSections({
			sales: sales.data?.pages[0]?.totals.count,
			products: products.data?.pages[0]?.total,
			purchases: purchases.data?.pages[0]?.total,
			activeCustomers: customers.data?.pages[0]?.total,
			activeResellers: resellers.data?.length,
			activeUsers: users.data?.filter((user) => user.active).length,
			alerts,
		}),
		failed: queries.some((query) => query.isError),
		refetch: () => Promise.all(queries.map((query) => query.refetch())),
	};
}
