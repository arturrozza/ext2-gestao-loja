/** One page of a long list (products, sales...). `nextCursor` is `null` on the last page. */
export type Page<T> = {
	items: T[];
	nextCursor: number | null;
	/** Rows matching the filters, across all pages. */
	total: number;
};

export const PAGE_SIZE = 30;

/** Slices `rows` into the page that starts at `cursor`. */
export function paginate<T>(rows: T[], cursor: number): Page<T> {
	const end = cursor + PAGE_SIZE;
	return {
		items: rows.slice(cursor, end),
		nextCursor: end < rows.length ? end : null,
		total: rows.length,
	};
}

/** All loaded rows of an infinite query, in order. */
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
