import type { ReactNode } from "react";
import { View } from "react-native";
import { LineSkeleton } from "@/components/skeleton";
import { Text } from "@/components/ui/text";

/**
 * Title of a tab root, inside the scroll content (it scrolls away; `ScreenLayout compactTitle` then shows it in the
 * glass bar). Optional subtitle under it and actions on the right.
 */
export function PageTitle({
	title,
	subtitle,
	subtitleLoading = false,
	right,
}: {
	title: string;
	subtitle?: string;
	/** The subtitle depends on data still loading: a line of skeleton holds its place, so nothing jumps. */
	subtitleLoading?: boolean;
	right?: ReactNode;
}) {
	return (
		<View className="flex-row items-center gap-3 pt-2">
			<View className="flex-1 gap-0.5">
				<Text className="font-sans-semibold text-[26px] leading-tight tracking-tight">
					{title}
				</Text>
				{subtitle ? (
					<Text className="text-muted-foreground text-sm">{subtitle}</Text>
				) : null}
				{!subtitle && subtitleLoading ? (
					<View className="py-1">
						<LineSkeleton className="h-3 w-44" />
					</View>
				) : null}
			</View>
			{right ? <View className="flex-row gap-2">{right}</View> : null}
		</View>
	);
}
