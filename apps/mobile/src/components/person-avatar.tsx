import { View } from "react-native";
import { tintOf } from "@/components/product-thumb";
import { Text } from "@/components/ui/text";
import { initials } from "@/lib/masks";

/** A customer or reseller: their initials on a soft tint, round (products are square). */
export function PersonAvatar({ name }: { name: string }) {
	const [background, color] = tintOf(name);
	return (
		<View
			className="h-12 w-12 items-center justify-center rounded-full"
			style={{ backgroundColor: background }}
		>
			<Text className="font-sans-semibold text-[15px]" style={{ color }}>
				{initials(name)}
			</Text>
		</View>
	);
}
