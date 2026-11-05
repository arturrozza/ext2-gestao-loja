import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ProductForm } from "@/components/product-form/product-form";
import { EMPTY_PRODUCT } from "@/components/product-form/product-form.schema";
import { useCreateProduct } from "@/queries/products/use-products";
import { FirstEntrySheet } from "./partials/first-entry-sheet";

/**
 * New product (produtos.md): it starts with zero stock and zero cost; the first entry comes from a purchase.
 * `?barcode=` prefills the code when coming from a search that found nothing.
 */
export function NewProductScreen() {
	const { barcode } = useLocalSearchParams<{ barcode?: string }>();
	const create = useCreateProduct();
	const [saved, setSaved] = useState<{ id: string; name: string } | null>(null);

	return (
		<>
			<ProductForm
				title="Novo produto"
				submitLabel="Cadastrar produto"
				initial={{ ...EMPTY_PRODUCT, barcode: barcode ?? "" }}
				mutation={create}
				onSaved={setSaved}
			/>
			<FirstEntrySheet product={saved} />
		</>
	);
}
