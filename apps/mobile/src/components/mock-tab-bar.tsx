import type { TabTriggerSlotProps } from "expo-router/ui";
import { TabTrigger } from "expo-router/ui";
import { HouseIcon } from "phosphor-react-native/src/icons/House";
import { PackageIcon } from "phosphor-react-native/src/icons/Package";
import { PlusIcon } from "phosphor-react-native/src/icons/Plus";
import { ReceiptIcon } from "phosphor-react-native/src/icons/Receipt";
import { type ComponentRef, type Ref, useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QuickActionsSheet } from "@/components/quick-actions-sheet";
import { Icon, type IconType } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticPress, hapticSelect } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const TABS = [
	{ name: "dashboard", label: "Início", icon: HouseIcon },
	{ name: "sales", label: "Vendas", icon: ReceiptIcon },
	{ name: "stock", label: "Estoque", icon: PackageIcon },
] as const;

type TabButtonProps = TabTriggerSlotProps & {
	icon: IconType;
	label: string;
	ref?: Ref<ComponentRef<typeof View>>;
};

function TabButton({
	icon,
	label,
	isFocused,
	style: _triggerStyle,
	...props
}: TabButtonProps) {
	// TabTrigger (asChild) injects `style: { flexDirection: "row", justifyContent: "space-between" }`, and inline style
	// wins over className in NativeWind, which breaks the layout. Drop it and style via className only.
	return (
		<Pressable
			onPressIn={hapticSelect}
			{...props}
			accessibilityLabel={label}
			className={cn(
				"h-14 flex-1 items-center justify-center gap-1 rounded-full px-1",
				isFocused && "bg-primary/10",
			)}
		>
			<View>
				<Icon
					as={icon}
					size={20}
					weight={isFocused ? "fill" : "regular"}
					className={isFocused ? "text-primary" : "text-muted-foreground"}
				/>
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
 * orange "+" button next to it that opens the quick actions sheet. Depth comes from color, no shadow.
 */
export function MockTabBar() {
	const insets = useSafeAreaInsets();
	const [actionsOpen, setActionsOpen] = useState(false);

	return (
		<View
			pointerEvents="box-none"
			className="absolute inset-x-0 bottom-0 flex-row items-center gap-3 px-4"
			style={{ paddingBottom: insets.bottom + 8 }}
		>
			<View className="flex-1 flex-row gap-2 rounded-full border border-border bg-background p-1.5">
				{TABS.map((tab) => (
					<TabTrigger key={tab.name} name={tab.name} asChild>
						<TabButton icon={tab.icon} label={tab.label} />
					</TabTrigger>
				))}
			</View>
			<Pressable
				onPressIn={hapticPress}
				accessibilityRole="button"
				accessibilityLabel="Criar: venda, compra, produto ou cliente"
				onPress={() => setActionsOpen(true)}
				className="h-14 w-14 items-center justify-center rounded-full bg-primary active:bg-primary/90"
			>
				<Icon as={PlusIcon} size={24} className="text-primary-foreground" />
			</Pressable>
			<QuickActionsSheet
				open={actionsOpen}
				onClose={() => setActionsOpen(false)}
			/>
		</View>
	);
}
