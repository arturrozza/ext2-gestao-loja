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
import { plural, STOCK_FILTERS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type {
	ProductListFilters,
	StockFilter,
} from "@/queries/products/products.types";
import { useCategories, useProducts } from "@/queries/products/use-products";
import { ProductRow } from "./partials/product-row";

type Status = "active" | "archived";

const STATUSES: { value: Status; label: string }[] = [
	{ value: "active", label: "Ativos" },
	{ value: "archived", label: "Arquivados" },
];

const STOCK_OPTIONS = (
	Object.entries(STOCK_FILTERS) as [StockFilter, string][]
).map(([value, label]) => ({ value, label }));

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

function subtitleOf(
	page: { total: number; totalStockValue: string } | undefined,
	onlyCategory: string | undefined,
	categoryCount: number,
) {
	if (!page) return undefined;
	const count = plural(page.total, "produto", "produtos");
	if (onlyCategory) return `${onlyCategory} · ${count}`;
	// The stock value is of the whole store, so it doesn't sit next to a category filter.
	if (categoryCount > 0) return count;
	return `${count} · ${formatMoney(page.totalStockValue)} em estoque`;
}

/**
 * Estoque tab: the product list with stock (docs/product/produtos.md, estoque.md). Total stock value on top, search
 * by name/code/barcode (camera too), stock and category filters in a sheet. New products start at the tab bar's
 * "+". Virtualized and paginated: the catalog can be huge.
 */
export function ProductsScreen() {
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<Status>("active");
	const [stock, setStock] = useState<StockFilter[]>([]);
	const [categoryIds, setCategoryIds] = useState<string[]>([]);
	const categories = useCategories();
	const onlyCategory =
		categoryIds.length === 1
			? categories.data?.find((c) => c.id === categoryIds[0])?.name
			: undefined;
	const filters: ProductListFilters = {
		search: useDebouncedValue(search),
		categoryIds,
		stock,
		archived: status === "archived",
	};
	const query = useProducts(filters);
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
			options: STOCK_OPTIONS,
			values: stock,
			onChange: setStock,
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
				subtitle={subtitleOf(firstPage, onlyCategory, categoryIds.length)}
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
