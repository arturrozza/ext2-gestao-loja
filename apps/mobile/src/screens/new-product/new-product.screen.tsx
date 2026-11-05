import { router, useLocalSearchParams } from "expo-router";
import { ProductForm } from "@/components/product-form/product-form";
import { EMPTY_PRODUCT } from "@/components/product-form/product-form.schema";
import { showToast } from "@/components/toast";
import { useCreateProduct } from "@/queries/products/use-products";

/**
 * New product (produtos.md): it starts with zero stock and zero cost; the first entry comes from a purchase. Once
 * purchases exist (MUN-12), saving offers the first entry (`partials/first-entry-sheet.tsx`); until then it opens the
 * product. `?barcode=` prefills the code when coming from a search that found nothing.
 */
export function NewProductScreen() {
	const { barcode } = useLocalSearchParams<{ barcode?: string }>();
	const create = useCreateProduct();

	return (
		<ProductForm
			title="Novo produto"
			submitLabel="Cadastrar produto"
			initial={{ ...EMPTY_PRODUCT, barcode: barcode ?? "" }}
			mutation={create}
			onSaved={(product) => {
				showToast("Produto cadastrado");
				router.replace(`/products/${product.id}`);
			}}
		/>
	);
}
