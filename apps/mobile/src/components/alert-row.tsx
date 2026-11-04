import { Link } from "expo-router";
import { BatteryEmptyIcon } from "phosphor-react-native/src/icons/BatteryEmpty";
import { BatteryLowIcon } from "phosphor-react-native/src/icons/BatteryLow";
import { CalendarDotsIcon } from "phosphor-react-native/src/icons/CalendarDots";
import { CalendarXIcon } from "phosphor-react-native/src/icons/CalendarX";
import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { HourglassMediumIcon } from "phosphor-react-native/src/icons/HourglassMedium";
import { TrendDownIcon } from "phosphor-react-native/src/icons/TrendDown";
import { Pressable, View } from "react-native";
import { Icon, type IconType } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticTap } from "@/lib/haptics";
import type { AlertType, MockAlert } from "@/lib/mock-erp-data";
import { cn } from "@/lib/utils";

type Meta = {
	label: string;
	icon: IconType;
	tone: "danger" | "warn" | "neutral";
};

export const ALERT_META: Record<AlertType, Meta> = {
	expired: { label: "Vencido", icon: CalendarXIcon, tone: "danger" },
	"negative-margin": {
		label: "Margem negativa",
		icon: TrendDownIcon,
		tone: "danger",
	},
	out: { label: "Sem estoque", icon: BatteryEmptyIcon, tone: "danger" },
	expiring: { label: "Vence em breve", icon: CalendarDotsIcon, tone: "warn" },
	low: { label: "Estoque baixo", icon: BatteryLowIcon, tone: "warn" },
	idle: { label: "Produto parado", icon: HourglassMediumIcon, tone: "neutral" },
};

const ICON = {
	danger: "text-destructive",
	warn: "text-primary",
	neutral: "text-muted-foreground",
};

/** Alert as a white bordered card with the icon loose (no tile), colored by severity; opens the product. */
export function AlertRow({ alert }: { alert: MockAlert }) {
	const meta = ALERT_META[alert.type];

	return (
		<Link
			href={{ pathname: "/mock/product/[sku]", params: { sku: alert.sku } }}
			asChild
		>
			<Pressable
				onPress={hapticTap}
				className="flex-row items-center gap-3 rounded-2xl border border-border bg-background p-3.5 active:bg-card"
			>
				<View className="w-8 items-center">
					<Icon as={meta.icon} size={22} className={ICON[meta.tone]} />
				</View>
				<View className="flex-1 gap-0.5">
					<Text className={cn("font-sans-medium text-xs", ICON[meta.tone])}>
						{meta.label}
					</Text>
					<Text className="font-sans-medium" numberOfLines={1}>
						{alert.product}
					</Text>
					<Text className="text-muted-foreground text-xs" numberOfLines={1}>
						{alert.detail}
					</Text>
				</View>
				<Icon as={CaretRightIcon} size={18} className="text-foreground/45" />
			</Pressable>
		</Link>
	);
}
