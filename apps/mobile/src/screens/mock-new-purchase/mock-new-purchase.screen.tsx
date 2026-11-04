import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { ChoiceChips } from "@/components/choice-chips";
import { DetailLine } from "@/components/detail-line";
import { FormField } from "@/components/form-field";
import { FormFooter } from "@/components/form-footer";
import { FormSection } from "@/components/form-section";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { formErrors } from "@/lib/form-errors";
import {
	formatBRL,
	MOCK_PRODUCTS,
	type MockProduct,
	parseBRNumber,
} from "@/lib/mock-erp-data";
import { newPurchaseSchema } from "./mock-new-purchase.schema";

const PRODUCT_OPTIONS = MOCK_PRODUCTS.map((p) => ({
	value: p.sku,
	label: p.name.split(" ").slice(0, 2).join(" "),
}));

/** Weighted average cost after the entry (mock of the real rule). */
function CostPreview({
	product,
	quantity,
	unitCost,
}: {
	product: MockProduct;
	quantity: number;
	unitCost: number;
}) {
	const newStock = product.stock + quantity;
	const newCost =
		(product.stock * product.cost + quantity * unitCost) / newStock;

	return (
		<Animated.View entering={FadeIn.duration(220)}>
			<View className="gap-2.5 rounded-3xl bg-card p-4">
				<Text className="font-sans-medium text-sm">Depois desta compra</Text>
				<DetailLine
					label="Estoque"
					value={`${product.stock} → ${newStock} un.`}
				/>
				<DetailLine
					label="Custo médio"
					value={`${formatBRL(product.cost)} → ${formatBRL(newCost)}`}
				/>
				<DetailLine
					label="Margem no preço atual"
					value={`${Math.round(((product.price - newCost) / product.price) * 100)}%`}
				/>
			</View>
		</Animated.View>
	);
}

export function MockNewPurchaseScreen() {
	const router = useRouter();
	const [sku, setSku] = useState<string>();
	const [quantity, setQuantity] = useState("");
	const [unitCost, setUnitCost] = useState("");
	const [expiry, setExpiry] = useState("");
	const [submitted, setSubmitted] = useState(false);

	const values = {
		sku,
		quantity: parseBRNumber(quantity),
		unitCost: parseBRNumber(unitCost),
		expiry: expiry.trim() === "" ? undefined : expiry,
	};
	const result = newPurchaseSchema.safeParse(values);
	const errors = submitted && !result.success ? formErrors(result.error) : {};
	const product = MOCK_PRODUCTS.find((p) => p.sku === sku);
	const canPreview = product && values.quantity > 0 && values.unitCost >= 0;

	function submit() {
		setSubmitted(true);
		if (result.success) router.back();
	}

	return (
		<KeyboardAvoidingView
			className="flex-1 bg-background"
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<ScreenHeader title="Registrar compra" />
			<ScrollView
				contentContainerClassName="gap-6 px-5 pb-8"
				keyboardShouldPersistTaps="handled"
			>
				<FormSection title="Produto" error={errors.sku}>
					<ChoiceChips
						options={PRODUCT_OPTIONS}
						value={sku}
						onChange={setSku}
					/>
				</FormSection>
				<View className="flex-row gap-3">
					<View className="flex-1">
						<FormField
							label="Quantidade"
							placeholder="0"
							keyboardType="number-pad"
							value={quantity}
							onChangeText={setQuantity}
							error={errors.quantity}
						/>
					</View>
					<View className="flex-1">
						<FormField
							label="Custo unitário (R$)"
							placeholder="0,00"
							keyboardType="decimal-pad"
							value={unitCost}
							onChangeText={setUnitCost}
							error={errors.unitCost}
							hint="Já com frete, se tiver"
						/>
					</View>
				</View>
				<FormField
					label="Validade"
					placeholder="MM/AAAA"
					keyboardType="numbers-and-punctuation"
					value={expiry}
					onChangeText={setExpiry}
					error={errors.expiry}
					hint="Deixe vazio se o produto não controla validade"
				/>
				{canPreview && product ? (
					<CostPreview
						product={product}
						quantity={values.quantity}
						unitCost={values.unitCost}
					/>
				) : null}
			</ScrollView>
			<FormFooter>
				<Button size="lg" onPress={submit}>
					<Text>Registrar entrada</Text>
				</Button>
			</FormFooter>
		</KeyboardAvoidingView>
	);
}
