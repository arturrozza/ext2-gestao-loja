import { Pressable } from "react-native";
import { Icon, type IconType } from "@/components/ui/icon";
import { hapticTap, withHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type IconButtonProps = {
	icon: IconType;
	label: string;
	onPress?: () => void;
	/** `surface`: light-gray tile (back, more). `primary`: orange tile (filter, add). */
	variant?: "surface" | "primary";
};

/** Square rounded icon-only button, like the back / filter / "more" tiles of the reference. */
export function IconButton({
	icon,
	label,
	onPress,
	variant = "surface",
}: IconButtonProps) {
	const primary = variant === "primary";

	return (
		<Pressable
			onPress={withHaptic(hapticTap, onPress)}
			accessibilityRole="button"
			accessibilityLabel={label}
			hitSlop={6}
			className={cn(
				"h-12 w-12 items-center justify-center rounded-full",
				primary
					? "bg-primary active:bg-primary/90"
					: "bg-card active:bg-accent",
			)}
		>
			<Icon
				as={icon}
				size={20}
				className={primary ? "text-primary-foreground" : "text-foreground"}
			/>
		</Pressable>
	);
}
