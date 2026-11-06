import { Image } from "expo-image";
import { PackageIcon } from "phosphor-react-native/src/icons/Package";
import { View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { initials } from "@/lib/masks";

/** Rows sit 16px inside a 16px card, so the nested-radius sum gives 0: the 8px minimum applies. */
const SIZES = {
	xs: { side: 40, radius: 8, font: 13, icon: 20 },
	sm: { side: 48, radius: 8, font: 15, icon: 24 },
	lg: { side: 72, radius: 14, font: 22, icon: 34 },
} as const;

/** Soft tints (background, text) for products without a photo. The same name always gets the same one. */
const TINTS = [
	["hsl(22 90% 94%)", "hsl(20 75% 38%)"],
	["hsl(345 70% 94%)", "hsl(345 50% 40%)"],
	["hsl(40 85% 92%)", "hsl(35 70% 32%)"],
	["hsl(150 35% 91%)", "hsl(150 35% 30%)"],
	["hsl(205 60% 93%)", "hsl(205 45% 36%)"],
	["hsl(265 45% 94%)", "hsl(265 30% 42%)"],
] as const;

export function tintOf(name: string) {
	let hash = 0;
	for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	return TINTS[hash % TINTS.length] ?? TINTS[0];
}

/**
 * Product photo. Without one, a tinted square with the product's initials stands in, so a list still reads like a
 * catalog (docs/product/produtos.md). Without a name either (a new product), the package icon on a neutral square.
 */
export function ProductThumb({
	uri,
	name,
	size = "sm",
}: {
	/** The photo: its public address, or a local file while a form holds a new one. */
	uri?: string | null;
	name?: string;
	size?: keyof typeof SIZES;
}) {
	const { side, radius, font, icon } = SIZES[size];
	if (uri) {
		return (
			<Image
				source={{ uri }}
				style={{ width: side, height: side, borderRadius: radius }}
				contentFit="cover"
				accessibilityIgnoresInvertColors
			/>
		);
	}
	const label = name ? initials(name) : "";
	const [background, color] = label ? tintOf(name ?? "") : ["", ""];
	return (
		<View
			className={label ? undefined : "bg-card"}
			style={{
				width: side,
				height: side,
				borderRadius: radius,
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: label ? background : undefined,
			}}
		>
			{label ? (
				<Text className="font-sans-semibold" style={{ color, fontSize: font }}>
					{label}
				</Text>
			) : (
				<Icon as={PackageIcon} size={icon} className="text-foreground/40" />
			)}
		</View>
	);
}
