import { useRouter } from "expo-router";
import { Plus, Truck } from "lucide-react-native";
import { View } from "react-native";
import { DetailLine } from "@/components/detail-line";
import { ExpandableRow } from "@/components/expandable-row";
import { IconButton } from "@/components/icon-button";
import { Price } from "@/components/price";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
	formatBRL,
	MOCK_PURCHASES,
	type MockPurchase,
	purchaseTotal,
} from "@/lib/mock-erp-data";

function PurchaseSummary({ purchase }: { purchase: MockPurchase }) {
	const units = purchase.items.reduce((sum, i) => sum + i.quantity, 0);

	return (
		<View className="flex-row items-center gap-3">
			<View className="h-14 w-14 items-center justify-center rounded-2xl bg-card">
				<Icon as={Truck} size={22} className="text-muted-foreground" />
			</View>
			<View className="flex-1 gap-0.5">
				<Text className="font-sans-medium">Compra #{purchase.id}</Text>
				<Text className="text-muted-foreground text-xs">
					{purchase.date} · {units} unidades
				</Text>
			</View>
			<Price value={purchaseTotal(purchase)} className="text-base" />
		</View>
	);
}

function PurchaseDetails({ purchase }: { purchase: MockPurchase }) {
	return (
		<View className="gap-2.5 rounded-2xl bg-card p-4">
			{purchase.items.map((item) => (
				<View key={item.name} className="gap-0.5">
					<DetailLine
						label={`${item.quantity}× ${item.name}`}
						value={formatBRL(item.quantity * item.unitCost)}
					/>
					<Text className="text-muted-foreground text-xs">
						{formatBRL(item.unitCost)} por unidade · validade{" "}
						{item.expiry ?? "não controla"}
					</Text>
				</View>
			))}
		</View>
	);
}

export function MockPurchasesScreen() {
	const router = useRouter();
	const total = MOCK_PURCHASES.reduce((sum, p) => sum + purchaseTotal(p), 0);

	return (
		<ScreenLayout
			header={
				<ScreenHeader
					title="Compras"
					right={
						<IconButton
							icon={Plus}
							label="Registrar compra"
							variant="primary"
							onPress={() => router.push("/mock/new-purchase")}
						/>
					}
				/>
			}
		>
			<View className="gap-1 rounded-3xl bg-card p-5">
				<Text className="text-muted-foreground text-sm">
					Comprado nos últimos 30 dias
				</Text>
				<Text className="font-sans-semibold text-3xl">{formatBRL(total)}</Text>
				<Text className="text-muted-foreground text-sm">
					Cada compra recalcula o custo médio dos produtos.
				</Text>
			</View>
			<View className="gap-3">
				{MOCK_PURCHASES.map((purchase) => (
					<ExpandableRow
						key={purchase.id}
						summary={<PurchaseSummary purchase={purchase} />}
					>
						<PurchaseDetails purchase={purchase} />
					</ExpandableRow>
				))}
			</View>
		</ScreenLayout>
	);
}
