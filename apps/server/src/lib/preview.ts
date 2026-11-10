import { t, type UnwrapSchema } from "elysia";

/** How many products a purchase or sale row shows as thumbs. */
const PREVIEW_SIZE = 3;

/** A product shown as a thumb in a purchase or sale row. */
export const previewField = t.Object({
	productId: t.String(),
	name: t.String(),
	photoUrl: t.Union([t.Null(), t.String()]),
});

export type Preview = UnwrapSchema<typeof previewField>;

/** The distinct products of some lines, in the order entered: how many, and the first ones for the thumbs. */
export function previewOf(
	lines: { productId: string; productName: string; photoUrl: string | null }[],
): { productCount: number; preview: Preview[] } {
	const byId = new Map<string, Preview>();
	for (const line of lines) {
		if (!byId.has(line.productId)) {
			byId.set(line.productId, {
				productId: line.productId,
				name: line.productName,
				photoUrl: line.photoUrl,
			});
		}
	}
	return {
		productCount: byId.size,
		preview: [...byId.values()].slice(0, PREVIEW_SIZE),
	};
}
