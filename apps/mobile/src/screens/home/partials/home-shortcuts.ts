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
import { useResellers } from "@/queries/resellers/use-resellers";
import { useUsers } from "@/queries/users/use-users";

export type Shortcut = {
	title: string;
	subtitle: string;
	icon: IconType;
	href: Href;
	/** The module isn't built yet: the card says so instead of a subtitle, and its screen too. */
	underConstruction?: boolean;
};

export type ShortcutSection = { title: string; items: Shortcut[] };

/** "12 cadastrados", or "Nenhum ainda" for a store that just started; empty while it loads. */
function count(value: number | undefined, some: string, none: string) {
	if (value === undefined) return "";
	return value > 0 ? `${value} ${some}` : none;
}

const building = (title: string, icon: IconType, href: Href): Shortcut => ({
	title,
	subtitle: "",
	icon,
	href,
	underConstruction: true,
});

/**
 * Every module is reachable from the home screen, in three groups of three: what's done every day (sell, buy, products),
 * the people around the store, and managing it (results, alerts, settings). Modules without an API yet are marked
 * "Em construção".
 */
function homeSections(counts: {
	products: number | undefined;
	activeCustomers: number | undefined;
	activeResellers: number | undefined;
	activeUsers: number | undefined;
}): ShortcutSection[] {
	return [
		{
			title: "Dia a dia",
			items: [
				building("Vendas", ReceiptIcon, "/sales"),
				building("Compras", TruckIcon, "/purchases"),
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
				building("Relatórios", ChartBarIcon, "/reports"),
				building("Alertas", BellIcon, "/alerts"),
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
 * The home's shortcut sections, with the counts that already come from the API (active products, customers,
 * resellers and users). `failed`: a number behind the subtitles failed to load, so the cards show nothing instead of
 * a loading line forever.
 */
export function useHomeShortcuts() {
	const products = useProducts({
		search: "",
		categoryIds: [],
		archived: false,
	});
	const customers = useCustomers({ search: "", archived: false });
	const resellers = useResellers({ search: "", archived: false });
	const users = useUsers();
	const queries = [products, customers, resellers, users];
	return {
		sections: homeSections({
			products: products.data?.pages[0]?.total,
			activeCustomers: customers.data?.pages[0]?.total,
			activeResellers: resellers.data?.length,
			activeUsers: users.data?.filter((user) => user.active).length,
		}),
		failed: queries.some((query) => query.isError),
		refetch: () => Promise.all(queries.map((query) => query.refetch())),
	};
}
