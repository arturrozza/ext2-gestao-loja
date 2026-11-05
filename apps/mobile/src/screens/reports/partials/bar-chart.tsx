import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { hapticSelect } from "@/lib/haptics";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";

const HEIGHT = 72;
const MIN_BAR = 2;

export type BarPoint = { key: string; label: string; cents: number };

function barTone(cents: number, selected: boolean) {
	if (cents < 0) return selected ? "bg-destructive" : "bg-destructive/40";
	return selected ? "bg-primary" : "bg-primary/25";
}

/** Height (px) above and below the baseline: both sides share one scale, so negatives read at true size. */
function scaleOf(points: BarPoint[]) {
	const top = Math.max(0, ...points.map((point) => point.cents));
	const bottom = Math.max(0, ...points.map((point) => -point.cents));
	const range = top + bottom || 1;
	return {
		// Room for the flat stub of a zero, even when every value is negative.
		up: Math.max(MIN_BAR, (top / range) * HEIGHT),
		pixelsPerCent: (HEIGHT - MIN_BAR) / range,
	};
}

function Bar({
	point,
	selected,
	scale,
}: {
	point: BarPoint;
	selected: boolean;
	scale: ReturnType<typeof scaleOf>;
}) {
	const size = Math.max(MIN_BAR, Math.abs(point.cents) * scale.pixelsPerCent);
	const negative = point.cents < 0;
	const tone = barTone(point.cents, selected);
	return (
		<View className="flex-1" style={{ height: HEIGHT }}>
			<View style={{ height: scale.up }} className="justify-end">
				{negative ? null : (
					<View
						style={{ height: size }}
						className={cn("rounded-t-[4px]", tone)}
					/>
				)}
			</View>
			{negative ? (
				<View
					style={{ height: size }}
					className={cn("rounded-b-[4px]", tone)}
				/>
			) : null}
		</View>
	);
}

/**
 * Small one-measure bar chart (one hue, no axis, one scale). The whole plot is one touch target: bars are too thin to
 * hit one by one, so a tap picks the bar under the finger and its value shows above. Losses go below the baseline in
 * red. `selectedKey` lives outside so sibling charts show the same period.
 */
export function BarChart({
	title,
	points,
	selectedKey,
	onSelect,
}: {
	title: string;
	points: BarPoint[];
	selectedKey: string | null;
	onSelect: (key: string) => void;
}) {
	const [width, setWidth] = useState(0);
	const selected =
		points.find((point) => point.key === selectedKey) ?? points.at(-1);
	const scale = scaleOf(points);

	return (
		<View className="gap-3">
			<View className="flex-row items-baseline justify-between gap-3">
				<Text className="font-sans-medium text-muted-foreground text-sm">
					{title}
				</Text>
				{selected ? (
					<Text className="font-sans-semibold text-sm">
						{selected.label} · {formatCents(selected.cents)}
					</Text>
				) : null}
			</View>
			<Pressable
				accessibilityLabel={`${title}: ${points
					.map((point) => `${point.label}, ${formatCents(point.cents)}`)
					.join("; ")}`}
				onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
				onPress={(event) => {
					const index = Math.floor(
						(event.nativeEvent.locationX / (width || 1)) * points.length,
					);
					const point = points[Math.min(points.length - 1, Math.max(0, index))];
					if (!point) return;
					hapticSelect();
					onSelect(point.key);
				}}
			>
				{/* The bars don't take touches, so `locationX` is always relative to the whole plot. */}
				<View pointerEvents="none" className="flex-row gap-0.5">
					{points.map((point) => (
						<Bar
							key={point.key}
							point={point}
							selected={point.key === selected?.key}
							scale={scale}
						/>
					))}
				</View>
			</Pressable>
			<View className="flex-row justify-between">
				<Text className="text-[10px] text-muted-foreground">
					{points[0]?.label}
				</Text>
				<Text className="text-[10px] text-muted-foreground">
					{points.at(-1)?.label}
				</Text>
			</View>
		</View>
	);
}
