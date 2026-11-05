import { router, useLocalSearchParams } from "expo-router";
import { PencilSimpleIcon } from "phosphor-react-native/src/icons/PencilSimple";
import { IconButton } from "@/components/icon-button";
import { InfoRow } from "@/components/info-row";
import { ListCard } from "@/components/list-card";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { ScreenQuery } from "@/components/screen-query";
import { useProduct } from "@/queries/products/use-products";
import { ArchiveSection } from "./partials/archive-section";
import { ExpiryList } from "./partials/expiry-list";
import { MovementHistory } from "./partials/movement-history";
import { ProductSummary } from "./partials/product-summary";
import { StockCard } from "./partials/stock-card";

/**
 * Product screen (produtos.md, estoque.md): data, stock with quantity by expiry, ledger with links to the purchase or
 * sale behind each entry, and the stock actions (purchase, adjust, correct cost). Stock has no screen of its own.
 */
export function ProductScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const query = useProduct(id);

	return (
		<ScreenQuery title="Produto" query={query}>
			{(product) => (
				<ScreenLayout
					header={
						<ScreenHeader
							title="Produto"
							right={
								<IconButton
									icon={PencilSimpleIcon}
									label="Editar produto"
									onPress={() => router.push(`/products/${product.id}/edit`)}
								/>
							}
						/>
					}
					contentClassName="gap-7"
				>
					<ProductSummary product={product} />
					<StockCard product={product} />
					<ExpiryList expiries={product.expiries} />
					<ListCard title="Códigos">
						<InfoRow label="Código interno" value={product.internalCode} />
						<InfoRow label="Código de barras" value={product.barcode} />
						<InfoRow
							label="Tem validade"
							value={product.hasExpiry ? "Sim" : "Não"}
						/>
					</ListCard>
					<MovementHistory productId={product.id} />
					<ArchiveSection product={product} />
				</ScreenLayout>
			)}
		</ScreenQuery>
	);
}
