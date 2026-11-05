import { t } from "elysia";

/** Optional free text: `null`, or a string up to `maxLength` (a blank one is saved as `null` by the rules). */
export const optionalText = (maxLength: number) =>
	t.Union([t.Null(), t.String({ maxLength })]);

/** 0 to 100 with at most two decimals, as a decimal string ("12.5"), like the app's `percentField` sends. */
export const percentField = t.String({
	pattern: "^(100(\\.0{1,2})?|\\d{1,2}(\\.\\d{1,2})?)$",
});
