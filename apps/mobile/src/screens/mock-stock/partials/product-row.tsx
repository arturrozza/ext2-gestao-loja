import { Link } from "expo-router";
import { MapPin, Sparkles } from "lucide-react-native";
import { View } from "react-native";
import { ExpandableRow } from "@/components/expandable-row";
import { Price } from "@/components/price";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
	formatBRL,
	formatPercent,
	type MockProduct,
	productMargin,
} from "@/lib/mock-erp-data";

function stockPill(product: MockProduct) {
	if (product.stock === 0)
		return <StatusPill label="Sem estoque" tone="danger" />;
	if (product.stock < product.minStock)
		return (
			<StatusPill label={`${product.stock} un. · baixo`} tone="highlight" />
		);
	return <StatusPill label={`${product.stock} un.`} />;
}

function ProductSummary({ product }: { product: MockProduct }) {
	return (
		<View className="flex-row items-center gap-3">
			<View className="h-16 w-16 items-center justify-center rounded-2xl bg-card">
				<Icon as={Sparkles} size={22} className="text-muted-foreground" />
			</View>
			<View className="flex-1 gap-1">
				<Text className="font-sans-medium" numberOfLines={1}>
					{product.name}
				</Text>
				<Text className="text-muted-foreground text-xs">
					{product.sku} · {product.category}
				</Text>
				<View className="flex-row items-center justify-between">
					<Price value={product.price} className="text-base" />
					{stockPill(product)}
				</View>
			</View>
		</View>
	);
}

function Stat({
	label,
	value,
	danger = false,
}: {
	label: string;
	value: string;
	danger?: boolean;
}) {
	return (
		<View className="flex-1 gap-0.5">
			<Text className="text-muted-foreground text-xs">{label}</Text>
			<Text
				className={
					danger ? "font-sans-semibold text-destructive" : "font-sans-semibold"
				}
			>
				{value}
			</Text>
		</View>
	);
}

function ProductDetails({ product }: { product: MockProduct }) {
	const margin = productMargin(product);

	return (
		<View className="gap-3">
			<View className="flex-row rounded-2xl bg-card p-4">
				<Stat label="Custo médio" value={formatBRL(product.cost)} />
				<Stat
					label="Margem"
					value={formatPercent(margin)}
					danger={margin < 0}
				/>
				<Stat label="Mínimo" value={`${product.minStock} un.`} />
			</View>
			<View className="flex-row items-center gap-1.5 px-1">
				<Icon as={MapPin} size={14} className="text-muted-foreground" />
				<Text className="text-muted-foreground text-sm">
					{product.location}
				</Text>
			</View>
			<View className="flex-row gap-2">
				<Link
					href={{
						pathname: "/mock/product/[sku]",
						params: { sku: product.sku },
					}}
					asChild
				>
					<Button size="sm" className="flex-1">
						<Text>Ver produto</Text>
					</Button>
				</Link>
				<Button variant="outline" size="sm" className="flex-1">
					<Text>Ajustar estoque</Text>
				</Button>
			</View>
		</View>
	);
}

export function ProductRow({ product }: { product: MockProduct }) {
	return (
		<ExpandableRow summary={<ProductSummary product={product} />}>
			<ProductDetails product={product} />
		</ExpandableRow>
	);
}
