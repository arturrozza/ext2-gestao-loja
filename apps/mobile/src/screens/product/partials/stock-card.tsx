import { MapPinIcon } from "phosphor-react-native/src/icons/MapPin";
import { PackageIcon } from "phosphor-react-native/src/icons/Package";
import { InfoRow } from "@/components/info-row";
import { ListCard } from "@/components/list-card";
import type { Product } from "@/queries/products/products.types";

/** Where the product is kept and when it counts as low. Quantity, value and cost are in the top card. */
export function StockCard({ product }: { product: Product }) {
	return (
		<ListCard title="Local e mínimo">
			<InfoRow
				label="Estoque mínimo"
				icon={PackageIcon}
				value={product.minStock === null ? null : String(product.minStock)}
			/>
			<InfoRow label="Localização" icon={MapPinIcon} value={product.location} />
		</ListCard>
	);
}
