import { Link } from "expo-router";
import type { TabTriggerSlotProps } from "expo-router/ui";
import { TabTrigger } from "expo-router/ui";
import {
	House,
	LayoutGrid,
	type LucideIcon,
	Package,
	Plus,
	ReceiptText,
} from "lucide-react-native";
import type { ComponentRef, Ref } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { MOCK_ALERTS, MOCK_PRODUCTS } from "@/lib/mock-erp-data";
import { cn } from "@/lib/utils";

const lowStockCount = MOCK_PRODUCTS.filter((p) => p.stock < p.minStock).length;

const TABS = [
	{ name: "dashboard", label: "Início", icon: House, badge: 0 },
	{ name: "sales", label: "Vendas", icon: ReceiptText, badge: 0 },
	{ name: "stock", label: "Estoque", icon: Package, badge: lowStockCount },
	{ name: "more", label: "Mais", icon: LayoutGrid, badge: MOCK_ALERTS.length },
] as const;

function Badge({ count }: { count: number }) {
	return (
		<View className="absolute -top-1.5 -right-2.5 h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1">
			<Text className="font-sans-semibold text-[10px] text-primary-foreground leading-none">
				{count}
			</Text>
		</View>
	);
}

type TabButtonProps = TabTriggerSlotProps & {
	icon: LucideIcon;
	label: string;
	badge: number;
	ref?: Ref<ComponentRef<typeof View>>;
};

function TabButton({
	icon,
	label,
	badge,
	isFocused,
	style: _triggerStyle,
	...props
}: TabButtonProps) {
	// TabTrigger (asChild) injects `style: { flexDirection: "row", justifyContent: "space-between" }`, and inline style
	// wins over className in NativeWind, which breaks the layout. Drop it and style via className only.
	return (
		<Pressable
			{...props}
			accessibilityLabel={badge > 0 ? `${label}, ${badge} pendentes` : label}
			className={cn(
				"h-14 flex-1 items-center justify-center gap-1 rounded-full px-1",
				isFocused && "bg-primary/10",
			)}
		>
			<View>
				<Icon
					as={icon}
					size={20}
					className={isFocused ? "text-primary" : "text-muted-foreground"}
				/>
				{badge > 0 ? <Badge count={badge} /> : null}
			</View>
			<Text
				className={cn(
					"text-[10px] leading-none",
					isFocused
						? "font-sans-semibold text-primary"
						: "text-muted-foreground",
				)}
				numberOfLines={1}
				adjustsFontSizeToFit
				minimumFontScale={0.85}
			>
				{label}
			</Text>
		</Pressable>
	);
}

/**
 * Bottom navigation for the ERP mock: white bar (thin border) with icon + label for every tab (badges show pending counts) and an
 * orange "new sale" button next to it. Depth comes from color, no shadow.
 */
export function MockTabBar() {
	const insets = useSafeAreaInsets();

	return (
		<View
			pointerEvents="box-none"
			className="absolute inset-x-0 bottom-0 flex-row items-center gap-3 px-4"
			style={{ paddingBottom: insets.bottom + 8 }}
		>
			<View className="flex-1 flex-row gap-2 rounded-full border border-border bg-background p-1.5">
				{TABS.map((tab) => (
					<TabTrigger key={tab.name} name={tab.name} asChild>
						<TabButton icon={tab.icon} label={tab.label} badge={tab.badge} />
					</TabTrigger>
				))}
			</View>
			<Link href="/mock/new-sale" asChild>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Nova venda"
					className="h-14 w-14 items-center justify-center rounded-full bg-primary active:bg-primary/90"
				>
					<Icon as={Plus} size={24} className="text-primary-foreground" />
				</Pressable>
			</Link>
		</View>
	);
}
