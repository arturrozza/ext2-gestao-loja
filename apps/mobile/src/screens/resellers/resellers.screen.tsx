import { router } from "expo-router";
import { MagnifyingGlassIcon } from "phosphor-react-native/src/icons/MagnifyingGlass";
import { PlusIcon } from "phosphor-react-native/src/icons/Plus";
import { UsersIcon } from "phosphor-react-native/src/icons/Users";
import { useState } from "react";
import { View } from "react-native";
import {
	ActiveFilters,
	FilterControl,
	filterGroup,
} from "@/components/filters";
import { IconButton } from "@/components/icon-button";
import { ItemRow } from "@/components/item-row";
import { ListCard } from "@/components/list-card";
import { PersonAvatar } from "@/components/person-avatar";
import { EmptyState, QueryView } from "@/components/query-states";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { SearchField } from "@/components/search-field";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { plural } from "@/lib/labels";
import { formatMoney, formatPercent } from "@/lib/money";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { Reseller } from "@/queries/resellers/resellers.types";
import { useResellers } from "@/queries/resellers/use-resellers";

type ListView = "active" | "archived";

const VIEWS: { value: ListView; label: string }[] = [
	{ value: "active", label: "Ativas" },
	{ value: "archived", label: "Arquivadas" },
];

function ResellerRow({ reseller }: { reseller: Reseller }) {
	return (
		<ItemRow
			href={`/resellers/${reseller.id}`}
			label={reseller.name}
			leading={<PersonAvatar name={reseller.name} />}
			title={reseller.name}
			subtitle={[
				`Comissão ${formatPercent(reseller.defaultCommission)}`,
				reseller.phone,
			]
				.filter(Boolean)
				.join(" · ")}
			value={formatMoney(reseller.commissionTotal)}
			note={plural(reseller.salesCount, "venda", "vendas")}
		/>
	);
}

function NoResellers({
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
				title="Nenhuma revendedora aqui"
				description="Tente outra busca ou outro filtro."
			/>
		);
	}
	return (
		<EmptyState
			icon={UsersIcon}
			title="Nenhuma revendedora ainda"
			description="Cadastre quem vende para a loja e a comissão entra sozinha no lucro de cada venda."
			action={
				<Button onPress={onCreate}>
					<Text>Cadastrar revendedora</Text>
				</Button>
			}
		/>
	);
}

/** Resellers (revendedoras.md): records, not users. Commission totals leave canceled sales out. */
export function ResellersScreen() {
	const [search, setSearch] = useState("");
	const [view, setView] = useState<ListView>("active");
	const query = useResellers({
		search: useDebouncedValue(search),
		archived: view === "archived",
	});
	const create = () => router.push("/resellers/new");

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
					title="Revendedoras"
					right={
						<IconButton
							icon={PlusIcon}
							label="Nova revendedora"
							variant="primary"
							onPress={create}
						/>
					}
				/>
			}
			contentClassName="gap-5"
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
			<QueryView query={query}>
				{(resellers) =>
					resellers.length === 0 ? (
						<NoResellers
							filtered={Boolean(search) || view === "archived"}
							onCreate={create}
						/>
					) : (
						<ListCard>
							{resellers.map((reseller) => (
								<ResellerRow key={reseller.id} reseller={reseller} />
							))}
						</ListCard>
					)
				}
			</QueryView>
		</ScreenLayout>
	);
}
