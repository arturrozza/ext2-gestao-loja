import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { WhatsappLogoIcon } from "phosphor-react-native/src/icons/WhatsappLogo";
import { Pressable } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticTap, withHaptic } from "@/lib/haptics";
import { openWhatsApp } from "@/lib/whatsapp";

/** Action row in its own white card: opens the WhatsApp chat with the customer's saved phone (clientes.md). */
export function WhatsAppLink({ phone }: { phone: string }) {
	return (
		<Pressable
			onPress={withHaptic(hapticTap, () => openWhatsApp(phone))}
			accessibilityRole="button"
			className="flex-row items-center gap-3 rounded-2xl bg-background px-4 py-4 active:bg-accent"
		>
			<Icon as={WhatsappLogoIcon} size={22} className="text-foreground/50" />
			<Text className="flex-1 font-sans-semibold text-sm">
				Conversar no WhatsApp
			</Text>
			<Icon as={CaretRightIcon} size={18} className="text-foreground/45" />
		</Pressable>
	);
}
