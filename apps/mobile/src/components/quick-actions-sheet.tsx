import { type Href, useRouter } from "expo-router";
import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { ShoppingBagIcon } from "phosphor-react-native/src/icons/ShoppingBag";
import { TagIcon } from "phosphor-react-native/src/icons/Tag";
import { TruckIcon } from "phosphor-react-native/src/icons/Truck";
import { UserPlusIcon } from "phosphor-react-native/src/icons/UserPlus";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { Icon, type IconType } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticTap } from "@/lib/haptics";
import { comingSoonHref } from "@/lib/mock-routes";
import { BACKDROP } from "@/lib/theme";

type QuickAction = {
	title: string;
	subtitle: string;
	icon: IconType;
	href: Href;
};

const ACTIONS: QuickAction[] = [
	{
		title: "Nova venda",
		subtitle: "Registrar uma venda",
		icon: ShoppingBagIcon,
		href: "/mock/new-sale",
	},
	{
		title: "Nova compra",
		subtitle: "Dar entrada em mercadoria",
		icon: TruckIcon,
		href: "/mock/new-purchase",
	},
	{
		title: "Novo produto",
		subtitle: "Cadastrar no catálogo",
		icon: TagIcon,
		href: "/mock/new-product",
	},
	{
		title: "Novo cliente",
		subtitle: "Cadastrar um cliente fixo",
		icon: UserPlusIcon,
		href: comingSoonHref("Clientes"),
	},
];

const OPEN = { duration: 320, easing: Easing.out(Easing.cubic) };
const CLOSE = { duration: 220, easing: Easing.in(Easing.cubic) };

/**
 * Drives the sheet: slides it up from below the screen on open and back down on close, then unmounts the modal.
 * The backdrop dims along with it; the sheet itself never fades.
 */
function useSheetAnimation(open: boolean) {
	const [mounted, setMounted] = useState(open);
	const progress = useSharedValue(0);
	// Starts off-screen until the sheet is measured.
	const height = useSharedValue(1000);

	useEffect(() => {
		if (open) {
			setMounted(true);
			progress.value = withTiming(1, OPEN);
			return;
		}
		progress.value = withTiming(0, CLOSE, (finished) => {
			if (finished) scheduleOnRN(setMounted, false);
		});
	}, [open, progress]);

	const sheetStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: (1 - progress.value) * height.value }],
	}));
	const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

	return { mounted, height, sheetStyle, backdropStyle };
}

function ActionRow({
	action,
	onPress,
}: {
	action: QuickAction;
	onPress: () => void;
}) {
	return (
		<Pressable
			onPressIn={hapticTap}
			accessibilityRole="button"
			onPress={onPress}
			className="flex-row items-center gap-4 rounded-2xl px-3 py-3.5 active:bg-card"
		>
			<Icon as={action.icon} size={22} className="text-foreground/50" />
			<View className="flex-1 gap-0.5">
				<Text className="font-sans-semibold text-sm">{action.title}</Text>
				<Text className="text-muted-foreground text-xs">{action.subtitle}</Text>
			</View>
			<Icon as={CaretRightIcon} size={18} className="text-foreground/45" />
		</Pressable>
	);
}

/** Bottom sheet opened by the "+" button: every "create something" action in one place. Slides up from the bottom. */
export function QuickActionsSheet({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { mounted, height, sheetStyle, backdropStyle } =
		useSheetAnimation(open);

	const go = (href: Href) => {
		onClose();
		router.push(href);
	};

	return (
		<Modal
			visible={mounted}
			transparent
			animationType="none"
			statusBarTranslucent
			onRequestClose={onClose}
		>
			<View className="flex-1 justify-end">
				<Animated.View
					style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
				>
					<Pressable
						accessibilityLabel="Fechar"
						onPress={onClose}
						className="flex-1"
					/>
				</Animated.View>
				<Animated.View
					style={sheetStyle}
					onLayout={(event) => {
						height.value = event.nativeEvent.layout.height;
					}}
				>
					<View
						className="gap-1 rounded-t-3xl bg-background px-3 pt-3"
						style={{ paddingBottom: insets.bottom + 12 }}
					>
						<View className="mb-2 h-1 w-10 self-center rounded-full bg-border" />
						<Text className="px-3 pb-1 font-sans-semibold text-base">
							O que você quer fazer?
						</Text>
						{ACTIONS.map((action) => (
							<ActionRow
								key={action.title}
								action={action}
								onPress={() => go(action.href)}
							/>
						))}
					</View>
				</Animated.View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({ backdrop: { backgroundColor: BACKDROP } });
