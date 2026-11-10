import { type Href, Link } from "expo-router";
import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { Children, isValidElement, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Icon, type IconType } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticTap, withHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/** White card holding a list of rows split by hairlines, with an optional section title above it. */
export function ListCard({
	title,
	action,
	children,
}: {
	title?: string;
	/** Small control on the right of the title (e.g. "Ver todas"). */
	action?: ReactNode;
	children: ReactNode;
}) {
	const rows = Children.toArray(children).filter(isValidElement);

	return (
		<View className="gap-3">
			{title ? (
				<View className="flex-row items-center justify-between px-1">
					<Text className="font-sans-semibold text-base">{title}</Text>
					{action}
				</View>
			) : null}
			<View className="overflow-hidden rounded-2xl bg-background">
				{rows.map((row, index) => (
					<View
						key={row.key}
						className={cn(index > 0 && "border-border border-t")}
					>
						{row}
					</View>
				))}
			</View>
		</View>
	);
}

type ListRowProps = {
	title: string;
	subtitle?: string;
	/** Loose gray icon on the left (no tile). */
	icon?: IconType;
	right?: ReactNode;
	/** Extra line(s) under the subtitle. */
	children?: ReactNode;
	href?: Href;
	onPress?: () => void;
	muted?: boolean;
	/** The height and text size of an `InfoRow`, for action rows that share a card with them. */
	dense?: boolean;
};

function RowBody({
	title,
	subtitle,
	icon,
	right,
	children,
	muted,
	dense,
	pressable,
}: ListRowProps & { pressable: boolean }) {
	return (
		<>
			{icon ? (
				<Icon as={icon} size={20} className="text-foreground/50" />
			) : null}
			<View className="flex-1 gap-1">
				<Text
					className={cn(
						dense
							? "font-sans-medium text-sm"
							: "font-sans-semibold text-[15px]",
						muted && "text-muted-foreground",
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
			{right}
			{pressable ? (
				<Icon as={CaretRightIcon} size={16} className="text-foreground/45" />
			) : null}
		</>
	);
}

const ROW = "flex-row items-center gap-3 px-4 py-4";
const DENSE_ROW = "flex-row items-center gap-3 px-4 py-3";

/** Row of a `ListCard`. With `href` or `onPress` it's tappable and gets a chevron. */
export function ListRow(props: ListRowProps) {
	const { href, onPress, title, dense } = props;
	const row = dense ? DENSE_ROW : ROW;

	if (href) {
		return (
			<Link href={href} asChild>
				<Pressable
					onPress={hapticTap}
					accessibilityRole="button"
					accessibilityLabel={title}
					className={cn(row, "active:bg-card")}
				>
					<RowBody {...props} pressable />
				</Pressable>
			</Link>
		);
	}
	if (onPress) {
		return (
			<Pressable
				onPress={withHaptic(hapticTap, onPress)}
				accessibilityRole="button"
				accessibilityLabel={title}
				className={cn(row, "active:bg-card")}
			>
				<RowBody {...props} pressable />
			</Pressable>
		);
	}
	return (
		<View className={row}>
			<RowBody {...props} pressable={false} />
		</View>
	);
}
