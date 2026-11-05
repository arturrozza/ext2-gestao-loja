import { BlurTargetView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { type ComponentRef, type ReactNode, useRef, useState } from "react";
import {
	FlatList,
	KeyboardAvoidingView,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	Platform,
	RefreshControl,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import Animated, {
	interpolate,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompactHeader } from "@/components/compact-header";
import { SheetFrame } from "@/components/sheet-frame";
import { Text } from "@/components/ui/text";
import { DIVIDER, FADE, FADE_MUTED, THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Long, paginated list rendered as a virtualized `FlatList` under the screen content (`children` becomes the list
 * header). Rows are drawn as one white card split by hairlines, like `ListCard`.
 */
export type ScreenList<T> = {
	data: readonly T[];
	keyExtractor: (item: T) => string;
	renderItem: (item: T) => ReactNode;
	/** Load the next page. */
	onEndReached?: () => void;
	/** Pull to refresh: fetch the list again. */
	onRefresh?: () => unknown;
	/**
	 * Splits the rows into titled cards, one per value. Rows of a section must come together. Without it, one card.
	 */
	sectionOf?: (item: T) => string;
	/** Under the rows (e.g. a "loading more" spinner). */
	footer?: ReactNode;
	/** Shown instead of the card when `data` is empty. */
	empty?: ReactNode;
	/** `empty` is a loading skeleton: placed where the rows go instead of centered. */
	loading?: boolean;
};

type ScreenLayoutProps<T> = {
	/** Fixed header. Leave it out when the title lives in the content and `compactTitle` is set. */
	header?: ReactNode;
	children: ReactNode;
	/** Fixed bottom area (form footer). */
	footer?: ReactNode;
	/** `tabs`: leaves room for the floating tab bar and fades content behind it. */
	bottom?: "tabs" | "none";
	contentClassName?: string;
	/** `muted` (default, the home model): light-gray page so white cards stand out. */
	tone?: "default" | "muted";
	/**
	 * Title of the frosted-glass compact bar that appears at the top once the content scrolls (iOS large-title style),
	 * so the user always knows where they are. Content then starts under the status bar.
	 */
	compactTitle?: string;
	/** Long list under the content, virtualized (products, sales...). */
	list?: ScreenList<T>;
	/** Pull to refresh on a screen without `list` (a list brings its own). */
	onRefresh?: () => unknown;
	/**
	 * Shown as a sheet over the previous screen (create and edit forms): a gap at the top, rounded top corners. The route
	 * must be presented as a transparent modal sliding from the bottom (`(app)/_layout.tsx`). Pair with `SheetHeader`.
	 */
	sheet?: boolean;
};

/** Wraps the screen in a `SheetFrame` when it's shown as a sheet. */
function MaybeSheet({
	sheet,
	children,
}: {
	sheet: boolean;
	children: ReactNode;
}) {
	return sheet ? <SheetFrame>{children}</SheetFrame> : children;
}

/**
 * Pull-to-refresh spinner, shown only while the user's own pull is being answered. `top`: room taken by the status bar
 * when the content starts under it, so the Android spinner shows below it (iOS places it with `contentInset`).
 */
function usePullToRefresh(onRefresh: (() => unknown) | undefined, top: number) {
	const [refreshing, setRefreshing] = useState(false);
	if (!onRefresh) return undefined;
	return (
		<RefreshControl
			refreshing={refreshing}
			tintColor={THEME.mutedForeground}
			colors={[THEME.primary]}
			progressViewOffset={top}
			onRefresh={async () => {
				setRefreshing(true);
				try {
					await onRefresh();
				} finally {
					setRefreshing(false);
				}
			}}
		/>
	);
}

function ListRowFrame({
	first,
	last,
	children,
}: {
	first: boolean;
	last: boolean;
	children: ReactNode;
}) {
	return (
		<View className="px-5">
			<View
				className={cn(
					"overflow-hidden bg-background",
					first ? "rounded-t-2xl" : "border-border border-t",
					last && "rounded-b-2xl",
				)}
			>
				{children}
			</View>
		</View>
	);
}

function ListBody<T>({
	list,
	header,
	scrollProps,
}: {
	list: ScreenList<T>;
	header: ReactNode;
	scrollProps: ScrollProps;
}) {
	const refreshControl = usePullToRefresh(
		list.onRefresh,
		scrollProps.contentContainerStyle?.paddingTop ??
			scrollProps.contentInset?.top ??
			0,
	);
	return (
		<FlatList
			refreshControl={refreshControl}
			data={list.data}
			keyExtractor={list.keyExtractor}
			renderItem={({ item, index }) => {
				const section = list.sectionOf?.(item);
				const isNew = (other: T | undefined) =>
					other === undefined || list.sectionOf?.(other) !== section;
				const first = isNew(list.data[index - 1]);
				// The top of the list sits 12px under the content; later sections get more room to read as a new group.
				return (
					<View className={cn(index === 0 && "pt-3")}>
						{section && first ? (
							<Text
								className={cn(
									"px-6 pb-3 font-sans-semibold text-base",
									index > 0 && "pt-5",
								)}
							>
								{section}
							</Text>
						) : null}
						<ListRowFrame first={first} last={isNew(list.data[index + 1])}>
							{list.renderItem(item)}
						</ListRowFrame>
					</View>
				);
			}}
			ListHeaderComponent={<View>{header}</View>}
			ListEmptyComponent={
				list.empty ? (
					<View
						className={
							list.loading ? "px-5 pt-3" : "flex-1 justify-center px-5 pb-24"
						}
					>
						{list.empty}
					</View>
				) : undefined
			}
			ListFooterComponent={list.footer ? <View>{list.footer}</View> : undefined}
			onEndReached={list.onEndReached}
			onEndReachedThreshold={0.5}
			{...scrollProps}
			// No rows: the list fills the screen so the empty state sits in the middle of the space left.
			contentContainerStyle={[
				scrollProps.contentContainerStyle,
				list.data.length === 0 && styles.grow,
			]}
		/>
	);
}

type ScrollProps = {
	keyboardShouldPersistTaps: "handled";
	keyboardDismissMode: "on-drag";
	showsVerticalScrollIndicator: false;
	scrollEventThrottle: number;
	onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
	contentContainerClassName: string;
	contentContainerStyle: { paddingTop: number } | undefined;
	contentInset: { top: number } | undefined;
	contentOffset: { x: number; y: number } | undefined;
};

/**
 * Scroll setup shared by the plain and the list layouts. `topRoom` keeps content clear of the status bar: an inset on
 * iOS (so the pull-to-refresh spinner shows below it), padding elsewhere. `scrollY` stays 0 at the top either way.
 */
function scrollPropsFor(
	topRoom: number,
	withTabs: boolean,
	scrollY: SharedValue<number>,
): ScrollProps {
	const iosInset = Platform.OS === "ios" && topRoom > 0;
	const restOffset = iosInset ? topRoom : 0;
	return {
		keyboardShouldPersistTaps: "handled",
		keyboardDismissMode: "on-drag",
		showsVerticalScrollIndicator: false,
		scrollEventThrottle: 16,
		onScroll: (event) => {
			scrollY.value = event.nativeEvent.contentOffset.y + restOffset;
		},
		contentContainerClassName: withTabs ? "pb-40" : "pb-10",
		contentContainerStyle:
			topRoom > 0 && !iosInset ? { paddingTop: topRoom } : undefined,
		contentInset: iosInset ? { top: topRoom } : undefined,
		contentOffset: iosInset ? { x: 0, y: -topRoom } : undefined,
	};
}

/**
 * Screen shell: header (or a compact glass bar that appears on scroll), scroll content (or a virtualized list), a
 * hairline under a fixed header once scrolled, and a gradient at the bottom so content melts behind the tab bar instead
 * of being cut. Content shows up right away: the stack's slide is the only screen transition. No scroll indicator.
 */
export function ScreenLayout<T = never>({
	header,
	children,
	footer,
	bottom = "none",
	contentClassName,
	tone = "muted",
	compactTitle,
	list,
	onRefresh,
	sheet = false,
}: ScreenLayoutProps<T>) {
	const insets = useSafeAreaInsets();
	// Content that starts under the status bar (compact title) leaves room for it. On iOS that room is a content inset,
	// so the pull-to-refresh spinner appears below the status bar instead of hidden behind it.
	const topRoom = compactTitle ? insets.top : 0;
	const refreshControl = usePullToRefresh(onRefresh, topRoom);
	const blurTarget = useRef<ComponentRef<typeof View>>(null);
	const withTabs = bottom === "tabs";
	// In a sheet the page is white (surfaces swap), so the bottom fade is white too.
	const fade = tone === "muted" && !sheet ? FADE_MUTED : FADE;
	const scrollY = useSharedValue(0);
	// Hairline under a fixed header, shown only once content scrolls beneath it.
	const dividerStyle = useAnimatedStyle(() => ({
		opacity: interpolate(scrollY.value, [0, 24], [0, 1], "clamp"),
	}));

	const scrollProps = scrollPropsFor(topRoom, withTabs, scrollY);
	const content = (
		<View className={cn("gap-6 px-5 pt-2", contentClassName)}>{children}</View>
	);

	// The whole screen (footer included) rises above the keyboard; on Android edge-to-edge the window no longer
	// resizes by itself (Expo keyboard-handling guide).
	return (
		<MaybeSheet sheet={sheet}>
			<KeyboardAvoidingView
				behavior="padding"
				className={cn("flex-1", tone === "muted" ? "bg-card" : "bg-background")}
			>
				{header}
				<View className="flex-1">
					<BlurTargetView ref={blurTarget} style={styles.fill}>
						{list ? (
							<ListBody
								list={list}
								header={content}
								scrollProps={scrollProps}
							/>
						) : (
							<ScrollView {...scrollProps} refreshControl={refreshControl}>
								{content}
							</ScrollView>
						)}
					</BlurTargetView>
					{compactTitle ? (
						<CompactHeader
							title={compactTitle}
							scrollY={scrollY}
							blurTarget={blurTarget}
						/>
					) : (
						<Animated.View
							pointerEvents="none"
							style={[styles.edge, styles.divider, dividerStyle]}
						/>
					)}
					<LinearGradient
						pointerEvents="none"
						colors={[fade.clear, fade.half, fade.solid]}
						locations={withTabs ? [0, 0.35, 0.6] : [0, 0.5, 1]}
						style={[styles.edge, withTabs ? styles.bottomTabs : styles.bottom]}
					/>
				</View>
				{footer}
			</KeyboardAvoidingView>
		</MaybeSheet>
	);
}

const styles = StyleSheet.create({
	fill: { flex: 1 },
	grow: { flexGrow: 1 },
	edge: { position: "absolute", left: 0, right: 0 },
	divider: {
		top: 0,
		height: StyleSheet.hairlineWidth,
		backgroundColor: DIVIDER,
	},
	bottom: { bottom: 0, height: 32 },
	bottomTabs: { bottom: 0, height: 140 },
});
