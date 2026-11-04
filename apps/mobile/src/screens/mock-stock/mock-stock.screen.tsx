import { Link, useRouter } from "expo-router";
import { Plus, SlidersHorizontal } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import Animated, {
	FadeIn,
	FadeOut,
	LinearTransition,
} from "react-native-reanimated";
import { ChoiceChips } from "@/components/choice-chips";
import { IconButton } from "@/components/icon-button";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import {
	formatBRL,
	MOCK_PRODUCTS,
	type MockProduct,
	stockValue,
} from "@/lib/mock-erp-data";
import { ProductRow } from "./partials/product-row";

const FILTERS = [
	{ value: "all", label: "Todos" },
	{ value: "low", label: "Estoque baixo" },
	{ value: "out", label: "Sem estoque" },
	{ value: "expiring", label: "Validade" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

// Mock "today" is 11/2026: lots up to 12/2026 are expiring or expired.
const EXPIRING = ["10/2026", "11/2026", "12/2026"];

const layoutTransition = LinearTransition.duration(240);

function matchesFilter(filter: Filter, p: MockProduct) {
	if (filter === "out") return p.stock === 0;
	if (filter === "low") return p.stock > 0 && p.stock < p.minStock;
	if (filter === "expiring")
		return p.lots.some(
			(lot) => lot.expiry !== null && EXPIRING.includes(lot.expiry),
		);
	return true;
}

function Overview() {
	const below = MOCK_PRODUCTS.filter((p) => p.stock < p.minStock).length;

	return (
		<View className="gap-3">
			<View className="flex-row gap-3">
				<View className="flex-1 gap-1 rounded-2xl bg-card p-4">
					<Text className="text-muted-foreground text-xs">
						Valor em estoque
					</Text>
					<Text className="font-sans-semibold">{formatBRL(stockValue())}</Text>
				</View>
				<View className="flex-1 gap-1 rounded-2xl bg-card p-4">
					<Text className="text-muted-foreground text-xs">
						Abaixo do mínimo
					</Text>
					<Text className="font-sans-semibold">{below} produtos</Text>
				</View>
			</View>
			<View className="flex-row gap-2">
				<Link href="/mock/new-purchase" asChild>
					<Button className="flex-1">
						<Text>Registrar compra</Text>
					</Button>
				</Link>
				<Link href="/mock/purchases" asChild>
					<Button variant="outline" className="flex-1">
						<Text>Compras</Text>
					</Button>
				</Link>
			</View>
		</View>
	);
}

export function MockStockScreen() {
	const router = useRouter();
	const [filter, setFilter] = useState<Filter>("all");
	const [showFilters, setShowFilters] = useState(true);
	const [search, setSearch] = useState("");

	const query = search.trim().toLowerCase();
	const products = MOCK_PRODUCTS.filter(
		(p) =>
			matchesFilter(filter, p) &&
			`${p.name} ${p.sku}`.toLowerCase().includes(query),
	);

	return (
		<ScreenLayout
			bottom="tabs"
			header={
				<ScreenHeader
					variant="large"
					title="Estoque"
					right={
						<IconButton
							icon={Plus}
							label="Novo produto"
							onPress={() => router.push("/mock/new-product")}
						/>
					}
				/>
			}
		>
			<Overview />

			<View className="gap-3">
				<View className="flex-row gap-3">
					<View className="flex-1">
						<Input
							placeholder="Buscar nome ou código..."
							value={search}
							onChangeText={setSearch}
						/>
					</View>
					<IconButton
						icon={SlidersHorizontal}
						label="Filtros"
						variant="primary"
						onPress={() => setShowFilters(!showFilters)}
					/>
				</View>
				{showFilters ? (
					<Animated.View
						entering={FadeIn.duration(200)}
						exiting={FadeOut.duration(140)}
					>
						<ChoiceChips
							options={FILTERS}
							value={filter}
							onChange={setFilter}
						/>
					</Animated.View>
				) : null}
			</View>

			<Animated.View layout={layoutTransition}>
				<View className="gap-3">
					{products.map((p) => (
						<Animated.View
							key={p.sku}
							entering={FadeIn.duration(200)}
							exiting={FadeOut.duration(120)}
						>
							<ProductRow product={p} />
						</Animated.View>
					))}
					{products.length === 0 ? (
						<Text className="py-8 text-center text-muted-foreground">
							Nenhum produto encontrado.
						</Text>
					) : null}
				</View>
			</Animated.View>
		</ScreenLayout>
	);
}
