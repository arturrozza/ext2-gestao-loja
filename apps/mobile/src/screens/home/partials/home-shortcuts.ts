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
import { useProducts } from "@/queries/products/use-products";
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
function homeSections(
	products: number | undefined,
	activeUsers: number | undefined,
): ShortcutSection[] {
	return [
		{
			title: "Dia a dia",
			items: [
				building("Vendas", ReceiptIcon, "/sales"),
				building("Compras", TruckIcon, "/purchases"),
				{
					title: "Produtos",
					subtitle: count(products, "cadastrados", "Nenhum ainda"),
					icon: PackageIcon,
					href: "/products",
				},
			],
		},
		{
			title: "Pessoas",
			items: [
				building("Clientes", UserIcon, "/customers"),
				building("Revendedoras", HandshakeIcon, "/resellers"),
				{
					title: "Usuários",
					subtitle: count(activeUsers, "ativos", "Nenhum ainda"),
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
 * The home's shortcut sections, with the counts that already come from the API (active products and users). `failed`:
 * a number behind the subtitles failed to load, so the cards show nothing instead of a loading line forever.
 */
export function useHomeShortcuts() {
	const products = useProducts({
		search: "",
		categoryIds: [],
		archived: false,
	});
	const users = useUsers();
	const activeUsers = users.data?.filter((user) => user.active).length;
	return {
		sections: homeSections(products.data?.pages[0]?.total, activeUsers),
		failed: products.isError || users.isError,
		refetch: () => Promise.all([products.refetch(), users.refetch()]),
	};
}
