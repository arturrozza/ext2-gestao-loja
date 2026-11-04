import { Link } from "expo-router";
import {
	CalendarClock,
	CalendarX,
	ChevronRight,
	Hourglass,
	type LucideIcon,
	PackageMinus,
	PackageX,
	TrendingDown,
} from "lucide-react-native";
import { Pressable, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { AlertType, MockAlert } from "@/lib/mock-erp-data";
import { cn } from "@/lib/utils";

type Meta = {
	label: string;
	icon: LucideIcon;
	tone: "danger" | "warn" | "neutral";
};

export const ALERT_META: Record<AlertType, Meta> = {
	expired: { label: "Vencido", icon: CalendarX, tone: "danger" },
	"negative-margin": {
		label: "Margem negativa",
		icon: TrendingDown,
		tone: "danger",
	},
	out: { label: "Sem estoque", icon: PackageX, tone: "danger" },
	expiring: { label: "Vence em breve", icon: CalendarClock, tone: "warn" },
	low: { label: "Estoque baixo", icon: PackageMinus, tone: "warn" },
	idle: { label: "Produto parado", icon: Hourglass, tone: "neutral" },
};

const TILE = {
	danger: "bg-destructive/10",
	warn: "bg-primary/10",
	neutral: "bg-card",
};
const ICON = {
	danger: "text-destructive",
	warn: "text-primary",
	neutral: "text-muted-foreground",
};

/** Alert as a white bordered card; opens the product. */
export function AlertRow({ alert }: { alert: MockAlert }) {
	const meta = ALERT_META[alert.type];

	return (
		<Link
			href={{ pathname: "/mock/product/[sku]", params: { sku: alert.sku } }}
			asChild
		>
			<Pressable className="flex-row items-center gap-3 rounded-3xl border border-border bg-background p-3 active:bg-card">
				<View
					className={cn(
						"h-12 w-12 items-center justify-center rounded-2xl",
						TILE[meta.tone],
					)}
				>
					<Icon as={meta.icon} size={20} className={ICON[meta.tone]} />
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
				<Icon as={ChevronRight} size={18} className="text-muted-foreground" />
			</Pressable>
		</Link>
	);
}
