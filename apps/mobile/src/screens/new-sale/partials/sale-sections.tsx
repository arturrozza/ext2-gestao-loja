import { PlusIcon } from "phosphor-react-native/src/icons/Plus";
import { View } from "react-native";
import { CollapsibleSection } from "@/components/collapsible-section";
import { FormField } from "@/components/form-field";
import { FormFooter } from "@/components/form-footer";
import { FormSection } from "@/components/form-section";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { formatCents, parseMoneyInput } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { useNewSaleForm } from "../use-new-sale-form";
import { ResellerField } from "./reseller-field";
import { SaleItemCard } from "./sale-item-card";
import {
	ADJUSTMENT_OPTIONS,
	CHANNEL_OPTIONS,
	CONDITION_OPTIONS,
	METHOD_OPTIONS,
} from "./sale-options";

type Sale = ReturnType<typeof useNewSaleForm>;

/** Channel, and who sold on the reseller channel. Only active resellers enter new sales (revendedoras.md). */
function ChannelFields({ sale }: { sale: Sale }) {
	const { values, errors } = sale.form;
	const reseller = values.channel === "reseller";
	return (
		<>
			<SelectField
				label="Canal"
				options={CHANNEL_OPTIONS}
				value={values.channel}
				onChange={(channel) => sale.setChannel(channel, null)}
			/>
			{reseller ? (
				<ResellerField
					value={values.reseller}
					onChange={(picked) => sale.setChannel("reseller", picked)}
					error={errors.resellerId}
				/>
			) : null}
		</>
	);
}

export function ItemsSection({
	sale,
	onAdd,
}: {
	sale: Sale;
	onAdd: () => void;
}) {
	const { values, errors } = sale.form;
	return (
		<View className="gap-3">
			<Text className="px-1 font-sans-semibold text-base">Produtos</Text>
			{values.items.map((item, index) => (
				<SaleItemCard
					key={item.key}
					item={item}
					product={sale.products.get(item.product.id)}
					errors={{
						quantity: errors[`items.${index}.quantity`],
						unitPrice: errors[`items.${index}.unitPrice`],
					}}
					onChange={(patch) =>
						sale.updateItems((all) =>
							all.map((i) => (i.key === item.key ? { ...i, ...patch } : i)),
						)
					}
					onRemove={() =>
						sale.updateItems((all) => all.filter((i) => i.key !== item.key))
					}
				/>
			))}
			{errors.items ? (
				<Text className="px-1 text-destructive text-sm">{errors.items}</Text>
			) : null}
			<Button variant="outline" className="bg-background" onPress={onAdd}>
				<Icon as={PlusIcon} size={16} />
				<Text>Adicionar produtos</Text>
			</Button>
		</View>
	);
}

function adjustmentSummary(values: Sale["form"]["values"]) {
	if (values.adjustment === "none") return "Nenhum";
	const label = ADJUSTMENT_OPTIONS.find(
		(a) => a.value === values.adjustment,
	)?.label;
	const cents = parseMoneyInput(values.adjustmentValue);
	return cents === null ? (label ?? "") : `${label} ${formatCents(cents)}`;
}

export function AdjustmentSection({ sale }: { sale: Sale }) {
	const { values, errors, set } = sale.form;
	return (
		<CollapsibleSection
			title="Desconto ou acréscimo"
			summary={adjustmentSummary(values)}
			forceOpen={Boolean(errors.adjustmentValue)}
		>
			<SelectField
				label="Tipo"
				options={ADJUSTMENT_OPTIONS}
				value={values.adjustment}
				onChange={(adjustment) => set("adjustment", adjustment)}
			/>
			{values.adjustment !== "none" ? (
				<FormField
					label="Valor sobre a venda inteira (R$)"
					value={values.adjustmentValue}
					onChangeText={(text) => set("adjustmentValue", text)}
					error={errors.adjustmentValue}
					keyboardType="decimal-pad"
					placeholder="0,00"
				/>
			) : null}
		</CollapsibleSection>
	);
}

/** How the sale happened: channel (and reseller), payment condition and method, in one card. */
export function PaymentSection({ sale }: { sale: Sale }) {
	const { values, errors, set } = sale.form;
	return (
		<FormSection>
			<ChannelFields sale={sale} />
			<SelectField
				label="Pagamento"
				options={CONDITION_OPTIONS}
				value={values.paymentCondition}
				onChange={(condition) => set("paymentCondition", condition)}
			/>
			<SelectField
				label="Forma de pagamento"
				options={METHOD_OPTIONS}
				value={values.paymentMethod}
				onChange={(method) => set("paymentMethod", method)}
				placeholder="Escolher forma"
				error={errors.paymentMethod}
			/>
		</FormSection>
	);
}

function submitLabel(sale: Sale) {
	if (sale.stock.short) return "Estoque insuficiente";
	return "Registrar venda";
}

/** Revenue and profit always in sight, so a loss shows at the point of action; the submit reflects the stock block. */
export function SaleFooter({ sale }: { sale: Sale }) {
	const { revenueCents, profitCents } = sale.breakdown;
	const loss = profitCents < 0;

	return (
		<FormFooter error={sale.form.footerError(sale.create.error)}>
			{sale.form.values.items.length > 0 ? (
				<View className="flex-row justify-between">
					<Text className="text-muted-foreground text-sm">
						Receita {formatCents(revenueCents)}
					</Text>
					<Text
						className={cn(
							"font-sans-semibold text-sm",
							loss && "text-destructive",
						)}
					>
						{loss ? "Prejuízo" : "Lucro"} {formatCents(Math.abs(profitCents))}
					</Text>
				</View>
			) : null}
			<Button
				size="lg"
				onPress={sale.submit}
				disabled={sale.stock.short}
				loading={sale.stock.unknown || sale.create.isPending}
			>
				<Text>{submitLabel(sale)}</Text>
			</Button>
		</FormFooter>
	);
}
