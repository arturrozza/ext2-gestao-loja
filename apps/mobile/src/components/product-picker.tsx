import { MagnifyingGlassIcon } from "phosphor-react-native/src/icons/MagnifyingGlass";
import { useEffect, useRef, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Checkbox } from "@/components/checkbox";
import {
	ActiveFilters,
	FilterControl,
	multiFilterGroup,
} from "@/components/filters";
import { ProductThumb } from "@/components/product-thumb";
import { EmptyState } from "@/components/query-states";
import { SearchField } from "@/components/search-field";
import { SheetModal } from "@/components/sheet-modal";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useInfiniteList } from "@/components/use-infinite-list";
import { hapticSelect, withHaptic } from "@/lib/haptics";
import { plural } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import type {
	ProductListFilters,
	ProductListItem,
} from "@/queries/products/products.types";
import { useCategories, useProducts } from "@/queries/products/use-products";

/** `sale`: shows price and sellable stock. `purchase`: shows stock and cost. */
export type PickerMode = "sale" | "purchase";

type Availability = "in_stock" | "low" | "out";

const AVAILABILITY: { value: Availability; label: string }[] = [
	{ value: "in_stock", label: "Com estoque" },
	{ value: "low", label: "Estoque baixo" },
	{ value: "out", label: "Sem estoque" },
];

function availabilityFilter(
	values: Availability[],
): Pick<ProductListFilters, "stock" | "inStock"> {
	return {
		stock: values.filter((value) => value !== "in_stock"),
		inStock: values.includes("in_stock"),
	};
}

function detailLine(product: ProductListItem, mode: PickerMode) {
	const detail =
		mode === "sale"
			? `${formatMoney(product.basePrice)} · ${product.sellableStock} disponíveis`
			: `${product.stock} em estoque · custo ${formatMoney(product.averageCost)}`;
	return [detail, product.internalCode].filter(Boolean).join(" · ");
}

function RowState({ selected, added }: { selected: boolean; added: boolean }) {
	if (added) {
		return <Text className="text-muted-foreground text-xs">Já adicionado</Text>;
	}
	return <Checkbox on={selected} />;
}

function PickerRow({
	product,
	mode,
	selected,
	added,
	onToggle,
}: {
	product: ProductListItem;
	mode: PickerMode;
	selected: boolean;
	added: boolean;
	onToggle: () => void;
}) {
	return (
		<Pressable
			onPress={withHaptic(hapticSelect, onToggle)}
			disabled={added}
			accessibilityRole="checkbox"
			accessibilityState={{ checked: selected, disabled: added }}
			accessibilityLabel={product.name}
			className={cn(
				"mx-5 flex-row items-center gap-3 rounded-xl px-3 py-3",
				selected ? "bg-primary/10" : "bg-background active:bg-accent",
				added && "opacity-50",
			)}
		>
			<ProductThumb uri={product.photoUri} name={product.name} />
			<View className="flex-1 gap-1">
				<Text className="font-sans-semibold text-sm" numberOfLines={2}>
					{product.name}
				</Text>
				<Text className="text-muted-foreground text-xs" numberOfLines={1}>
					{detailLine(product, mode)}
				</Text>
				{mode === "sale" && product.sellableStock === 0 ? (
					<StatusPill label="Sem estoque" tone="danger" />
				) : null}
			</View>
			<RowState selected={selected} added={added} />
		</Pressable>
	);
}

function RowGap() {
	return <View className="h-2" />;
}

function useSelection() {
	const [selected, setSelected] = useState<Map<string, ProductListItem>>(
		new Map(),
	);
	return {
		selected,
		toggle(product: ProductListItem) {
			setSelected((current) => {
				const next = new Map(current);
				if (next.has(product.id)) next.delete(product.id);
				else next.set(product.id, product);
				return next;
			});
		},
		add(product: ProductListItem) {
			setSelected((current) => new Map(current).set(product.id, product));
		},
		clear: () => setSelected(new Map()),
	};
}

/**
 * A scanned or typed barcode that matches one product selects it right away and clears the search, ready for the next
 * scan: a purchase of many items doesn't need a tap per product.
 */
function useBarcodeSelect(
	search: string,
	products: ProductListItem[],
	addedIds: string[],
	onMatch: (product: ProductListItem | null) => void,
) {
	// The list and the callback are new objects each render: read them from a ref and run only when the search changes.
	const latest = useRef({ products, addedIds, onMatch });
	latest.current = { products, addedIds, onMatch };
	const [handled, setHandled] = useState("");
	useEffect(() => {
		if (!search || search === handled) return;
		const { products, addedIds, onMatch } = latest.current;
		const match = products.find((product) => product.barcode === search);
		if (!match) return;
		setHandled(search);
		// Already on the form: nothing to add, but the search still clears for the next scan.
		onMatch(addedIds.includes(match.id) ? null : match);
	});
}

