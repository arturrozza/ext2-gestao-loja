import { usePathname } from "expo-router";
import type { TabTriggerSlotProps } from "expo-router/ui";
import { TabTrigger } from "expo-router/ui";
import { HouseIcon } from "phosphor-react-native/src/icons/House";
import { PackageIcon } from "phosphor-react-native/src/icons/Package";
import { PlusIcon } from "phosphor-react-native/src/icons/Plus";
import { ReceiptIcon } from "phosphor-react-native/src/icons/Receipt";
import {
	type ComponentRef,
	type Ref,
	useEffect,
	useRef,
	useState,
} from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QuickActionsSheet } from "@/components/quick-actions-sheet";
import { Icon, type IconType } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticPress, hapticSelect } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/** The tabs, in order. The tabs `_layout` registers its triggers from this same list. */
export const TABS = [
	{ name: "home", href: "/", label: "Início", icon: HouseIcon },
	{ name: "sales", href: "/sales", label: "Vendas", icon: ReceiptIcon },
	{ name: "products", href: "/products", label: "Produtos", icon: PackageIcon },
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
			)}
		>
			<View>
				<Icon
					as={icon}
					size={20}
					weight={isFocused ? "fill" : "bold"}
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

/** Bar border, padding and gap between tabs, in px: the moving highlight is placed with them. */
const BORDER = 1;
const PAD = 6;
const GAP = 8;
/** `bg-primary/10`; Animated views take styles, not classNames. */
const ACTIVE_TINT = "rgba(234, 88, 12, 0.1)";
const SLIDE = { duration: 280, easing: Easing.out(Easing.cubic) };

/**
 * Index of the open tab. Only a tab's own path counts: a screen opened over the tabs (a new sale at /sales/new, a sheet)
 * keeps the tab that was open, instead of jumping to the one whose path it starts with.
 */
function useActiveTab() {
	const pathname = usePathname();
	const last = useRef(0);
	const index = TABS.findIndex((tab) => tab.href === pathname);
	if (index >= 0) last.current = index;
	return last.current;
}

/** The light-orange pill behind the open tab. It slides to the tab that was tapped. */
function ActiveHighlight({ width }: { width: number }) {
	const active = useActiveTab();
	const inner = width - BORDER * 2 - PAD * 2;
	const tabWidth = (inner - GAP * (TABS.length - 1)) / TABS.length;
	const x = useSharedValue(active * (tabWidth + GAP));
	const [placed, setPlaced] = useState(false);

	useEffect(() => {
		if (tabWidth <= 0) return;
		const target = active * (tabWidth + GAP);
		// The first placement jumps; only real tab changes slide.
		x.value = placed ? withTiming(target, SLIDE) : target;
		setPlaced(true);
	}, [active, tabWidth, placed, x]);

	const style = useAnimatedStyle(() => ({
		transform: [{ translateX: x.value }],
	}));

	if (tabWidth <= 0) return null;
	return (
		<Animated.View
			pointerEvents="none"
			style={[styles.highlight, { width: tabWidth }, style]}
		/>
	);
}

/**
 * Bottom navigation: white bar (thin border) with icon + label for every tab and an orange "+" button next to it that
 * opens the quick actions sheet. Depth comes from color, no shadow.
 */
const styles = StyleSheet.create({
	highlight: {
		position: "absolute",
		top: PAD,
		left: PAD,
		height: 56,
		borderRadius: 28,
		backgroundColor: ACTIVE_TINT,
	},
});

export function TabBar() {
	const insets = useSafeAreaInsets();
	const [actionsOpen, setActionsOpen] = useState(false);
	const [barWidth, setBarWidth] = useState(0);

	return (
		<View
			pointerEvents="box-none"
			className="absolute inset-x-0 bottom-0 flex-row items-center gap-3 px-4"
			// Close to the home indicator, but never touching the screen edge.
			style={{ paddingBottom: Math.max(insets.bottom - 6, 12) }}
		>
			<View
				onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
				className="flex-1 flex-row gap-2 rounded-full border border-border bg-background p-1.5"
			>
				<ActiveHighlight width={barWidth} />
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
