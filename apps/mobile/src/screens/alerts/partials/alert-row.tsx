import { type Href, Link } from "expo-router";
import { CalendarXIcon } from "phosphor-react-native/src/icons/CalendarX";
import { ClockIcon } from "phosphor-react-native/src/icons/Clock";
import { PackageIcon } from "phosphor-react-native/src/icons/Package";
import { TrendDownIcon } from "phosphor-react-native/src/icons/TrendDown";
import { Pressable, View } from "react-native";
import { Icon, type IconType } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticTap } from "@/lib/haptics";
import type { Alert, AlertKind } from "@/queries/alerts/alerts.types";

type KindView = {
	label: string;
	/** Title of this kind's section in the list. */
	section: string;
	icon: IconType;
	urgent: boolean;
	action: string;
	href: (productId: string) => Href;
};

const toProduct = (id: string): Href => `/products/${id}`;
const toPurchase = (productId: string): Href => ({
	pathname: "/purchases/new",
	params: { productId },
});

/** How each alert reads and the action it leads to (alertas.md: "ir direto para a ação certa"). */
const KINDS: Record<AlertKind, KindView> = {
	out_of_stock: {
		label: "Sem estoque",
		section: "Sem estoque",
		icon: PackageIcon,
		urgent: true,
		action: "Lançar compra",
		href: toPurchase,
	},
	low_stock: {
		label: "Estoque baixo",
		section: "Estoque baixo",
		icon: PackageIcon,
		urgent: false,
		action: "Lançar compra",
		href: toPurchase,
	},
	expired: {
		label: "Vencido",
		section: "Vencidos",
		icon: CalendarXIcon,
		urgent: true,
		action: "Descartar",
		href: (id) => ({
			pathname: "/products/[id]/adjust",
			params: { id, reason: "expired_discarded" },
		}),
	},
	near_expiry: {
		label: "Perto de vencer",
		section: "Perto de vencer",
		icon: CalendarXIcon,
		urgent: false,
		action: "Ver validades",
		href: toProduct,
	},
	negative_margin: {
		label: "Margem negativa",
		section: "Margem negativa",
		icon: TrendDownIcon,
		urgent: true,
		action: "Revisar preço",
		href: (id) => `/products/${id}/edit`,
	},
	low_margin: {
		label: "Margem baixa",
		section: "Margem baixa",
		icon: TrendDownIcon,
		urgent: false,
		action: "Revisar preço",
		href: (id) => `/products/${id}/edit`,
	},
	stale: {
		label: "Produto parado",
		section: "Produtos parados",
		icon: ClockIcon,
		urgent: false,
		action: "Ver produto",
		href: toProduct,
	},
};

export function alertSection(kind: AlertKind) {
	return KINDS[kind].section;
}

/** One alert. The section above already names the kind, so the row only adds the details; red stays on the icon. */
export function AlertRow({ alert }: { alert: Alert }) {
	const kind = KINDS[alert.kind];
	return (
		<Link href={kind.href(alert.productId)} asChild>
			<Pressable
				onPress={hapticTap}
				accessibilityRole="button"
				accessibilityLabel={`${kind.label}: ${alert.productName}. ${kind.action}`}
				className="flex-row items-center gap-3 px-4 py-4 active:bg-card"
			>
				<Icon
					as={kind.icon}
					size={20}
					className={kind.urgent ? "text-destructive" : "text-foreground/50"}
				/>
				<View className="flex-1 gap-1">
					<Text className="font-sans-semibold text-[15px]" numberOfLines={1}>
						{alert.productName}
					</Text>
					<Text className="text-muted-foreground text-xs" numberOfLines={2}>
						{alert.detail}
					</Text>
				</View>
				<Text className="font-sans-medium text-primary text-xs">
					{kind.action}
				</Text>
			</Pressable>
		</Link>
	);
}
