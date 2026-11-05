import { type Href, Link } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { hapticTap, withHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type Tone = "muted" | "success" | "danger" | "highlight";

const TONES: Record<Tone, string> = {
	muted: "text-muted-foreground",
	success: "text-success",
	danger: "text-destructive",
	/** Needs attention, not urgent: low stock, about to expire. */
	highlight: "text-primary",
};

/** Right side: the value and its note; a canceled row crosses the value out and says so. */
function RowValue({
	value,
	valueTone,
	note,
	noteTone,
	struck,
}: {
	value?: string;
	valueTone?: Tone;
	note?: string;
	noteTone: Tone;
	struck: boolean;
}) {
	if (!value && !note) return null;
	const shownNote = struck ? "cancelada" : note;
	return (
		<View className="items-end gap-1">
			{value ? (
				<Text
					className={cn(
						"font-sans-semibold text-[15px]",
						valueTone && TONES[valueTone],
						struck && "font-sans-medium text-muted-foreground line-through",
					)}
				>
					{value}
				</Text>
			) : null}
			{shownNote ? (
				<Text className={cn("text-[11px]", TONES[struck ? "muted" : noteTone])}>
					{shownNote}
				</Text>
			) : null}
		</View>
	);
}

/**
 * The one row of the app's item lists (sales, purchases, products, the items of a sale): a thumb or thumb stack, a
 * title with a line under it, and on the right a value with a small note. `struck`: canceled, crossed out and faded.
 */
export function ItemRow({
	href,
	onPress,
	label,
	leading,
	title,
	subtitle,
	value,
	valueTone,
	note,
	noteTone = "muted",
	struck = false,
	children,
}: {
	/** Where the row leads. Without it, `onPress` (a row in a picker). */
	href?: Href;
	onPress?: () => void;
	/** What a screen reader says for the whole row. */
	label: string;
	leading: ReactNode;
	title: string;
	subtitle?: string;
	value?: string;
	valueTone?: Tone;
	note?: string;
	noteTone?: Tone;
	struck?: boolean;
	/** Under the subtitle (status pills). */
	children?: ReactNode;
}) {
	const row = (
		<Pressable
			onPress={withHaptic(hapticTap, onPress)}
			accessibilityRole="button"
			accessibilityLabel={label}
			className="flex-row items-center gap-3.5 px-4 py-4 active:bg-card"
		>
			<View className={cn(struck && "opacity-40")}>{leading}</View>
			<View className="flex-1 gap-1">
				<Text
					className={cn(
						"font-sans-semibold text-[15px]",
						struck && "text-muted-foreground line-through",
					)}
					numberOfLines={1}
				>
					{title}
				</Text>
				{subtitle ? (
					<Text className="text-muted-foreground text-xs" numberOfLines={1}>
						{subtitle}
					</Text>
				) : null}
				{children}
			</View>
			<RowValue
				value={value}
				valueTone={valueTone}
				note={note}
				noteTone={noteTone}
				struck={struck}
			/>
		</Pressable>
	);
	return href ? (
		<Link href={href} asChild>
			{row}
		</Link>
	) : (
		row
	);
}
