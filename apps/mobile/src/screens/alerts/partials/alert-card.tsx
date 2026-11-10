import { router } from "expo-router";
import { CalendarXIcon } from "phosphor-react-native/src/icons/CalendarX";
import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { HourglassMediumIcon } from "phosphor-react-native/src/icons/HourglassMedium";
import { PackageIcon } from "phosphor-react-native/src/icons/Package";
import { WarningIcon } from "phosphor-react-native/src/icons/Warning";
import { Pressable, View } from "react-native";
import { Icon, type IconType } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticTap } from "@/lib/haptics";
import { plural, STOCK_FILTERS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { AlertCounts } from "@/queries/alerts/alerts.types";
import type { StockState } from "@/queries/products/products.types";

type AlertView = {
	/** Its count in the API. */
	count: keyof AlertCounts;
	/** The product list filter that shows these products; its label is the title. */
	filter: StockState;
	description: string;
	icon: IconType;
	/** Red when there's something in it: a sale or a loss is at stake now. */
	urgent: boolean;
};

/** The four alerts (alertas.md), the urgent ones first. */
export const ALERTS: AlertView[] = [
	{
		count: "outOfStock",
		filter: "out",
		description: "Zerados, entre os que têm estoque mínimo",
		icon: PackageIcon,
		urgent: true,
	},
	{
		count: "expired",
		filter: "expired",
		description: "Com unidades vencidas para descartar",
		icon: CalendarXIcon,
		urgent: true,
	},
	{
		count: "lowStock",
		filter: "low",
		description: "No estoque mínimo ou abaixo dele",
		icon: WarningIcon,
		urgent: false,
	},
	{
		count: "nearExpiry",
		filter: "near_expiry",
		description: "Vencem dentro do aviso das configurações",
		icon: HourglassMediumIcon,
		urgent: false,
	},
];

/** Opens the products tab with only this alert's products. `at` restarts its filters on every tap. */
function openProducts(filter: StockState) {
	hapticTap();
	// `navigate`, not `push`: Products is a tab, so this switches to it instead of stacking a second list.
	router.navigate({
		pathname: "/products",
		params: { stock: filter, at: String(Date.now()) },
	});
}

/** The icon's and the count's color: gray at zero, red for an urgent alert with products, neutral otherwise. */
function tonesOf(alert: AlertView, count: number) {
	if (count === 0)
		return { icon: "text-foreground/40", count: "text-foreground/40" };
	if (alert.urgent)
		return { icon: "text-destructive", count: "text-destructive" };
	return { icon: "text-foreground/50", count: "text-foreground" };
}

/**
 * One kind of alert: its name, what it means and how many products are in it. Tapping it opens those products, where
 * each one leads to its purchase or adjustment. At zero it stays, quiet, so the screen always reads the same.
 */
export function AlertCard({
	alert,
	count,
}: {
	alert: AlertView;
	count: number;
}) {
	const title = STOCK_FILTERS[alert.filter];
	const tones = tonesOf(alert, count);
	return (
		<Pressable
			onPress={() => openProducts(alert.filter)}
			accessibilityRole="button"
			accessibilityLabel={`${title}: ${plural(count, "produto", "produtos")}`}
			className="flex-row items-center gap-4 rounded-2xl bg-background p-4 active:bg-accent"
		>
			<Icon as={alert.icon} size={22} className={tones.icon} />
			<View className="flex-1 gap-0.5">
				<Text className="font-sans-semibold text-[15px]">{title}</Text>
				<Text className="text-muted-foreground text-xs" numberOfLines={2}>
					{count > 0 ? alert.description : "Tudo certo"}
				</Text>
			</View>
			<Text className={cn("font-sans-semibold text-xl", tones.count)}>
				{count}
			</Text>
			<Icon as={CaretRightIcon} size={16} className="text-foreground/35" />
		</Pressable>
	);
}
