import type { UseMutationResult } from "@tanstack/react-query";
import { BarcodeIcon } from "phosphor-react-native/src/icons/Barcode";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { FormField } from "@/components/form-field";
import { FormScreen } from "@/components/form-screen";
import { FormSection } from "@/components/form-section";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { hapticTap, withHaptic } from "@/lib/haptics";
import { useZodForm } from "@/lib/use-zod-form";
import type { Product, ProductInput } from "@/queries/products/products.types";
import { CategoryField } from "./category-field";
import {
	type ProductFormValues,
	productFormSchema,
} from "./product-form.schema";

function BarcodeField({
	value,
	error,
	onChange,
}: {
	value: string;
	error?: string;
	onChange: (code: string) => void;
}) {
	const [scanning, setScanning] = useState(false);
	return (
		<View className="flex-row items-start gap-2">
			<View className="flex-1">
				<FormField
					label="Código de barras (opcional)"
					placeholder="Ex.: 7891000000004"
					value={value}
					onChangeText={onChange}
					error={error}
					keyboardType="number-pad"
				/>
			</View>
			<Pressable
				onPress={withHaptic(hapticTap, () => setScanning(true))}
				accessibilityRole="button"
				accessibilityLabel="Ler código de barras com a câmera"
				className="mt-7 h-12 w-12 items-center justify-center rounded-[8px] bg-field active:bg-accent"
			>
				<Icon as={BarcodeIcon} size={20} className="text-foreground/70" />
			</Pressable>
			<BarcodeScanner
				open={scanning}
				onClose={() => setScanning(false)}
				onScanned={(code) => {
					setScanning(false);
					onChange(code);
				}}
			/>
		</View>
	);
}

/**
 * Product create/edit form (produtos.md). Stock and cost aren't here: they only come in through purchases. The photo
 * field comes back with photos (MUN-11).
 * `onSaved` runs after the mutation succeeds (the screen decides where to go).
 */
export function ProductForm({
	title,
	submitLabel,
	initial,
	mutation,
	onSaved,
}: {
	title: string;
	submitLabel: string;
	initial: ProductFormValues;
	mutation: UseMutationResult<Product, Error, ProductInput>;
	onSaved: (product: Product) => void;
}) {
	const form = useZodForm(productFormSchema, initial);
	const { values, errors, set } = form;
	const submit = form.handleSubmit((data) => {
		if (!mutation.isPending)
			mutation.mutate(data, {
				onSuccess: onSaved,
				onError: form.applyApiError,
			});
	});

	return (
		<FormScreen
			title={title}
			error={form.footerError(mutation.error)}
			pending={mutation.isPending}
			submitLabel={submitLabel}
			onSubmit={submit}
		>
			<FormSection>
				<FormField
					label="Nome"
					value={values.name}
					onChangeText={(text) => set("name", text)}
					error={errors.name}
					placeholder="Ex.: Perfume Floral 100ml"
				/>
				<FormField
					label="Preço de venda (R$)"
					value={values.basePrice}
					onChangeText={(text) => set("basePrice", text)}
					error={errors.basePrice}
					hint="Preço normal de venda. Dá para mudar em cada venda."
					keyboardType="decimal-pad"
					placeholder="0,00"
				/>
				<CategoryField
					value={values.categoryId}
					onChange={(id) => set("categoryId", id)}
				/>
			</FormSection>
			<FormSection title="Códigos">
				<BarcodeField
					value={values.barcode}
					error={errors.barcode}
					onChange={(code) => set("barcode", code)}
				/>
				<FormField
					label="Código interno (opcional)"
					placeholder="Ex.: MM-0004"
					value={values.internalCode}
					onChangeText={(text) => set("internalCode", text)}
					error={errors.internalCode}
					autoCapitalize="characters"
				/>
			</FormSection>
			<FormSection
				title="Estoque"
				description="A quantidade e o custo entram pelas compras."
			>
				<FormField
					label="Estoque mínimo (opcional)"
					placeholder="Ex.: 3"
					value={values.minStock}
					onChangeText={(text) => set("minStock", text)}
					error={errors.minStock}
					hint="Abaixo disso, o produto aparece como estoque baixo."
					keyboardType="number-pad"
				/>
				<FormField
					label="Localização (opcional)"
					value={values.location}
					onChangeText={(text) => set("location", text)}
					error={errors.location}
					placeholder="Ex.: Prateleira A3"
				/>
				<View className="flex-row items-center gap-3 px-1">
					<View className="flex-1 gap-0.5">
						<Text className="font-sans-medium text-sm">Tem validade</Text>
						<Text className="text-muted-foreground text-xs">
							A compra pede o mês e o ano de validade.
						</Text>
					</View>
					<Switch
						value={values.hasExpiry}
						onValueChange={(value) => set("hasExpiry", value)}
						accessibilityLabel="Tem validade"
					/>
				</View>
			</FormSection>
		</FormScreen>
	);
}
