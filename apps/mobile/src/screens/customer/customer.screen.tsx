import { router, useLocalSearchParams } from "expo-router";
import { PencilSimpleIcon } from "phosphor-react-native/src/icons/PencilSimple";
import { View } from "react-native";
import { ArchiveControl } from "@/components/archive-control";
import { Figure, FigurePair } from "@/components/figure-pair";
import { IconButton } from "@/components/icon-button";
import { InfoRow } from "@/components/info-row";
import { PersonSales } from "@/components/person-sales";
import { ScreenQuery } from "@/components/screen-query";
import { formatDayHeading } from "@/lib/dates";
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
				<InfoRow label="Telefone" value={customer.phone} />
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
		<PersonSales
			title={customer.name}
			filter={{ customerId: customer.id }}
			emptyDescription="As vendas com este cliente aparecem aqui."
			bottom={
				<ArchiveControl
					noun="cliente"
					archived={customer.archived}
					archivedText="Cliente arquivado: não aparece nas novas vendas, mas continua no histórico."
					confirmText={`${customer.name} sai das novas vendas. O histórico continua, e dá para reativar depois.`}
					mutation={archive}
				/>
			}
			headerRight={
				<IconButton
					icon={PencilSimpleIcon}
					label="Editar cliente"
					onPress={() => router.push(`/customers/${customer.id}/edit`)}
				/>
			}
		>
			<Numbers customer={customer} />
		</PersonSales>
	);
}

/** A customer's history: what they bought, total spent and last purchase (clientes.md). */
export function CustomerScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const query = useCustomer(id);
	return (
		<ScreenQuery title="Cliente" query={query}>
			{(customer) => <CustomerContent customer={customer} />}
		</ScreenQuery>
	);
}
