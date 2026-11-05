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
import type { HomeSummary } from "@/queries/home/home.types";
import { useHomeSummary } from "@/queries/home/use-home";
import { useUsers } from "@/queries/users/use-users";

export type Shortcut = {
	title: string;
	subtitle: string;
	icon: IconType;
	href: Href;
	/** Pending items: shows a red badge with the number. Only Alerts has one. */
	badge?: number;
};

export type ShortcutSection = { title: string; items: Shortcut[] };

const NO_COUNTS: HomeSummary["counts"] = {
	products: 0,
	purchases: 0,
	activeResellers: 0,
	activeCustomers: 0,
	alerts: 0,
};

/** "12 cadastrados", or "Nenhum ainda" for a store that just started. */
function count(value: number, some: string, none: string) {
	return value > 0 ? `${value} ${some}` : none;
}

function alertsSubtitle(summary: HomeSummary | undefined, alerts: number) {
	if (!summary) return "";
	return alerts > 0 ? "Para resolver" : "Tudo certo";
}

/**
 * Every module is reachable from the home screen, in three groups of three: what's done every day (sell, buy, products),
 * the people around the store, and managing it (results, alerts, settings).
 */
function homeSections(
	summary: HomeSummary | undefined,
	activeUsers: number | undefined,
): ShortcutSection[] {
	// Until the summary arrives (or if it fails) the shortcuts still lead everywhere, just without numbers.
	const counts = summary?.counts ?? NO_COUNTS;
	const salesCount = summary?.month.salesCount ?? 0;
	return [
		{
			title: "Dia a dia",
			items: [
				{
					title: "Vendas",
					subtitle: summary
						? count(salesCount, "no mês", "Nenhuma no mês")
						: "",
					icon: ReceiptIcon,
					href: "/sales",
				},
				{
					title: "Compras",
					subtitle: summary
						? count(counts.purchases, "entradas", "Nenhuma ainda")
						: "",
					icon: TruckIcon,
					href: "/purchases",
				},
				{
					title: "Produtos",
					subtitle: summary
						? count(counts.products, "cadastrados", "Nenhum ainda")
						: "",
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
					subtitle: summary
						? count(counts.activeCustomers, "ativos", "Nenhum ainda")
						: "",
					icon: UserIcon,
					href: "/customers",
				},
				{
					title: "Revendedoras",
					subtitle: summary
						? count(counts.activeResellers, "ativas", "Nenhuma ainda")
						: "",
					icon: HandshakeIcon,
					href: "/resellers",
				},
				{
					title: "Usuários",
					subtitle:
						activeUsers === undefined
							? ""
							: count(activeUsers, "ativos", "Nenhum ainda"),
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
					subtitle: "Lucro e canais",
					icon: ChartBarIcon,
					href: "/reports",
				},
				{
					title: "Alertas",
					subtitle: alertsSubtitle(summary, counts.alerts),
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
 * The home's month summary and its shortcut sections. Users aren't in the summary (they come from the real API, the
 * summary is still fake), so their count comes from the users list. `failed`: a number behind the subtitles failed to
 * load, so the cards show nothing instead of a loading line forever.
 */
export function useHomeShortcuts() {
	const summary = useHomeSummary();
	const users = useUsers();
	const activeUsers = users.data?.filter((user) => user.active).length;
	return {
		summary,
		sections: homeSections(summary.data, activeUsers),
		failed: summary.isError || users.isError,
		refetch: () => Promise.all([summary.refetch(), users.refetch()]),
	};
}
