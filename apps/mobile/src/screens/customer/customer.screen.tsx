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
import { formatPhone } from "@/lib/masks";
import { formatMoney } from "@/lib/money";
import type { Customer } from "@/queries/customers/customers.types";
import {
	useCustomer,
	useSetCustomerArchived,
} from "@/queries/customers/use-customers";
import { WhatsAppLink } from "./partials/whatsapp-link";

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
				{customer.address ? (
					<InfoRow label="Endereço" value={customer.address} />
				) : null}
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
			headerRight={
				customer.archived ? undefined : (
					<IconButton
						icon={PencilSimpleIcon}
						label="Editar cliente"
						onPress={() => router.push(`/customers/${customer.id}/edit`)}
					/>
				)
			}
			filter={{ customerId: customer.id }}
			period="all"
			emptyDescription="As vendas com este cliente aparecem aqui."
			bottom={
				<ArchiveControl
					noun="cliente"
					archived={customer.archived}
					archivedText="Cliente arquivado: não aparece nas novas vendas, mas continua no histórico. Para editar, reative."
					confirmText={`${customer.name} sai das novas vendas. O histórico continua, e dá para reativar depois.`}
					mutation={archive}
				/>
			}
		>
			<View className="gap-3">
				<Numbers customer={customer} />
				{customer.phone ? <WhatsAppLink phone={customer.phone} /> : null}
			</View>
		</PersonSales>
	);
}

/**
 * A customer (clientes.md): their numbers and data, what they bought (canceled sales marked, out of the totals) and the
 * archive control. Archived ones aren't edited, only reactivated.
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
