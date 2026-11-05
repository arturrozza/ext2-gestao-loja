import { type TSchema, t } from "elysia";

/** Rows per page of the long lists (the app's `PAGE_SIZE`). */
export const PAGE_SIZE = 30;

/** Query of a paginated list: the offset where the page starts. */
export const cursorQuery = t.Optional(
	t.Integer({ minimum: 0, maximum: 1_000_000 }),
);

/** One page of a list, as the app's `Page<T>`: `nextCursor` is `null` on the last page, `total` counts every page. */
export const pageOf = <T extends TSchema>(item: T) =>
	t.Object({
		items: t.Array(item),
		nextCursor: t.Union([t.Null(), t.Integer()]),
		total: t.Integer(),
	});

/** Where the page after the one starting at `cursor` starts, or `null` when that was the last. */
export function nextCursor(cursor: number, total: number): number | null {
	const next = cursor + PAGE_SIZE;
	return next < total ? next : null;
}
