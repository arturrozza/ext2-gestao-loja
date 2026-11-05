import { type ReactNode, useEffect } from "react";
import { View } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/utils";

const PULSE = { duration: 700, easing: Easing.inOut(Easing.ease) };
const PULSE_LOW = 0.45;

/** Everything inside breathes together, so a whole skeleton needs one animation and never looks out of step. */
function Pulse({ children }: { children: ReactNode }) {
	const opacity = useSharedValue(1);

	useEffect(() => {
		opacity.value = withRepeat(withTiming(PULSE_LOW, PULSE), -1, true);
		return () => cancelAnimation(opacity);
	}, [opacity]);

	const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

	return (
		<Animated.View
			style={style}
			// Fade the skeleton as one picture: overlapping pieces must not show through each other.
			needsOffscreenAlphaCompositing
			accessible
			accessibilityLabel="Carregando"
			accessibilityRole="progressbar"
		>
			{children}
		</Animated.View>
	);
}

function Bone({ className }: { className: string }) {
	return <View className={cn("rounded-[4px] bg-foreground/10", className)} />;
}

/** What sits at the left of a real row: a product thumb, a stack of three, or nothing. */
export type SkeletonLeading = "none" | "thumb" | "stack";

function Leading({ kind }: { kind: SkeletonLeading }) {
	if (kind === "thumb") return <Bone className="h-12 w-12 rounded-[8px]" />;
	if (kind === "none") return null;
	// Same footprint as `ThumbStack`: three 40px tiles, 12px apart.
	return (
		<View className="h-10 w-16">
			{[0, 1, 2].map((index) => (
				<View
					key={index}
					className="absolute h-10 w-10 rounded-[8px] border-2 border-background bg-muted"
					style={{ left: index * 12 }}
				/>
			))}
		</View>
	);
}

function Row({ leading, index }: { leading: SkeletonLeading; index: number }) {
	return (
		<View
			className={cn(
				"flex-row items-center gap-3.5 px-4 py-4",
				index > 0 && "border-border border-t",
			)}
		>
			<Leading kind={leading} />
			<View className="flex-1 gap-2">
				<Bone className={cn("h-3.5", index % 2 === 0 ? "w-3/5" : "w-1/2")} />
				<Bone className={cn("h-2.5", index % 2 === 0 ? "w-2/5" : "w-1/3")} />
			</View>
			<View className="items-end gap-2">
				<Bone className="h-3.5 w-14" />
				<Bone className="h-2.5 w-10" />
			</View>
		</View>
	);
}

/** One line of text loading (a subtitle under a title). */
export function LineSkeleton({ className }: { className: string }) {
	return (
		<Pulse>
			<Bone className={className} />
		</Pulse>
	);
}

/** The sales totals card loading: two big numbers side by side, each with its label and note. */
export function FiguresSkeleton() {
	return (
		<Pulse>
			<View className="flex-row rounded-2xl bg-background p-5">
				{[0, 1].map((index) => (
					<View key={index} className="flex-row flex-1">
						{index === 1 ? <View className="mx-5 w-px bg-border" /> : null}
						<View className="flex-1 gap-2.5">
							<Bone className="h-2.5 w-14" />
							<Bone className="h-6 w-28" />
							<Bone className="h-2.5 w-20" />
						</View>
					</View>
				))}
			</View>
		</Pulse>
	);
}

/** A list loading: rows in one white card, shaped like the real ones (`leading`: what sits at their left). */
export function RowsSkeleton({
	rows = 7,
	leading = "none",
}: {
	rows?: number;
	leading?: SkeletonLeading;
}) {
	return (
		<Pulse>
			<View className="overflow-hidden rounded-2xl bg-background">
				{Array.from({ length: rows }, (_, index) => (
					// The rows never reorder and have no identity of their own.
					// biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows.
					<Row key={index} leading={leading} index={index} />
				))}
			</View>
		</Pulse>
	);
}

function InfoLine({ index }: { index: number }) {
	return (
		<View className="flex-row items-center justify-between px-4 py-3.5">
			<Bone className={cn("h-3", index % 2 === 0 ? "w-24" : "w-20")} />
			<Bone className={cn("h-3", index % 2 === 0 ? "w-16" : "w-20")} />
		</View>
	);
}

/** A detail screen loading: the top card with its big number, then a titled card of rows. */
export function DetailSkeleton() {
	return (
		<Pulse>
			<View className="gap-7">
				<View className="overflow-hidden rounded-2xl bg-background">
					<View className="gap-3 p-5 pb-3">
						<Bone className="h-3.5 w-24" />
						<Bone className="h-8 w-40" />
					</View>
					{[0, 1, 2].map((index) => (
						<InfoLine key={index} index={index} />
					))}
				</View>
				<View className="gap-3">
					<Bone className="ml-1 h-4 w-28" />
					<View className="overflow-hidden rounded-2xl bg-background">
						{[0, 1, 2, 3].map((index) => (
							<InfoLine key={index} index={index} />
						))}
					</View>
				</View>
			</View>
		</Pulse>
	);
}

/** A form loading its data: labels and fields straight on the page, no card. */
export function FormSkeleton() {
	return (
		<Pulse>
			<View className="gap-4">
				{[0, 1, 2, 3].map((index) => (
					<View key={index} className="gap-2">
						<Bone
							className={cn("ml-1 h-3", index % 2 === 0 ? "w-24" : "w-32")}
						/>
						<Bone className="h-12 w-full rounded-[8px]" />
					</View>
				))}
			</View>
		</Pulse>
	);
}

/** The home summary card loading: big number, week bars and the three small numbers. */
export function SummarySkeleton() {
	return (
		<Pulse>
			<View className="gap-5 rounded-2xl bg-background p-5">
				<View className="gap-3">
					<Bone className="h-3.5 w-32" />
					<Bone className="h-8 w-40" />
					<Bone className="h-3 w-44" />
				</View>
				<View className="h-14 flex-row items-end gap-2">
					{["h-6", "h-10", "h-3", "h-8", "h-5", "h-12", "h-4"].map((height) => (
						<Bone key={height} className={cn("flex-1", height)} />
					))}
				</View>
				<View className="flex-row gap-4 border-border border-t pt-4">
					{[0, 1, 2].map((index) => (
						<View key={index} className="flex-1 gap-2">
							<Bone className="h-2.5 w-14" />
							<Bone className="h-4 w-16" />
						</View>
					))}
				</View>
			</View>
		</Pulse>
	);
}
