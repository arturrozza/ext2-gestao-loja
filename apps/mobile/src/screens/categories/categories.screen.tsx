import { PlusIcon } from "phosphor-react-native/src/icons/Plus";
import { TagIcon } from "phosphor-react-native/src/icons/Tag";
import { useState } from "react";
import { IconButton } from "@/components/icon-button";
import { ListCard, ListRow } from "@/components/list-card";
import { NewCategorySheet } from "@/components/new-category-sheet";
import { EmptyState, QueryView } from "@/components/query-states";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { plural } from "@/lib/labels";
import type { Category } from "@/queries/products/products.types";
import { useCategories } from "@/queries/products/use-products";
import { CategorySheet } from "./partials/category-sheet";

/**
 * One `ListRow` per category, returned as an array (not a component) so `ListCard` sees each row and draws the
 * hairlines between them. Tapping one opens its sheet (rename, archive or reactivate).
 */
function categoryRows(
	categories: Category[],
	onSelect: (category: Category) => void,
) {
	return categories.map((category) => (
		<ListRow
			key={category.id}
			title={category.name}
			subtitle={plural(category.productCount, "produto", "produtos")}
			muted={category.archived}
			onPress={() => onSelect(category)}
		/>
	));
}

/** Active categories, then the archived ones apart. A section with nothing in it isn't shown. */
function CategorySections({
	categories,
	onSelect,
}: {
	categories: Category[];
	onSelect: (category: Category) => void;
}) {
	const active = categories.filter((category) => !category.archived);
	const archived = categories.filter((category) => category.archived);
	return (
		<>
			{active.length > 0 ? (
				<ListCard title="Ativas">{categoryRows(active, onSelect)}</ListCard>
			) : null}
			{archived.length > 0 ? (
				<ListCard title="Arquivadas">
					{categoryRows(archived, onSelect)}
				</ListCard>
			) : null}
		</>
	);
}

/**
 * The store's categories (produtos.md): just a name each; they group and filter the product list. Archived ones sit
 * apart: they can't be picked anymore, but their products keep them.
 */
export function CategoriesScreen() {
	const query = useCategories();
	const [creating, setCreating] = useState(false);
	// By id, so the sheet shows the category as the list has it now (after a refetch too).
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);
	const selected = query.data?.find((category) => category.id === selectedId);
	const select = (category: Category) => {
		setSelectedId(category.id);
		setSheetOpen(true);
	};
	const create = () => setCreating(true);

	return (
		<ScreenLayout
			header={
				<ScreenHeader
					title="Categorias"
					right={
						<IconButton
							icon={PlusIcon}
							label="Nova categoria"
							variant="primary"
							onPress={create}
						/>
					}
				/>
			}
		>
			<QueryView query={query}>
				{(categories) =>
					categories.length === 0 ? (
						<EmptyState
							icon={TagIcon}
							title="Nenhuma categoria ainda"
							description="Categorias ajudam a filtrar a lista de produtos. Cada produto tem no máximo uma."
							action={
								<Button onPress={create}>
									<Text>Criar categoria</Text>
								</Button>
							}
						/>
					) : (
						<CategorySections categories={categories} onSelect={select} />
					)
				}
			</QueryView>
			<NewCategorySheet open={creating} onClose={() => setCreating(false)} />
			{selected ? (
				<CategorySheet
					key={selected.id}
					category={selected}
					open={sheetOpen}
					onClose={() => setSheetOpen(false)}
				/>
			) : null}
		</ScreenLayout>
	);
}
