import { View } from "react-native";
import { cn } from "@/lib/utils";

/** A soft radio: a light ring, or an orange ring with a dot when chosen. */
export function Radio({ on }: { on: boolean }) {
	return (
		<View
			className={cn(
				"h-[26px] w-[26px] items-center justify-center rounded-full border-[1.5px]",
				on ? "border-primary" : "border-foreground/20",
			)}
		>
			{on ? <View className="h-3 w-3 rounded-full bg-primary" /> : null}
		</View>
	);
}