/**
 * Full-screen product picker for sales and purchases. The catalog can be huge: search by name, internal code or
 * barcode (camera too), category and availability filters, virtualized and paginated list. Only active products
 * (archived ones never enter new sales or purchases, produtos.md). Products without stock stay listed: choosing one in
 * a sale leads to the "estoque insuficiente" shortcuts (vendas.md). Several can be picked at once.
 */
export function ProductPicker({
	open,
	mode,
	addedIds,
	onClose,
	onConfirm,
}: {
	open: boolean;
	mode: PickerMode;
	/** Products already on the form: listed, but can't be picked again. */
	addedIds: string[];
	onClose: () => void;
	onConfirm: (products: ProductListItem[]) => void;
}) {
	const insets = useSafeAreaInsets();
	const [search, setSearch] = useState("");
	const [categoryIds, setCategoryIds] = useState<string[]>([]);
	const [availability, setAvailability] = useState<Availability[]>([]);
	const selection = useSelection();
	const categories = useCategories();
	const debouncedSearch = useDebouncedValue(search);
	// Only fetches while open: every form that hosts the picker keeps it mounted.
	const query = useProducts(
		{
			search: debouncedSearch,
			categoryIds,
			archived: false,
			...availabilityFilter(availability),
		},
		open,
	);
	const list = useInfiniteList(
		query,
		<EmptyState
			icon={MagnifyingGlassIcon}
			title="Nenhum produto encontrado"
			description="Só aparecem produtos ativos. Tente outra busca ou outro filtro."
		/>,
		{ leading: "thumb" },
	);
	// While the debounce catches up after clearing, `search` differs and nothing matches.
	const settledSearch = search === debouncedSearch ? search : "";
	useBarcodeSelect(settledSearch, list.data, addedIds, (product) => {
		if (product) selection.add(product);
		setSearch("");
	});
	const total = query.data?.pages[0]?.total;

	const filterGroups = [
		multiFilterGroup({
			key: "availability",
			title: "Estoque",
			options: AVAILABILITY,
			values: availability,
			onChange: setAvailability,
		}),
		multiFilterGroup({
			key: "category",
			title: "Categoria",
			options: (categories.data ?? []).map((c) => ({
				value: c.id,
				label: c.name,
			})),
			values: categoryIds,
			onChange: setCategoryIds,
		}),
	];

	const close = () => {
		selection.clear();
		setSearch("");
		setCategoryIds([]);
		setAvailability([]);
		onClose();
	};
	const confirm = () => {
		onConfirm([...selection.selected.values()]);
		close();
	};

	return (
		<SheetModal open={open} onClose={close} title="Escolher produtos">
			<View className="gap-2 pb-3">
				<View className="flex-row gap-2 px-5">
					<View className="flex-1">
						<SearchField
							value={search}
							onChangeText={setSearch}
							placeholder="Nome, código ou barras"
							scan
						/>
					</View>
					<FilterControl groups={filterGroups} />
				</View>
				<View className="px-5">
					<ActiveFilters groups={filterGroups} />
				</View>
				{total ? (
					<Text className="px-6 text-muted-foreground text-xs">
						{plural(total, "produto", "produtos")}
					</Text>
				) : null}
			</View>
			<FlatList
				data={list.data}
				keyExtractor={(product) => product.id}
				renderItem={({ item }) => (
					<PickerRow
						product={item}
						mode={mode}
						selected={selection.selected.has(item.id)}
						added={addedIds.includes(item.id)}
						onToggle={() => selection.toggle(item)}
					/>
				)}
				ItemSeparatorComponent={RowGap}
				ListEmptyComponent={<View className="px-5">{list.empty}</View>}
				ListFooterComponent={
					list.footer ? <View>{list.footer}</View> : undefined
				}
				onEndReached={list.onEndReached}
				onEndReachedThreshold={0.5}
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode="on-drag"
				showsVerticalScrollIndicator={false}
				contentContainerClassName="pb-6"
			/>
			<View
				className="border-border border-t bg-background px-5 pt-4"
				style={{ paddingBottom: insets.bottom + 12 }}
			>
				<Button
					size="lg"
					onPress={confirm}
					disabled={selection.selected.size === 0}
				>
					<Text>
						{selection.selected.size === 0
							? "Escolha os produtos"
							: `Adicionar (${selection.selected.size})`}
					</Text>
				</Button>
			</View>
		</SheetModal>
	);
}
