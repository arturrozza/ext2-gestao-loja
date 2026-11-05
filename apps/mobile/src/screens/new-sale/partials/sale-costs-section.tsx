import { TrashIcon } from "phosphor-react-native/src/icons/Trash";
import { Pressable, View } from "react-native";
import { AmountField } from "@/components/amount-field";
import { FormField } from "@/components/form-field";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticTap, withHaptic } from "@/lib/haptics";
import { SALE_COST_KINDS } from "@/lib/labels";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { SaleCostKind } from "@/queries/sales/sales.types";
import type { SaleCostDraft } from "../new-sale.schema";
import { manualCost } from "./sale-costs";

function CostRow({
	cost,
	amountCents,
	error,
	onChange,
	onRemove,
}: {
	cost: SaleCostDraft;
	amountCents: number;
	error?: string;
	onChange: (patch: Partial<SaleCostDraft>) => void;
	onRemove: () => void;
}) {
	return (
		<View className="gap-3 border-border border-b pb-4">
			<View className="flex-row items-center justify-between">
				<Text className="font-sans-medium text-sm">
					{SALE_COST_KINDS[cost.kind]}
				</Text>
				<Pressable
					onPress={withHaptic(hapticTap, onRemove)}
					accessibilityRole="button"
					accessibilityLabel={`Remover ${SALE_COST_KINDS[cost.kind]}`}
					hitSlop={8}
				>
					<Icon as={TrashIcon} size={16} className="text-foreground/45" />
				</Pressable>
			</View>
			{cost.kind === "other" ? (
				<FormField
					label="Descrição"
					value={cost.label}
					onChangeText={(label) => onChange({ label })}
					placeholder="Ex.: taxa da maquininha"
				/>
			) : null}
			<AmountField
				label={`Valor de ${SALE_COST_KINDS[cost.kind]}`}
				value={cost.value}
				onChangeText={(value) => onChange({ value })}
				mode={cost.mode}
				onModeChange={(mode) => onChange({ mode })}
				error={error}
			/>
			{cost.mode === "percent" ? (
				<Text className="px-1 text-muted-foreground text-xs">
					{formatCents(amountCents)} sobre a receita
				</Text>
			) : null}
		</View>
	);
}

const ADDABLE: SaleCostKind[] = [
	"freight",
	"tax",
	"platform_fee",
	"commission",
	"other",
];

/**
 * Costs of the sale (vendas.md): freight, tax, platform fee, commission and others, in reais or a percentage of the
 * revenue. Tax, Mercado Livre fee and commission come suggested and stay editable.
 */
export function SaleCostsSection({
	costs,
	amountsCents,
	errors,
	update,
}: {
	costs: SaleCostDraft[];
	amountsCents: number[];
	errors: Record<string, string>;
	update: (change: (costs: SaleCostDraft[]) => SaleCostDraft[]) => void;
}) {
	return (
		<View className="gap-4">
			{costs.map((cost, index) => (
				<CostRow
					key={cost.key}
					cost={cost}
					amountCents={amountsCents[index] ?? 0}
					error={errors[`costs.${index}.value`]}
					onChange={(patch) =>
						update((all) =>
							all.map((c) => (c.key === cost.key ? { ...c, ...patch } : c)),
						)
					}
					onRemove={() =>
						update((all) => all.filter((c) => c.key !== cost.key))
					}
				/>
			))}
			<View className="gap-2">
				<Text className="px-1 text-muted-foreground text-xs">
					Adicionar custo
				</Text>
				<View className="flex-row flex-wrap gap-2">
					{ADDABLE.map((kind) => (
						<Pressable
							key={kind}
							onPress={withHaptic(hapticTap, () =>
								update((all) => [...all, manualCost(kind)]),
							)}
							accessibilityRole="button"
							className={cn(
								"h-9 justify-center rounded-full bg-field px-3 active:bg-accent",
							)}
						>
							<Text className="text-xs">+ {SALE_COST_KINDS[kind]}</Text>
						</Pressable>
					))}
				</View>
			</View>
		</View>
	);
}
