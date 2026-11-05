import { CircleNotchIcon } from "phosphor-react-native/src/icons/CircleNotch";
import { useEffect } from "react";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { Icon } from "@/components/ui/icon";

const TURN_MS = 800;

/** Small spinning ring for work in progress inside a control. Screens and lists load with skeletons instead. */
export function Spinner({
	size = 20,
	className,
}: {
	size?: number;
	className?: string;
}) {
	const turn = useSharedValue(0);

	useEffect(() => {
		turn.value = withRepeat(
			withTiming(360, { duration: TURN_MS, easing: Easing.linear }),
			-1,
			false,
		);
		return () => cancelAnimation(turn);
	}, [turn]);

	const style = useAnimatedStyle(() => ({
		transform: [{ rotate: `${turn.value}deg` }],
	}));

	return (
		<Animated.View style={style} accessibilityLabel="Carregando">
			<Icon
				as={CircleNotchIcon}
				weight="bold"
				size={size}
				className={className}
			/>
		</Animated.View>
	);
}
