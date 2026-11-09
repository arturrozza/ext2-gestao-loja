import { router } from "expo-router";
import { MagnifyingGlassIcon } from "phosphor-react-native/src/icons/MagnifyingGlass";
import { PackageIcon } from "phosphor-react-native/src/icons/Package";
import { TagIcon } from "phosphor-react-native/src/icons/Tag";
import { useState } from "react";
import { View } from "react-native";
import {
	ActiveFilters,
	FilterControl,
	filterGroup,
	multiFilterGroup,
} from "@/components/filters";
import { IconButton } from "@/components/icon-button";
import { PageTitle } from "@/components/page-title";
import { EmptyState } from "@/components/query-states";
import { ScreenLayout } from "@/components/screen-layout";
import { SearchField } from "@/components/search-field";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useInfiniteList } from "@/components/use-infinite-list";
import { plural, STOCK_STATE_OPTIONS } from "@/lib/labels";
import { formatMoney, type Money } from "@/lib/money";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type {
	ProductListFilters,
	StockState,
} from "@/queries/products/products.types";
import {
	useCategories,
	useProducts,
	useStockValue,
} from "@/queries/products/use-products";
import { ProductRow } from "./partials/product-row";

type Status = "active" | "archived";

const STATUSES: { value: Status; label: string }[] = [
	{ value: "active", label: "Ativos" },
	{ value: "archived", label: "Arquivados" },
];

function NoProducts({
	search,
	filtered,
}: {
	search: string;
	filtered: boolean;
}) {
	if (filtered) {
		// A scanned or typed barcode nobody has yet: offer to register it.
		const code = /^\d{8,14}$/.test(search) ? search : null;
		return (
			<EmptyState
				icon={MagnifyingGlassIcon}
				title="Nenhum produto encontrado"
				description="Tente outra busca ou outro filtro."
				action={
					code ? (
						<Button
							variant="outline"
							onPress={() =>
								router.push({
									pathname: "/products/new",
									params: { barcode: code },
								})
							}
						>
							<Text>Cadastrar com este código</Text>
						</Button>
					) : undefined
				}
			/>
		);
	}
	return (
		<EmptyState
			icon={PackageIcon}
			title="Nenhum produto ainda"
			description="Cadastre os produtos da loja. O estoque entra pelas compras."
			action={
				<Button onPress={() => router.push("/products/new")}>
					<Text>Cadastrar produto</Text>
				</Button>
			}
		/>
	);
}

/** The count of the filter, and the value of all the store's stock (whatever the filter: estoque.md). */
function subtitleOf(
	page: { total: number } | undefined,
	onlyCategory: string | undefined,
	stockValue: Money | undefined,
) {
	if (!page) return undefined;
	const count = plural(page.total, "produto", "produtos");
	return [
		onlyCategory,
		count,
		stockValue === undefined
			? null
			: `${formatMoney(stockValue)} em estoque na loja`,
	]
		.filter(Boolean)
		.join(" · ");
}

/**
 * Products tab (docs/product/produtos.md): search by name/code/barcode (camera too), stock, category and status filters
 * in a sheet, each row with its stock, and the store's total stock value on top.
 * New products start at the tab bar's "+". Virtualized and paginated: the catalog can be huge.
 */
export function ProductsScreen() {
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<Status>("active");
	const [pickedCategoryIds, setPickedCategoryIds] = useState<string[]>([]);
	const [stock, setStock] = useState<StockState[]>([]);
	const categories = useCategories();
	// Archived categories can't be picked (produtos.md); their products still show without the filter.
	const activeCategories = (categories.data ?? []).filter((c) => !c.archived);
	// A category archived while picked here drops out of the filter, instead of filtering with no way to undo it.
	const categoryIds = categories.data
		? pickedCategoryIds.filter((id) =>
				activeCategories.some((c) => c.id === id),
			)
		: pickedCategoryIds;
	const onlyCategory =
		categoryIds.length === 1
			? activeCategories.find((c) => c.id === categoryIds[0])?.name
			: undefined;
	const filters: ProductListFilters = {
		search: useDebouncedValue(search),
		categoryIds,
		archived: status === "archived",
		stock,
	};
	const query = useProducts(filters);
	const stockValue = useStockValue();
	const firstPage = query.data?.pages[0];
	const list = useInfiniteList(
		query,
		<NoProducts
			search={filters.search}
			filtered={Boolean(
				filters.search ||
					categoryIds.length > 0 ||
					stock.length > 0 ||
					status !== "active",
			)}
		/>,
		{ leading: "thumb" },
	);

	const filterGroups = [
		multiFilterGroup({
			key: "stock",
			title: "Estoque",
			options: STOCK_STATE_OPTIONS,
			values: stock,
			onChange: setStock,
		}),
		multiFilterGroup({
			key: "category",
			title: "Categoria",
			options: activeCategories.map((c) => ({
				value: c.id,
				label: c.name,
			})),
			values: categoryIds,
			onChange: setPickedCategoryIds,
		}),
		filterGroup({
			key: "status",
			title: "Situação",
			options: STATUSES,
			value: status,
			defaultValue: "active",
			onChange: setStatus,
		}),
	];

	return (
		<ScreenLayout
			bottom="tabs"
			compactTitle="Produtos"
			contentClassName="gap-5"
			list={{
				...list,
				keyExtractor: (product) => product.id,
				renderItem: (product) => <ProductRow product={product} />,
			}}
		>
			<PageTitle
				title="Produtos"
				subtitle={subtitleOf(firstPage, onlyCategory, stockValue.data?.value)}
				subtitleLoading={query.isPending}
				right={
					<IconButton
						icon={TagIcon}
						label="Categorias"
						onPress={() => router.push("/products/categories")}
					/>
				}
			/>
			<View className="gap-3">
				<View className="flex-row gap-2">
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
				<ActiveFilters groups={filterGroups} />
			</View>
		</ScreenLayout>
	);
}
