import { router } from "expo-router";
import { MagnifyingGlassIcon } from "phosphor-react-native/src/icons/MagnifyingGlass";
import { PlusIcon } from "phosphor-react-native/src/icons/Plus";
import { UserIcon } from "phosphor-react-native/src/icons/User";
import { useState } from "react";
import { View } from "react-native";
import {
	ActiveFilters,
	FilterControl,
	filterGroup,
} from "@/components/filters";
import { IconButton } from "@/components/icon-button";
import { ItemRow } from "@/components/item-row";
import { PersonAvatar } from "@/components/person-avatar";
import { EmptyState } from "@/components/query-states";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { SearchField } from "@/components/search-field";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useInfiniteList } from "@/components/use-infinite-list";
import { formatDayHeading } from "@/lib/dates";
import { plural } from "@/lib/labels";
import { formatPhone } from "@/lib/masks";
import { formatMoney } from "@/lib/money";
import { searchParam } from "@/lib/search";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { Customer } from "@/queries/customers/customers.types";
import { useCustomers } from "@/queries/customers/use-customers";

type ListView = "active" | "archived";

const VIEWS: { value: ListView; label: string }[] = [
	{ value: "active", label: "Ativos" },
	{ value: "archived", label: "Arquivados" },
];

/** "Comprou hoje · (11) 99100-4510": when they last bought, and the phone to reach them. */
function customerLine(customer: Customer) {
	const last = customer.lastPurchaseAt
		? `Comprou ${formatDayHeading(customer.lastPurchaseAt).toLowerCase()}`
		: "Nenhuma compra ainda";
	return [last, formatPhone(customer.phone)].filter(Boolean).join(" · ");
}

function CustomerRow({ customer }: { customer: Customer }) {
	const bought = customer.purchasesCount > 0;
	return (
		<ItemRow
			href={`/customers/${customer.id}`}
			label={customer.name}
			leading={<PersonAvatar name={customer.name} />}
			title={customer.name}
			subtitle={customerLine(customer)}
			value={bought ? formatMoney(customer.totalSpent) : undefined}
			note={
				bought
					? plural(customer.purchasesCount, "compra", "compras")
					: undefined
			}
		/>
	);
}

function NoCustomers({
	filtered,
	onCreate,
}: {
	filtered: boolean;
	onCreate: () => void;
}) {
	if (filtered) {
		return (
			<EmptyState
				icon={MagnifyingGlassIcon}
				title="Nenhum cliente aqui"
				description="Tente outra busca ou outro filtro."
			/>
		);
	}
	return (
		<EmptyState
			icon={UserIcon}
			title="Nenhum cliente ainda"
			description="Cadastre os clientes fixos para saber o que cada um compra."
			action={
				<Button onPress={onCreate}>
					<Text>Cadastrar cliente</Text>
				</Button>
			}
		/>
	);
}

/** Regular customers (clientes.md), searchable, paginated. */
export function CustomersScreen() {
	const [search, setSearch] = useState("");
	const [view, setView] = useState<ListView>("active");
	const query = useCustomers({
		search: useDebouncedValue(search),
		archived: view === "archived",
	});
	const create = () => router.push("/customers/new");
	const list = useInfiniteList(
		query,
		<NoCustomers
			filtered={searchParam(search) !== undefined || view === "archived"}
			onCreate={create}
		/>,
	);

	const filters = [
		filterGroup({
			key: "status",
			title: "Situação",
			options: VIEWS,
			value: view,
			defaultValue: "active",
			onChange: setView,
		}),
	];

	return (
		<ScreenLayout
			header={
				<ScreenHeader
					title="Clientes"
					right={
						<IconButton
							icon={PlusIcon}
							label="Novo cliente"
							variant="primary"
							onPress={create}
						/>
					}
				/>
			}
			list={{
				...list,
				keyExtractor: (customer) => customer.id,
				renderItem: (customer) => <CustomerRow customer={customer} />,
			}}
		>
			<View className="gap-3">
				<View className="flex-row gap-2">
					<View className="flex-1">
						<SearchField
							value={search}
							onChangeText={setSearch}
							placeholder="Nome ou telefone"
						/>
					</View>
					<FilterControl groups={filters} />
				</View>
				<ActiveFilters groups={filters} />
			</View>
		</ScreenLayout>
	);
}
