import { router, useLocalSearchParams } from "expo-router";
import { PencilSimpleIcon } from "phosphor-react-native/src/icons/PencilSimple";
import { IconButton } from "@/components/icon-button";
import { InfoRow } from "@/components/info-row";
import { ListCard } from "@/components/list-card";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { ScreenQuery } from "@/components/screen-query";
import { UnderConstructionCard } from "@/components/under-construction";
import { useProduct } from "@/queries/products/use-products";
import { ArchiveSection } from "./partials/archive-section";
import { ProductSummary } from "./partials/product-summary";
import { StockCard } from "./partials/stock-card";

/**
 * Product screen (produtos.md, estoque.md): its data, stock and average cost, the stock actions and the archive
 * control. Quantity by expiry and the ledger come with the stock screen (MUN-13); until then they're under
 * construction. An archived product isn't edited, only reactivated.
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
								product.archived ? undefined : (
									<IconButton
										icon={PencilSimpleIcon}
										label="Editar produto"
										onPress={() => router.push(`/products/${product.id}/edit`)}
									/>
								)
							}
						/>
					}
					contentClassName="gap-7"
				>
					<ProductSummary product={product} />
					<UnderConstructionCard
						title="Validades e movimentações"
						description="A quantidade por validade e o histórico do estoque chegam com a tela de estoque."
					/>
					<StockCard product={product} />
					<ListCard title="Códigos">
						<InfoRow label="Código interno" value={product.internalCode} />
						<InfoRow label="Código de barras" value={product.barcode} />
						<InfoRow
							label="Tem validade"
							value={product.hasExpiry ? "Sim" : "Não"}
						/>
					</ListCard>
					<ArchiveSection product={product} />
				</ScreenLayout>
			)}
		</ScreenQuery>
	);
}
