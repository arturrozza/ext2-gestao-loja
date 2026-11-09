import { type Href, useRouter } from "expo-router";
import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { ShoppingBagIcon } from "phosphor-react-native/src/icons/ShoppingBag";
import { TagIcon } from "phosphor-react-native/src/icons/Tag";
import { TruckIcon } from "phosphor-react-native/src/icons/Truck";
import { UserPlusIcon } from "phosphor-react-native/src/icons/UserPlus";
import { Pressable, View } from "react-native";
import { BottomSheet } from "@/components/bottom-sheet";
import { Icon, type IconType } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { UnderConstructionTag } from "@/components/under-construction";
import { hapticTap, withHaptic } from "@/lib/haptics";

type QuickAction = {
	title: string;
	subtitle: string;
	icon: IconType;
	href: Href;
	/** The module isn't built yet: the row says so and its screen too. */
	underConstruction?: boolean;
};

const ACTIONS: QuickAction[] = [
	{
		title: "Nova venda",
		subtitle: "Registrar uma venda",
		icon: ShoppingBagIcon,
		href: "/sales/new",
		underConstruction: true,
	},
	{
		title: "Nova compra",
		subtitle: "Dar entrada em mercadoria",
		icon: TruckIcon,
		href: "/purchases/new",
	},
	{
		title: "Novo produto",
		subtitle: "Cadastrar no catálogo",
		icon: TagIcon,
		href: "/products/new",
	},
	{
		title: "Novo cliente",
		subtitle: "Cadastrar um cliente fixo",
		icon: UserPlusIcon,
		href: "/customers/new",
		underConstruction: true,
	},
];

function ActionRow({
	action,
	onPress,
}: {
	action: QuickAction;
	onPress: () => void;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={withHaptic(hapticTap, onPress)}
			className="flex-row items-center gap-4 rounded-xl px-3 py-3.5 active:bg-card"
		>
			<Icon as={action.icon} size={22} className="text-foreground/50" />
			<View className="flex-1 gap-0.5">
				<Text className="font-sans-semibold text-sm">{action.title}</Text>
				{action.underConstruction ? (
					<UnderConstructionTag />
				) : (
					<Text className="text-muted-foreground text-xs">
						{action.subtitle}
					</Text>
				)}
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

	const go = (href: Href) => {
		onClose();
		router.push(href);
	};

	return (
		<BottomSheet open={open} onClose={onClose} title="O que você quer fazer?">
			{ACTIONS.map((action) => (
				<ActionRow
					key={action.title}
					action={action}
					onPress={() => go(action.href)}
				/>
			))}
		</BottomSheet>
	);
}
