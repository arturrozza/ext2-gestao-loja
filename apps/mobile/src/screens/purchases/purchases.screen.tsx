import { router } from "expo-router";
import { PlusIcon } from "phosphor-react-native/src/icons/Plus";
import { TruckIcon } from "phosphor-react-native/src/icons/Truck";
import { useState } from "react";
import { View } from "react-native";
import {
	ActiveFilters,
	FilterControl,
	filterGroup,
} from "@/components/filters";
import { IconButton } from "@/components/icon-button";
import { ItemRow } from "@/components/item-row";
import { EmptyState } from "@/components/query-states";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { ThumbStack } from "@/components/thumb-stack";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useInfiniteList } from "@/components/use-infinite-list";
import { formatDayHeading } from "@/lib/dates";
import { productsLine, times } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import type {
	PurchaseStatus,
	PurchaseSummary,
} from "@/queries/purchases/purchases.types";
import { usePurchases } from "@/queries/purchases/use-purchases";

type StatusView = "all" | PurchaseStatus;

const VIEWS: { value: StatusView; label: string }[] = [
	{ value: "active", label: "Ativas" },
	{ value: "canceled", label: "Canceladas" },
];

function PurchaseRow({ purchase }: { purchase: PurchaseSummary }) {
	const products = productsLine(purchase.preview, purchase.productCount);
	return (
		<ItemRow
			href={`/purchases/${purchase.id}`}
			label={`Compra ${purchase.number}, ${products}`}
			leading={
				<ThumbStack items={purchase.preview} total={purchase.productCount} />
			}
			title={products}
			subtitle={`#${purchase.number} · ${times(purchase.unitCount)}`}
			value={formatMoney(purchase.total)}
			struck={purchase.status === "canceled"}
		/>
	);
}

/** Purchase history (compras.md), newest first. Canceled ones stay, marked. */
export function PurchasesScreen() {
	const [view, setView] = useState<StatusView>("all");
	const query = usePurchases({ status: view === "all" ? null : view });
	const newPurchase = () => router.push("/purchases/new");

	const list = useInfiniteList(
		query,
		<EmptyState
			icon={TruckIcon}
			title={view === "all" ? "Nenhuma compra ainda" : "Nenhuma compra aqui"}
			description="As compras dão entrada na mercadoria e calculam o custo médio."
			action={
				view === "all" ? (
					<Button onPress={newPurchase}>
						<Text>Lançar compra</Text>
					</Button>
				) : undefined
			}
		/>,
		{ leading: "stack" },
	);

	const filters = [
		filterGroup({
			key: "status",
			title: "Situação",
			options: VIEWS,
			value: view,
			defaultValue: "all",
			onChange: setView,
		}),
	];

	return (
		<ScreenLayout
			header={
				<ScreenHeader
					title="Compras"
					balanceTitle
					right={
						<View className="flex-row gap-2">
							<FilterControl variant="icon" groups={filters} />
							<IconButton
								icon={PlusIcon}
								label="Nova compra"
								variant="primary"
								onPress={newPurchase}
							/>
						</View>
					}
				/>
			}
			list={{
				...list,
				keyExtractor: (purchase) => purchase.id,
				sectionOf: (purchase) => formatDayHeading(purchase.date),
				renderItem: (purchase) => <PurchaseRow purchase={purchase} />,
			}}
		>
			<ActiveFilters groups={filters} />
		</ScreenLayout>
	);
}
