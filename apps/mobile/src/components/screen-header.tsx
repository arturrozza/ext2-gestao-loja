import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "@/components/icon-button";
import { Text } from "@/components/ui/text";

type ScreenHeaderProps = {
	title: string;
	/** Tab roots: big left-aligned title, no back button. Inner screens: back + centered title. */
	variant?: "large" | "inner";
	right?: ReactNode;
};

const SLOT = "h-12 w-12";

/** Custom screen header (the navigator's default header is disabled). */
export function ScreenHeader({
	title,
	variant = "inner",
	right,
}: ScreenHeaderProps) {
	const router = useRouter();
	const insets = useSafeAreaInsets();

	if (variant === "large") {
		return (
			<View
				className="flex-row items-end gap-3 bg-background px-5 pb-4"
				style={{ paddingTop: insets.top + 16 }}
			>
				<Text className="flex-1 font-sans-semibold text-3xl leading-tight tracking-tight">
					{title}
				</Text>
				{right}
			</View>
		);
	}

	return (
		<View
			className="flex-row items-center gap-3 bg-background px-5 pb-3"
			style={{ paddingTop: insets.top + 8 }}
		>
			{router.canGoBack() ? (
				<IconButton icon={ArrowLeft} label="Voltar" onPress={router.back} />
			) : (
				<View className={SLOT} />
			)}
			<Text
				className="flex-1 text-center font-sans-semibold text-lg"
				numberOfLines={1}
			>
				{title}
			</Text>
			{right ?? <View className={SLOT} />}
		</View>
	);
}
