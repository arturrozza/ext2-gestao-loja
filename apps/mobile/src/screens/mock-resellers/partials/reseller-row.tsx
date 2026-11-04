import { Phone } from "lucide-react-native";
import { View } from "react-native";
import { DetailLine } from "@/components/detail-line";
import { ExpandableRow } from "@/components/expandable-row";
import { Price } from "@/components/price";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
	formatBRL,
	formatPercent,
	type MockReseller,
} from "@/lib/mock-erp-data";

function initials(name: string) {
	return name
		.split(" ")
		.slice(0, 2)
		.map((part) => part[0])
		.join("");
}

function ResellerSummary({ reseller }: { reseller: MockReseller }) {
	const pending = reseller.pendingSettlement > 0;

	return (
		<View className="flex-row items-center gap-3">
			<View className="h-14 w-14 items-center justify-center rounded-full bg-card">
				<Text className="font-sans-semibold text-muted-foreground">
					{initials(reseller.name)}
				</Text>
			</View>
			<View className="flex-1 gap-1">
				<Text className="font-sans-medium">{reseller.name}</Text>
				{pending ? (
					<StatusPill
						label={`Deve ${formatBRL(reseller.pendingSettlement)}`}
						tone="highlight"
					/>
				) : (
					<StatusPill label="Em dia" />
				)}
			</View>
			<View className="items-end gap-0.5">
				<Price value={reseller.monthSales} className="text-base" />
				<Text className="text-muted-foreground text-xs">no mês</Text>
			</View>
		</View>
	);
}

function ResellerDetails({ reseller }: { reseller: MockReseller }) {
	return (
		<View className="gap-3">
			<View className="gap-2.5 rounded-2xl bg-card p-4">
				<DetailLine
					label="Comissão padrão"
					value={formatPercent(reseller.commissionRate)}
				/>
				<DetailLine
					label="Comissão no mês"
					value={formatBRL(reseller.monthSales * reseller.commissionRate)}
				/>
				<DetailLine label="Cidade" value={reseller.city} />
			</View>
			<View className="flex-row gap-2">
				<Button size="sm" className="flex-1">
					<Text>Registrar acerto</Text>
				</Button>
				<Button variant="outline" size="sm" className="flex-1">
					<Icon as={Phone} size={16} />
					<Text>{reseller.phone}</Text>
				</Button>
			</View>
		</View>
	);
}

export function ResellerRow({ reseller }: { reseller: MockReseller }) {
	return (
		<ExpandableRow summary={<ResellerSummary reseller={reseller} />}>
			<ResellerDetails reseller={reseller} />
		</ExpandableRow>
	);
}
