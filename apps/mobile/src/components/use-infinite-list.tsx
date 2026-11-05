import type { ReactNode } from "react";
import { View } from "react-native";
import { ErrorState } from "@/components/query-states";
import { RowsSkeleton, type SkeletonLeading } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { flattenPages, type Page } from "@/queries/pagination";

type InfiniteListQuery<T> = {
	data: { pages: Page<T>[] } | undefined;
	error: unknown;
	isPending: boolean;
	isError: boolean;
	isPlaceholderData: boolean;
	isFetchingNextPage: boolean;
	isFetchNextPageError: boolean;
	hasNextPage: boolean;
	refetch: () => unknown;
	fetchNextPage: () => unknown;
};

/**
 * What a virtualized list needs from a paginated query: the rows, next-page loading (with a retry when a page fails)
 * and the slot shown while there are no rows: a skeleton, error or `empty`. `leading`: what the rows have at their left, so the skeleton matches. Fits
 * `ScreenList` and a plain `FlatList`.
 */
export function useInfiniteList<T>(
	query: InfiniteListQuery<T>,
	empty: ReactNode,
	{ leading = "none" }: { leading?: SkeletonLeading } = {},
) {
	function emptySlot() {
		if (query.isPending) return <RowsSkeleton leading={leading} />;
		if (query.isError && !query.data) {
			return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
		}
		return empty;
	}

	function footer() {
		if (query.isFetchingNextPage) {
			return (
				<View className="px-5 pt-2">
					<RowsSkeleton rows={2} leading={leading} />
				</View>
			);
		}
		if (!query.isFetchNextPageError) return null;
		return (
			<View className="items-center gap-2 px-5 py-4">
				<Text className="text-muted-foreground text-sm">
					Não deu para carregar mais.
				</Text>
				<Button
					size="sm"
					variant="outline"
					onPress={() => query.fetchNextPage()}
				>
					<Text>Tentar de novo</Text>
				</Button>
			</View>
		);
	}

	return {
		data: flattenPages(query.data?.pages),
		onEndReached: () => {
			const canLoad =
				query.hasNextPage &&
				!query.isFetchingNextPage &&
				!query.isFetchNextPageError &&
				!query.isPlaceholderData;
			if (canLoad) query.fetchNextPage();
		},
		onRefresh: () => query.refetch(),
		footer: footer(),
		empty: emptySlot(),
		/** The empty slot holds a skeleton: it goes where the rows go, not in the middle of the screen. */
		loading: query.isPending,
	};
}
