import { Pressable, View } from "react-native";
import { Icon, type IconType } from "@/components/ui/icon";
import { hapticTap, withHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type IconButtonProps = {
	icon: IconType;
	label: string;
	onPress?: () => void;
	/** `surface`: white circle on the gray page (back, filter). `primary`: orange circle (add). */
	variant?: "surface" | "primary";
	/** Small dot on the corner, e.g. a filter is on. */
	dot?: boolean;
};

export function IconButton({
	icon,
	label,
	onPress,
	variant = "surface",
	dot = false,
}: IconButtonProps) {
	const primary = variant === "primary";

	return (
		<Pressable
			onPress={withHaptic(hapticTap, onPress)}
			accessibilityRole="button"
			accessibilityLabel={label}
			hitSlop={6}
			className={cn(
				"h-11 w-11 items-center justify-center rounded-full",
				primary
					? "bg-primary active:bg-primary/90"
					: "bg-background active:bg-accent",
			)}
		>
			<Icon
				as={icon}
				size={20}
				className={primary ? "text-primary-foreground" : "text-foreground"}
			/>
			{dot ? (
				<View className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-primary" />
			) : null}
		</Pressable>
	);
}
