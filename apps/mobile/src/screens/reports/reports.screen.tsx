import { ChartBarIcon } from "phosphor-react-native/src/icons/ChartBar";
import { useState } from "react";
import { View } from "react-native";
import { ChoiceChips } from "@/components/choice-chips";
import { ActiveFilters, FilterControl } from "@/components/filters";
import { EmptyState, QueryView } from "@/components/query-states";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { DetailSkeleton } from "@/components/skeleton";
import { Text } from "@/components/ui/text";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Report } from "@/queries/reports/reports.types";
import { useReport } from "@/queries/reports/use-reports";
import { CustomRange, useReportPeriod } from "./partials/period-picker";
import { ReportProducts } from "./partials/report-products";
import {
	ReportCategories,
	ReportChannels,
	ReportCosts,
	ReportEvolution,
	ReportResellers,
	ReportSummary,
} from "./partials/report-sections";

type ReportView = "summary" | "products" | "channels";

const VIEWS: { value: ReportView; label: string }[] = [
	{ value: "summary", label: "Resumo" },
	{ value: "products", label: "Produtos" },
	{ value: "channels", label: "Canais" },
];

function ReportBody({ report, view }: { report: Report; view: ReportView }) {
	if (report.summary.count === 0) {
		return (
			<EmptyState
				icon={ChartBarIcon}
				title="Nenhuma venda neste período"
				description="Vendas canceladas não contam. Tente outro período."
			/>
		);
	}
	if (view === "products") {
		return (
			<>
				<ReportProducts products={report.products} />
				<ReportCategories categories={report.categories} />
			</>
		);
	}
	if (view === "channels") {
		return (
			<>
				<ReportChannels channels={report.channels} />
				<ReportResellers resellers={report.resellers} />
			</>
		);
	}
	return (
		<>
			<ReportSummary summary={report.summary} />
			<ReportEvolution report={report} />
			<ReportCosts costs={report.costs} />
		</>
	);
}

/**
 * One report per period (relatorios.md), split in three views so it isn't one endless page: summary (with evolution
 * and costs), products (with categories), channels (with resellers).
 * Canceled sales don't count; the period follows the sale date.
 */
export function ReportsScreen() {
	const { period, applyCustom, group } = useReportPeriod();
	const [view, setView] = useState<ReportView>("summary");
	const query = useReport(period);

	return (
		<ScreenLayout
			header={
				<ScreenHeader
					title="Relatórios"
					right={
						<FilterControl variant="icon" groups={[group]}>
							{(close, draft) =>
								draft[group.key]?.includes("custom") ? (
									<CustomRange
										onApply={(custom) => {
											applyCustom(custom);
											close();
										}}
									/>
								) : null
							}
						</FilterControl>
					}
				/>
			}
			contentClassName="gap-7"
		>
			<View className="gap-2">
				<ChoiceChips
					surface="page"
					options={VIEWS}
					value={view}
					onChange={setView}
				/>
				<ActiveFilters groups={[group]} />
			</View>
			<QueryView query={query} skeleton={<DetailSkeleton />}>
				{(report) => (
					<View
						className={cn("gap-7", query.isPlaceholderData && "opacity-50")}
					>
						<Text className="px-1 text-muted-foreground text-xs">
							{formatDate(report.from)} a {formatDate(report.to)}
						</Text>
						<ReportBody report={report} view={view} />
					</View>
				)}
			</QueryView>
		</ScreenLayout>
	);
}
