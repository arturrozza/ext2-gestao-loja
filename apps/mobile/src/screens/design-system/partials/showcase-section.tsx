import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

export function ShowcaseSection({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<View className="gap-3">
			<Text variant="h4">{title}</Text>
			{children}
		</View>
	);
}
