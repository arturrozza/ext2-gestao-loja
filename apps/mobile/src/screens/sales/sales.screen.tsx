import { router } from "expo-router";
import { ReceiptIcon } from "phosphor-react-native/src/icons/Receipt";
import { useState } from "react";
import { View } from "react-native";
import { Figure, FigurePair } from "@/components/figure-pair";
import {
	FilterControl,
	filterGroup,
	multiFilterGroup,
} from "@/components/filters";
import { PageTitle } from "@/components/page-title";
import { EmptyState } from "@/components/query-states";
import { SaleRow } from "@/components/sale-row";
import { ScreenLayout } from "@/components/screen-layout";
import { FiguresSkeleton } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useInfiniteList } from "@/components/use-infinite-list";
import {
	formatDayHeading,
	fromISODate,
	monthName,
	todayISODate,
} from "@/lib/dates";
import { plural, SALE_CHANNELS, SALE_PERIODS, toOptions } from "@/lib/labels";
import { divideRounded, formatMoney, formatRatio } from "@/lib/money";
import type {
	SaleChannel,
	SalePage,
	SalePeriod,
	SaleResult,
} from "@/queries/sales/sales.types";
import { useSales } from "@/queries/sales/use-sales";

type ResultView = "all" | SaleResult;

const RESULTS: { value: ResultView; label: string }[] = [
	{ value: "profit", label: "Com lucro" },
	{ value: "loss", label: "Com prejuízo" },
];

/**
 * Line under the title, always there so the header never jumps when a filter changes: the period in words and, when
 * filtered, the channels and the result.
 */
function periodDescription(
	period: SalePeriod,
	channels: SaleChannel[],
	result: ResultView,
) {
	const today = fromISODate(todayISODate());
	const month = monthName(today.getMonth());
	const words: Record<SalePeriod, string> = {
		today: `Hoje, ${today.getDate()} de ${month}`,
		"7d": "Últimos 7 dias",
		month: `${month.charAt(0).toUpperCase()}${month.slice(1)} de ${today.getFullYear()}`,
		all: "Todas as vendas",
	};
	const names = channels.map((channel) => SALE_CHANNELS[channel]);
	const outcome = RESULTS.find((option) => option.value === result)?.label;
	return [words[period], ...names, outcome].filter(Boolean).join(" · ");
}

/** What the period sold and what was left: the two numbers side by side, with the count and the margin under them. */
function Totals({ totals }: { totals: SalePage["totals"] }) {
	const revenue = totals.revenue;
	const profit = totals.profit;
	const margin = revenue > 0 ? formatRatio(profit / revenue) : "—";
	const average =
		totals.count > 0 ? formatMoney(divideRounded(revenue, totals.count)) : "—";

	return (
		<View className="rounded-2xl bg-background p-5">
			<FigurePair>
				<Figure
					label="Vendido"
					value={formatMoney(totals.revenue)}
					note={`${plural(totals.count, "venda", "vendas")} · média ${average}`}
				/>
				<Figure
					label="Lucro real"
					value={formatMoney(totals.profit)}
					note={`margem ${margin}`}
					danger={profit < 0}
					good={profit > 0}
				/>
			</FigurePair>
		</View>
	);
}

/**
 * Vendas tab (vendas.md): totals of the filter, then the sales, newest first. Canceled ones stay in the list, marked,
 * but don't count. Period and channel filters live in a sheet. New sales start at the tab bar's "+".
 */
export function SalesScreen() {
	const [period, setPeriod] = useState<SalePeriod>("month");
	const [channels, setChannels] = useState<SaleChannel[]>([]);
	const [result, setResult] = useState<ResultView>("all");
	const query = useSales({
		period,
		channels,
		result: result === "all" ? null : result,
	});
	// Off on the default view, so a store with no sales sees "Nenhuma venda ainda" and not "try another filter".
	const filtered =
		period !== "month" || channels.length > 0 || result !== "all";
	const newSale = () => router.push("/sales/new");
	const list = useInfiniteList(
		query,
		<EmptyState
			icon={ReceiptIcon}
			title={filtered ? "Nenhuma venda aqui" : "Nenhuma venda ainda"}
			description={
				filtered
					? "Tente outro período ou filtro."
					: "Registre a primeira venda para ver o lucro real."
			}
			action={
				<Button onPress={newSale}>
					<Text>Registrar venda</Text>
				</Button>
			}
		/>,
		{ leading: "stack" },
	);
	const totals = query.data?.pages[0]?.totals;
	const filters = [
		filterGroup({
			key: "period",
			title: "Período",
			options: toOptions(SALE_PERIODS),
			value: period,
			defaultValue: "month",
			onChange: setPeriod,
		}),
		multiFilterGroup({
			key: "channel",
			title: "Canal",
			options: toOptions(SALE_CHANNELS),
			values: channels,
			onChange: setChannels,
		}),
		filterGroup({
			key: "result",
			title: "Resultado",
			options: RESULTS,
			value: result,
			defaultValue: "all",
			onChange: setResult,
		}),
	];

	return (
		<ScreenLayout
			bottom="tabs"
			compactTitle="Vendas"
			contentClassName="gap-5"
			list={{
				...list,
				keyExtractor: (sale) => sale.id,
				sectionOf: (sale) => formatDayHeading(sale.date),
				renderItem: (sale) => <SaleRow sale={sale} showDate={false} />,
			}}
		>
			<PageTitle
				title="Vendas"
				subtitle={periodDescription(period, channels, result)}
				right={<FilterControl variant="icon" groups={filters} />}
			/>
			{totals ? <Totals totals={totals} /> : null}
			{!totals && query.isPending ? <FiguresSkeleton /> : null}
		</ScreenLayout>
	);
}
