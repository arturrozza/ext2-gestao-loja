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
import { useCategories } from "@/queries/products/use-products";

/** The store's categories (produtos.md): just a name each; they group and filter the product list. */
export function CategoriesScreen() {
	const query = useCategories();
	const [creating, setCreating] = useState(false);
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
						<ListCard>
							{categories.map((category) => (
								<ListRow
									key={category.id}
									title={category.name}
									subtitle={`${category.productCount} ${category.productCount === 1 ? "produto" : "produtos"}`}
								/>
							))}
						</ListCard>
					)
				}
			</QueryView>
			<NewCategorySheet open={creating} onClose={() => setCreating(false)} />
		</ScreenLayout>
	);
}
