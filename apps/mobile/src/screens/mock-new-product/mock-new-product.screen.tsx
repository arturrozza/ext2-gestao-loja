import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { ChoiceChips } from "@/components/choice-chips";
import { FormField } from "@/components/form-field";
import { FormFooter } from "@/components/form-footer";
import { FormSection } from "@/components/form-section";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { formErrors } from "@/lib/form-errors";
import { parseBRNumber } from "@/lib/mock-erp-data";
import {
	CATEGORIES,
	type Category,
	newProductSchema,
} from "./mock-new-product.schema";

const EMPTY = {
	name: "",
	sku: "",
	price: "",
	cost: "",
	stock: "",
	minStock: "",
};
type TextField = keyof typeof EMPTY;

function marginHint(price: number, cost: number) {
	if (!(price > 0) || !(cost >= 0) || cost > price) return undefined;
	return `Margem de ${Math.round(((price - cost) / price) * 100)}%`;
}

export function MockNewProductScreen() {
	const router = useRouter();
	const [fields, setFields] = useState(EMPTY);
	const [category, setCategory] = useState<Category>();
	const [submitted, setSubmitted] = useState(false);

	const set = (key: TextField) => (text: string) =>
		setFields((current) => ({ ...current, [key]: text }));
	const price = parseBRNumber(fields.price);
	const cost = parseBRNumber(fields.cost);

	const result = newProductSchema.safeParse({
		name: fields.name,
		sku: fields.sku,
		price,
		cost,
		stock: parseBRNumber(fields.stock),
		minStock: parseBRNumber(fields.minStock),
		category,
	});
	const errors = submitted && !result.success ? formErrors(result.error) : {};

	function submit() {
		setSubmitted(true);
		if (result.success) router.back();
	}

	return (
		<KeyboardAvoidingView
			className="flex-1 bg-background"
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<ScreenHeader title="Novo produto" />
			<ScrollView
				contentContainerClassName="gap-6 px-5 pb-8"
				keyboardShouldPersistTaps="handled"
			>
				<FormField
					label="Nome"
					placeholder="Ex.: Perfume Floral Intenso 100ml"
					value={fields.name}
					onChangeText={set("name")}
					error={errors.name}
				/>
				<FormField
					label="SKU"
					placeholder="Ex.: PER-001"
					autoCapitalize="characters"
					value={fields.sku}
					onChangeText={set("sku")}
					error={errors.sku}
				/>
				<FormSection title="Categoria" error={errors.category}>
					<ChoiceChips
						options={CATEGORIES}
						value={category}
						onChange={setCategory}
					/>
				</FormSection>
				<View className="flex-row gap-3">
					<View className="flex-1">
						<FormField
							label="Preço (R$)"
							placeholder="0,00"
							keyboardType="decimal-pad"
							value={fields.price}
							onChangeText={set("price")}
							error={errors.price}
						/>
					</View>
					<View className="flex-1">
						<FormField
							label="Custo (R$)"
							placeholder="0,00"
							keyboardType="decimal-pad"
							value={fields.cost}
							onChangeText={set("cost")}
							error={errors.cost}
							hint={marginHint(price, cost)}
						/>
					</View>
				</View>
				<View className="flex-row gap-3">
					<View className="flex-1">
						<FormField
							label="Estoque inicial"
							placeholder="0"
							keyboardType="number-pad"
							value={fields.stock}
							onChangeText={set("stock")}
							error={errors.stock}
						/>
					</View>
					<View className="flex-1">
						<FormField
							label="Estoque mínimo"
							placeholder="0"
							keyboardType="number-pad"
							value={fields.minStock}
							onChangeText={set("minStock")}
							error={errors.minStock}
						/>
					</View>
				</View>
			</ScrollView>
			<FormFooter>
				<Button size="lg" onPress={submit}>
					<Text>Salvar produto</Text>
				</Button>
			</FormFooter>
		</KeyboardAvoidingView>
	);
}
