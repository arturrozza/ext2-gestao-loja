import { router, useLocalSearchParams } from "expo-router";
import { ProductForm } from "@/components/product-form/product-form";
import { productToForm } from "@/components/product-form/product-form.schema";
import { ScreenQuery } from "@/components/screen-query";
import { FormSkeleton } from "@/components/skeleton";
import { showToast } from "@/components/toast";
import { useProduct, useUpdateProduct } from "@/queries/products/use-products";

/** Edit a product's data. Stock and cost don't change here (produtos.md). */
export function EditProductScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const query = useProduct(id);
	const update = useUpdateProduct(id);

	return (
		<ScreenQuery
			title="Editar produto"
			query={query}
			skeleton={<FormSkeleton />}
			sheet
		>
			{(product) => (
				<ProductForm
					title="Editar produto"
					submitLabel="Salvar"
					initial={productToForm(product)}
					mutation={update}
					onSaved={() => {
						showToast("Produto salvo");
						router.back();
					}}
				/>
			)}
		</ScreenQuery>
	);
}
