import { router, useLocalSearchParams } from "expo-router";
import { PencilSimpleIcon } from "phosphor-react-native/src/icons/PencilSimple";
import { View } from "react-native";
import { ArchiveControl } from "@/components/archive-control";
import { Figure, FigurePair } from "@/components/figure-pair";
import { IconButton } from "@/components/icon-button";
import { InfoRow } from "@/components/info-row";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { ScreenQuery } from "@/components/screen-query";
import { UnderConstructionCard } from "@/components/under-construction";
import { formatDayHeading } from "@/lib/dates";
import { formatPhone } from "@/lib/masks";
import { formatMoney } from "@/lib/money";
import type { Customer } from "@/queries/customers/customers.types";
import {
	useCustomer,
	useSetCustomerArchived,
} from "@/queries/customers/use-customers";

function Numbers({ customer }: { customer: Customer }) {
	return (
		<View className="overflow-hidden rounded-2xl bg-background">
			<View className="p-5">
				<FigurePair>
					<Figure
						label="Total gasto"
						value={formatMoney(customer.totalSpent)}
						note={
							customer.lastPurchaseAt
								? `última ${formatDayHeading(customer.lastPurchaseAt).toLowerCase()}`
								: "nenhuma compra ainda"
						}
					/>
					<Figure
						label="Compras"
						value={String(customer.purchasesCount)}
						note={customer.purchasesCount === 1 ? "venda" : "vendas"}
					/>
				</FigurePair>
			</View>
			<View className="border-border border-t">
				<InfoRow label="Telefone" value={formatPhone(customer.phone)} />
				{customer.note ? (
					<InfoRow label="Observação" value={customer.note} />
				) : null}
			</View>
		</View>
	);
}

function CustomerContent({ customer }: { customer: Customer }) {
	const archive = useSetCustomerArchived(customer.id);
	return (
		<ScreenLayout
			header={
				<ScreenHeader
					title={customer.name}
					right={
						customer.archived ? undefined : (
							<IconButton
								icon={PencilSimpleIcon}
								label="Editar cliente"
								onPress={() => router.push(`/customers/${customer.id}/edit`)}
							/>
						)
					}
				/>
			}
			contentClassName="gap-7"
		>
			<Numbers customer={customer} />
			{/* Becomes the list of their sales (`PersonSales`) with the sales module (MUN-16). */}
			<UnderConstructionCard
				title="Compras"
				description="O histórico de compras, o total gasto e a última compra chegam com as vendas."
			/>
			<ArchiveControl
				noun="cliente"
				archived={customer.archived}
				archivedText="Cliente arquivado: não aparece nas novas vendas, mas continua no histórico. Para editar, reative."
				confirmText={`${customer.name} sai das novas vendas. O histórico continua, e dá para reativar depois.`}
				mutation={archive}
			/>
		</ScreenLayout>
	);
}

/**
 * A customer (clientes.md): their numbers, data and the archive control. What they bought comes with the sales module
 * (MUN-16); until then that block is under construction. Archived ones aren't edited, only reactivated.
 */
export function CustomerScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const query = useCustomer(id);
	return (
		<ScreenQuery title="Cliente" query={query}>
			{(customer) => <CustomerContent customer={customer} />}
		</ScreenQuery>
	);
}
