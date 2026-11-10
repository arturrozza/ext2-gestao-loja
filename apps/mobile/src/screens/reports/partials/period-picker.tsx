import { useState } from "react";
import { View } from "react-native";
import { DateField } from "@/components/date-field";
import { filterGroup } from "@/components/filters";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { daysBetween, formatDate, parseDateInput } from "@/lib/dates";
import type { ReportPeriod } from "@/queries/reports/reports.types";

/** Same limit as the server (`MAX_RANGE_DAYS` in `reports.period.ts`): it refuses a span of this many days or more. */
const MAX_RANGE_DAYS = 5 * 366;

type Kind = ReportPeriod["kind"];

const KINDS: { value: Kind; label: string }[] = [
	{ value: "today", label: "Hoje" },
	{ value: "7d", label: "7 dias" },
	{ value: "month", label: "Mês atual" },
	{ value: "last_month", label: "Mês anterior" },
	{ value: "custom", label: "Personalizado" },
];

export function CustomRange({
	onApply,
}: {
	onApply: (period: ReportPeriod) => void;
}) {
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const [error, setError] = useState<string | null>(null);

	const apply = () => {
		const start = parseDateInput(from);
		const end = parseDateInput(to);
		if (!start || !end) {
			setError("Informe as duas datas (dd/mm/aaaa).");
			return;
		}
		if (start > end) {
			setError("A data inicial vem depois da final.");
			return;
		}
		if (daysBetween(start, end) >= MAX_RANGE_DAYS) {
			setError("Escolha um período de até 5 anos.");
			return;
		}
		setError(null);
		onApply({ kind: "custom", from: start, to: end });
	};

	return (
		<View className="gap-3">
			<View className="flex-row gap-3">
				<View className="flex-1">
					<DateField
						label="De"
						value={from}
						onChange={setFrom}
						placeholder="dd/mm/aaaa"
						maximumDate={new Date()}
					/>
				</View>
				<View className="flex-1">
					<DateField
						label="Até"
						value={to}
						onChange={setTo}
						placeholder="dd/mm/aaaa"
						maximumDate={new Date()}
					/>
				</View>
			</View>
			{error ? <Text className="text-destructive text-sm">{error}</Text> : null}
			<Button variant="outline" onPress={apply}>
				<Text>Ver período</Text>
			</Button>
		</View>
	);
}

function activeLabel(period: ReportPeriod) {
	return period.kind === "custom"
		? `${formatDate(period.from)} a ${formatDate(period.to)}`
		: undefined;
}

/**
 * Period of the report (relatorios.md), as a filter. Choosing "Personalizado" keeps the last report until the dates in
 * `CustomRange` are applied.
 */
export function useReportPeriod() {
	// `kind` can be "custom" before any dates are applied: `period` then keeps the last report.
	const [kind, setKind] = useState<Kind>("month");
	const [period, setPeriod] = useState<ReportPeriod>({ kind: "month" });

	return {
		kind,
		period,
		applyCustom: (custom: ReportPeriod) => {
			setKind("custom");
			setPeriod(custom);
		},
		group: filterGroup({
			key: "period",
			title: "Período",
			options: KINDS,
			value: kind,
			defaultValue: "month",
			onChange: (next) => {
				setKind(next);
				if (next !== "custom") setPeriod({ kind: next });
			},
			activeLabel: activeLabel(period),
		}),
	};
}
