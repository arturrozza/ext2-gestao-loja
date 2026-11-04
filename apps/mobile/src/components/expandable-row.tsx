import { ChevronDown } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
	FadeIn,
	FadeOut,
	LinearTransition,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { Icon } from "@/components/ui/icon";

const layoutTransition = LinearTransition.duration(240);

type ExpandableRowProps = { summary: ReactNode; children: ReactNode };

/** Item card (white, thin border) that expands in place to show details. Siblings slide when it opens. */
export function ExpandableRow({ summary, children }: ExpandableRowProps) {
	const [open, setOpen] = useState(false);
	const rotation = useSharedValue(0);
	const chevronStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${rotation.value}deg` }],
	}));

	function toggle() {
		rotation.value = withTiming(open ? 0 : 180, { duration: 240 });
		setOpen(!open);
	}

	return (
		<Animated.View layout={layoutTransition}>
			<View className="overflow-hidden rounded-3xl border border-border bg-background">
				<Pressable
					onPress={toggle}
					accessibilityRole="button"
					accessibilityState={{ expanded: open }}
					className="flex-row items-center gap-3 p-3 active:bg-card"
				>
					<View className="flex-1">{summary}</View>
					<Animated.View style={chevronStyle}>
						<Icon
							as={ChevronDown}
							size={18}
							className="text-muted-foreground"
						/>
					</Animated.View>
				</Pressable>
				{open ? (
					<Animated.View
						entering={FadeIn.duration(220)}
						exiting={FadeOut.duration(140)}
					>
						<View className="px-3 pb-3">{children}</View>
					</Animated.View>
				) : null}
			</View>
		</Animated.View>
	);
}
