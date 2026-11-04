import { Link, useLocalSearchParams } from "expo-router";
import { DotsThreeIcon } from "phosphor-react-native/src/icons/DotsThree";
import { MapPinIcon } from "phosphor-react-native/src/icons/MapPin";
import { SparkleIcon } from "phosphor-react-native/src/icons/Sparkle";
import { View } from "react-native";
import { IconButton } from "@/components/icon-button";
import { Price } from "@/components/price";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { SectionTitle } from "@/components/section-title";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
	formatBRL,
	formatPercent,
	type Lot,
	MOCK_PRODUCTS,
	type Movement,
	productMargin,
} from "@/lib/mock-erp-data";
import { cn } from "@/lib/utils";

const EXPIRED = ["10/2026"];
const EXPIRING = ["11/2026", "12/2026"];

function lotPill(lot: Lot) {
	if (lot.expiry && EXPIRED.includes(lot.expiry))
		return <StatusPill label="Vencido" tone="danger" />;
	if (lot.expiry && EXPIRING.includes(lot.expiry))
		return <StatusPill label="Vence em breve" tone="highlight" />;
	return <StatusPill label="Ok" />;
}

function Tile({
	label,
	value,
	danger = false,
}: {
	label: string;
	value: string;
	danger?: boolean;
}) {
	return (
		<View className="min-w-[45%] flex-1 gap-1 rounded-2xl bg-card p-4">
			<Text className="text-muted-foreground text-xs">{label}</Text>
			<Text className={cn("font-sans-semibold", danger && "text-destructive")}>
				{value}
			</Text>
		</View>
	);
}

function LotRow({ lot, first }: { lot: Lot; first: boolean }) {
	return (
		<View
			className={cn(
				"flex-row items-center gap-3 py-3",
				!first && "border-border border-t",
			)}
		>
			<View className="flex-1 gap-0.5">
				<Text className="font-sans-medium">Lote {lot.code}</Text>
				<Text className="text-muted-foreground text-xs">
					{lot.available} de {lot.initial} un. · validade {lot.expiry ?? "—"}
				</Text>
			</View>
			{lotPill(lot)}
		</View>
	);
}

function MovementRow({
	movement,
	first,
}: {
	movement: Movement;
	first: boolean;
}) {
	const positive = movement.quantity > 0;

	return (
		<View
			className={cn(
				"flex-row items-center gap-3 py-3",
				!first && "border-border border-t",
			)}
		>
			<View className="flex-1 gap-0.5">
				<Text className="font-sans-medium">{movement.type}</Text>
				<Text className="text-muted-foreground text-xs">
					{movement.date} · {movement.note}
				</Text>
			</View>
			<Text
				className={cn(
					"font-sans-semibold",
					positive ? "text-foreground" : "text-muted-foreground",
				)}
			>
				{positive ? `+${movement.quantity}` : movement.quantity}
			</Text>
		</View>
	);
}

export function MockProductScreen() {
	const { sku } = useLocalSearchParams<{ sku: string }>();
	const product = MOCK_PRODUCTS.find((p) => p.sku === sku) ?? MOCK_PRODUCTS[0];
	if (!product) return null;
	const margin = productMargin(product);

	return (
		<ScreenLayout
			header={
				<ScreenHeader
					title="Produto"
					right={<IconButton icon={DotsThreeIcon} label="Mais opções" />}
				/>
			}
		>
			<View className="items-center gap-4">
				<View className="h-40 w-full items-center justify-center rounded-3xl bg-card">
					<Icon as={SparkleIcon} size={48} className="text-muted-foreground" />
				</View>
				<View className="w-full flex-row items-start justify-between gap-3">
					<View className="flex-1 gap-1">
						<Text className="font-sans-semibold text-xl">{product.name}</Text>
						<View className="flex-row items-center gap-1.5">
							<Icon
								as={MapPinIcon}
								size={14}
								className="text-muted-foreground"
							/>
							<Text className="text-muted-foreground text-sm">
								{product.sku} · {product.location}
							</Text>
						</View>
					</View>
					<Price value={product.price} className="text-2xl" />
				</View>
			</View>

			<View className="flex-row flex-wrap gap-3">
				<Tile
					label="Em estoque"
					value={`${product.stock} un.`}
					danger={product.stock < product.minStock}
				/>
				<Tile label="Custo médio" value={formatBRL(product.cost)} />
				<Tile
					label="Margem"
					value={formatPercent(margin)}
					danger={margin < 0}
				/>
				<Tile
					label="Valor em estoque"
					value={formatBRL(product.stock * product.cost)}
				/>
			</View>

			<View className="gap-1">
				<SectionTitle title="Lotes" />
				{product.lots.length > 0 ? (
					product.lots.map((lot, index) => (
						<LotRow key={lot.code} lot={lot} first={index === 0} />
					))
				) : (
					<Text className="py-3 text-muted-foreground">
						Nenhum lote com saldo.
					</Text>
				)}
			</View>

			<View className="gap-1">
				<SectionTitle title="Movimentações" />
				{product.movements.map((movement, index) => (
					<MovementRow
						key={`${movement.date}-${movement.note}`}
						movement={movement}
						first={index === 0}
					/>
				))}
			</View>

			<View className="flex-row gap-2">
				<Link href="/mock/new-purchase" asChild>
					<Button className="flex-1">
						<Text>Registrar compra</Text>
					</Button>
				</Link>
				<Button variant="outline" className="flex-1">
					<Text>Ajustar estoque</Text>
				</Button>
			</View>
		</ScreenLayout>
	);
}
