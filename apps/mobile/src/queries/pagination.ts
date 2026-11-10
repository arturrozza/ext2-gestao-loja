/** One page of a long list (products, sales...). `nextCursor` is `null` on the last page. */
export type Page<T> = {
	items: T[];
	nextCursor: number | null;
	/** Rows matching the filters, across all pages. */
	total: number;
};

export function flattenPages<T>(pages: Page<T>[] | undefined): T[] {
	return pages?.flatMap((page) => page.items) ?? [];
}

/** The options every paginated `useInfiniteQuery` shares: cursor from the API, starting at 0. */
export function pagedQuery<P extends { nextCursor: number | null }>(
	fetchPage: (cursor: number) => Promise<P>,
) {
	return {
		queryFn: ({ pageParam }: { pageParam: number }) => fetchPage(pageParam),
		initialPageParam: 0,
		getNextPageParam: (page: P) => page.nextCursor,
	};
}
