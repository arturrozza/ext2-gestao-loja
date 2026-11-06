import { View } from "react-native";
import { ProductThumb } from "@/components/product-thumb";
import { Text } from "@/components/ui/text";
import type { ItemPreview } from "@/queries/products/products.types";

/** Each tile shows this much of itself before the next one covers it. */
const STEP = 12;
const SIDE = 40;
const MAX = 3;
/** Width of three stacked tiles: list rows reserve it, so the text lines up down the list. */
const SLOT = SIDE + STEP * (MAX - 1);

type Tile = { key: string; item: ItemPreview } | { key: string; more: number };

/** Up to three tiles: the products, or two products and a "+N" tile for the rest. */
function tilesOf(items: ItemPreview[], total: number): Tile[] {
	if (total <= MAX) {
		return items.slice(0, MAX).map((item) => ({ key: item.productId, item }));
	}
	return [
		...items.slice(0, MAX - 1).map((item) => ({ key: item.productId, item })),
		{ key: "more", more: total - (MAX - 1) },
	];
}

/** The "+N" tile, a gray square like a thumb, so it reads as part of the pile. */
function MoreTile({ count }: { count: number }) {
	return (
		<View
			className="items-center justify-center rounded-[8px] bg-muted"
			style={{ width: SIDE, height: SIDE }}
		>
			<Text className="font-sans-semibold text-[13px] text-muted-foreground">
				+{count}
			</Text>
		</View>
	);
}

/**
 * The first products of a sale or purchase, overlapping like a small pile, with a "+N" tile when there are more. A white
 * ring separates each tile from the one under it. In a list every row reserves room for three, so the text lines up;
 * with `fit` it takes only the room its tiles need (a single card).
 */
export function ThumbStack({
	items,
	total,
	fit = false,
}: {
	items: ItemPreview[];
	total: number;
	fit?: boolean;
}) {
	const tiles = tilesOf(items, total);

	return (
		<View
			style={{
				width: fit ? SIDE + STEP * Math.max(0, tiles.length - 1) : SLOT,
				height: SIDE,
			}}
		>
			{tiles.map((tile, index) => (
				<View
					key={tile.key}
					className="absolute rounded-[10px] bg-background p-0.5"
					// Earlier thumbs sit on top, like a pile; the "+N" tile goes over everything so its number shows.
					style={{
						left: index * STEP - 2,
						top: -2,
						zIndex: "more" in tile ? MAX + 1 : MAX - index,
					}}
				>
					{"item" in tile ? (
						<ProductThumb
							uri={tile.item.photoUrl}
							name={tile.item.name}
							size="xs"
						/>
					) : (
						<MoreTile count={tile.more} />
					)}
				</View>
			))}
		</View>
	);
}
