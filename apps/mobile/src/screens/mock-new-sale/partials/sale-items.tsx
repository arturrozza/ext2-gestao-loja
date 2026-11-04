import { MinusIcon } from "phosphor-react-native/src/icons/Minus";
import { PlusIcon } from "phosphor-react-native/src/icons/Plus";
import { SparkleIcon } from "phosphor-react-native/src/icons/Sparkle";
import { TrashIcon } from "phosphor-react-native/src/icons/Trash";
import { XIcon } from "phosphor-react-native/src/icons/X";
import { useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
	FadeIn,
	FadeOut,
	LinearTransition,
} from "react-native-reanimated";
import { Price } from "@/components/price";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticSelect, hapticTap, withHaptic } from "@/lib/haptics";
import { MOCK_PRODUCTS, type MockProduct } from "@/lib/mock-erp-data";
import type { CartItem } from "../mock-new-sale.schema";

const layoutTransition = LinearTransition.duration(240);

function Stepper({
	quantity,
	onChange,
}: {
	quantity: number;
	onChange: (quantity: number) => void;
}) {
	return (
		<View className="h-9 flex-row items-center rounded-full border border-border">
			<Pressable
				onPress={withHaptic(hapticSelect, () => onChange(quantity - 1))}
				accessibilityLabel="Diminuir"
				disabled={quantity <= 1}
				className="h-9 w-9 items-center justify-center disabled:opacity-30"
			>
				<Icon as={MinusIcon} size={14} />
			</Pressable>
			<Text className="w-6 text-center font-sans-medium text-sm">
				{quantity}
			</Text>
			<Pressable
				onPress={withHaptic(hapticSelect, () => onChange(quantity + 1))}
				accessibilityLabel="Aumentar"
				className="h-9 w-9 items-center justify-center"
			>
				<Icon as={PlusIcon} size={14} />
			</Pressable>
		</View>
	);
}

type ItemCardProps = {
	product: MockProduct;
	quantity: number;
	onChange: (quantity: number) => void;
	onRemove: () => void;
};

function ItemCard({ product, quantity, onChange, onRemove }: ItemCardProps) {
	return (
		<Animated.View
			layout={layoutTransition}
			entering={FadeIn.duration(200)}
			exiting={FadeOut.duration(140)}
		>
			<View className="flex-row items-center gap-3 rounded-3xl border border-border bg-background p-3">
				<View className="h-16 w-16 items-center justify-center rounded-2xl bg-card">
					<Icon as={SparkleIcon} size={24} className="text-muted-foreground" />
				</View>
				<View className="flex-1 gap-2">
					<Text className="font-sans-medium" numberOfLines={1}>
						{product.name}
					</Text>
					<View className="flex-row items-center justify-between gap-2">
						<Price value={product.price * quantity} className="text-base" />
						<View className="flex-row items-center gap-2">
							<Stepper quantity={quantity} onChange={onChange} />
							<Pressable
								onPress={withHaptic(hapticTap, onRemove)}
								accessibilityLabel="Remover"
								className="h-9 w-9 items-center justify-center rounded-full bg-destructive/10"
							>
								<Icon as={TrashIcon} size={16} className="text-destructive" />
							</Pressable>
						</View>
					</View>
				</View>
			</View>
		</Animated.View>
	);
}

function ProductPicker({
	products,
	onPick,
}: {
	products: MockProduct[];
	onPick: (sku: string) => void;
}) {
	return (
		<Animated.View
			entering={FadeIn.duration(200)}
			exiting={FadeOut.duration(140)}
		>
			<View className="gap-2 rounded-3xl bg-card p-2">
				{products.map((p) => (
					<Pressable
						key={p.sku}
						onPress={withHaptic(hapticTap, () => onPick(p.sku))}
						className="flex-row items-center justify-between gap-3 rounded-2xl px-3 py-3 active:bg-accent"
					>
						<Text className="flex-1" numberOfLines={1}>
							{p.name}
						</Text>
						<Price value={p.price} className="text-sm" />
					</Pressable>
				))}
			</View>
		</Animated.View>
	);
}

type SaleItemsProps = {
	items: CartItem[];
	onChange: (items: CartItem[]) => void;
};

export function SaleItems({ items, onChange }: SaleItemsProps) {
	const [picking, setPicking] = useState(false);
	const available = MOCK_PRODUCTS.filter(
		(p) => p.stock > 0 && !items.some((i) => i.sku === p.sku),
	);

	function setQuantity(sku: string, quantity: number) {
		onChange(items.map((i) => (i.sku === sku ? { ...i, quantity } : i)));
	}

	function pick(sku: string) {
		onChange([...items, { sku, quantity: 1 }]);
		setPicking(false);
	}

	return (
		<Animated.View layout={layoutTransition}>
			<View className="gap-3">
				{items.map((item) => {
					const product = MOCK_PRODUCTS.find((p) => p.sku === item.sku);
					return product ? (
						<ItemCard
							key={item.sku}
							product={product}
							quantity={item.quantity}
							onChange={(quantity) => setQuantity(item.sku, quantity)}
							onRemove={() => onChange(items.filter((i) => i.sku !== item.sku))}
						/>
					) : null;
				})}
				{picking ? <ProductPicker products={available} onPick={pick} /> : null}
				<Button
					variant="outline"
					onPress={() => setPicking(!picking)}
					disabled={available.length === 0}
				>
					<Icon as={picking ? XIcon : PlusIcon} size={18} />
					<Text>{picking ? "Fechar lista" : "Adicionar produto"}</Text>
				</Button>
			</View>
		</Animated.View>
	);
}
