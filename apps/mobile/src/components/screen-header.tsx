import { useRouter } from "expo-router";
import { ArrowLeftIcon } from "phosphor-react-native/src/icons/ArrowLeft";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "@/components/icon-button";
import { Text } from "@/components/ui/text";
import { leaveScreen } from "@/lib/navigation";

const SLOT = "h-11 w-11";

/**
 * Header of every inner screen (the navigator's default header is disabled): back button in a white circle, centered
 * title, optional action on the right. No background of its own, so it sits on the page color. Tab roots don't use it:
 * their title lives in the content (`PageTitle`) and `ScreenLayout compactTitle` shows it on scroll.
 */
export function ScreenHeader({
	title,
	right,
	balanceTitle = false,
}: {
	title: string;
	right?: ReactNode;
	/** `right` holds two buttons: keeps the title centered on the screen. */
	balanceTitle?: boolean;
}) {
	const router = useRouter();
	const insets = useSafeAreaInsets();

	return (
		<View
			className="flex-row items-center gap-3 px-5 pb-3"
			style={{ paddingTop: insets.top + 8 }}
		>
			<IconButton
				icon={ArrowLeftIcon}
				label="Voltar"
				// Opened from a link with nothing behind it: back goes to the home screen.
				onPress={() => leaveScreen(router)}
			/>
			{balanceTitle ? <View className={SLOT} /> : null}
			<Text
				className="flex-1 text-center font-sans-semibold text-base"
				numberOfLines={1}
			>
				{title}
			</Text>
			{right ?? <View className={SLOT} />}
		</View>
	);
}
