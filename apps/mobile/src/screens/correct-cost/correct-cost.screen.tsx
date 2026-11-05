import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { FormField } from "@/components/form-field";
import { FormScreen } from "@/components/form-screen";
import { FormSection } from "@/components/form-section";
import { ScreenQuery } from "@/components/screen-query";
import { FormSkeleton } from "@/components/skeleton";
import { showToast } from "@/components/toast";
import { Text } from "@/components/ui/text";
import { units } from "@/lib/labels";
import {
	formatCents,
	formatMoney,
	formatSignedCents,
	parseMoneyInput,
	toCents,
} from "@/lib/money";
import { useZodForm } from "@/lib/use-zod-form";
import type { ProductDetail } from "@/queries/products/products.types";
import { useCorrectCost, useProduct } from "@/queries/products/use-products";
import { correctCostSchema } from "./correct-cost.schema";

function CostPreview({
	product,
	newCostCents,
}: {
	product: ProductDetail;
	newCostCents: number | null;
}) {
	const current = toCents(product.averageCost);
	if (newCostCents === null || newCostCents === current) return null;
	return (
		<View className="gap-1 rounded-2xl bg-background p-4">
			<Text className="text-muted-foreground text-xs">Como fica</Text>
			<Text className="font-sans-semibold text-base">
				{formatCents(current)} → {formatCents(newCostCents)} ·{" "}
				{formatSignedCents((newCostCents - current) * product.stock)} em estoque
			</Text>
			<Text className="text-muted-foreground text-sm">
				{units(product.stock)} passam a valer {formatCents(newCostCents)} cada.
			</Text>
		</View>
	);
}

function CostForm({ product }: { product: ProductDetail }) {
	const correct = useCorrectCost(product.id);
	const form = useZodForm(correctCostSchema, { newCost: "", note: "" });
	const submit = form.handleSubmit((data) => {
		if (!correct.isPending)
			correct.mutate(data, {
				onSuccess: () => {
					showToast("Custo corrigido");
					router.back();
				},
				onError: form.applyApiError,
			});
	});

	return (
		<FormScreen
			title="Corrigir custo"
			error={form.footerError(correct.error)}
			pending={correct.isPending}
			submitLabel="Corrigir custo"
			onSubmit={submit}
		>
			<View className="gap-1 px-1">
				<Text className="font-sans-semibold text-base">{product.name}</Text>
				<Text className="text-muted-foreground text-sm">
					Custo médio atual: {formatMoney(product.averageCost)}. Use quando o
					custo foi lançado errado e já houve venda (aí não dá para cancelar a
					compra).
				</Text>
			</View>
			<FormSection>
				<FormField
					label="Custo certo por unidade (R$)"
					value={form.values.newCost}
					onChangeText={(text) => form.set("newCost", text)}
					error={form.errors.newCost}
					keyboardType="decimal-pad"
					placeholder="0,00"
				/>
				<FormField
					label="Motivo"
					value={form.values.note}
					onChangeText={(text) => form.set("note", text)}
					error={form.errors.note}
					placeholder="Ex.: nota da compra com valor errado"
				/>
			</FormSection>
			<CostPreview
				product={product}
				newCostCents={parseMoneyInput(form.values.newCost)}
			/>
			<Text className="px-1 text-muted-foreground text-xs">
				As próximas vendas usam o custo corrigido. As vendas antigas não mudam:
				para corrigir uma, cancele e lance de novo.
			</Text>
		</FormScreen>
	);
}

/** Fix a wrong average cost (estoque.md, "Corrigir custo"), with the reason recorded. */
export function CorrectCostScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const query = useProduct(id);
	return (
		<ScreenQuery
			title="Corrigir custo"
			query={query}
			skeleton={<FormSkeleton />}
			sheet
		>
			{(product) => <CostForm product={product} />}
		</ScreenQuery>
	);
}
