import { router, useLocalSearchParams } from "expo-router";
import { PackageIcon } from "phosphor-react-native/src/icons/Package";
import { View } from "react-native";
import { DateField } from "@/components/date-field";
import { FormField } from "@/components/form-field";
import { FormScreen } from "@/components/form-screen";
import { FormSection } from "@/components/form-section";
import { ScreenQuery } from "@/components/screen-query";
import { SelectField } from "@/components/select-field";
import { FormSkeleton } from "@/components/skeleton";
import { showToast } from "@/components/toast";
import { Text } from "@/components/ui/text";
import { formatExpiry } from "@/lib/dates";
import { ADJUSTMENT_REASONS, units } from "@/lib/labels";
import { useZodForm } from "@/lib/use-zod-form";
import type {
	AdjustmentReason,
	ProductDetail,
} from "@/queries/products/products.types";
import { useAdjustStock, useProduct } from "@/queries/products/use-products";
import {
	type AdjustFormValues,
	adjustSchema,
	allowedReasons,
	NO_EXPIRY,
	needsFromExpiry,
	parseQuantity,
} from "./adjust-stock.schema";
import { AdjustPreview } from "./partials/adjust-preview";

/** Expiries the units can leave from. "Vencido descartado" only offers the expired ones. */
function expiryOptions(product: ProductDetail, reason?: AdjustmentReason) {
	return product.expiries
		.filter((e) => reason !== "expired_discarded" || e.expired)
		.map((e) => ({
			value: e.expiry ?? NO_EXPIRY,
			label: `${e.expiry ? formatExpiry(e.expiry) : "Sem validade"} · ${units(e.quantity)}`,
		}));
}

/** Where the units left from (going down, with more than one expiry) or the expiry of the new ones (going up). */
function ExpirySection({
	product,
	quantity,
	form,
}: {
	product: ProductDetail;
	quantity: number | null;
	form: {
		values: AdjustFormValues;
		errors: Record<string, string>;
		set: <K extends keyof AdjustFormValues>(
			key: K,
			value: AdjustFormValues[K],
		) => void;
	};
}) {
	const { values, errors, set } = form;
	if (quantity === null || quantity === product.stock) return null;
	if (quantity < product.stock) {
		if (!needsFromExpiry(product, quantity)) return null;
		return (
			<FormSection>
				<SelectField
					label="De qual validade saiu?"
					options={expiryOptions(product, values.reason)}
					value={values.fromExpiry}
					onChange={(key) => set("fromExpiry", key)}
					placeholder="Escolher validade"
					error={errors.fromExpiry}
				/>
			</FormSection>
		);
	}
	if (!product.hasExpiry) return null;
	return (
		<FormSection
			title="Validade das unidades novas"
			description="Entram com o custo médio atual, que não muda."
		>
			<DateField
				label="Mês/ano"
				mode="month"
				value={values.expiry}
				onChange={(expiry) => set("expiry", expiry)}
				error={errors.expiry}
				placeholder="Escolher mês e ano"
			/>
		</FormSection>
	);
}

function AdjustForm({ product }: { product: ProductDetail }) {
	const adjust = useAdjustStock(product.id);
	// "Descartar" on an expired-product alert arrives with the reason chosen.
	const params = useLocalSearchParams<{ reason?: string }>();
	const reason =
		params.reason && Object.hasOwn(ADJUSTMENT_REASONS, params.reason)
			? (params.reason as AdjustmentReason)
			: undefined;
	const form = useZodForm(adjustSchema(product), {
		newQuantity: String(product.stock),
		reason,
		note: "",
		fromExpiry: undefined,
		expiry: "",
	} satisfies AdjustFormValues);
	const { values, errors, set } = form;
	const quantity = parseQuantity(values.newQuantity);

	const submit = form.handleSubmit((data) => {
		if (!adjust.isPending)
			adjust.mutate(data, {
				onSuccess: () => {
					showToast("Estoque ajustado");
					router.back();
				},
				onError: form.applyApiError,
			});
	});

	return (
		<FormScreen
			title="Ajustar estoque"
			error={form.footerError(adjust.error)}
			pending={adjust.isPending}
			submitLabel="Confirmar ajuste"
			onSubmit={submit}
		>
			<View className="gap-1 px-1">
				<Text className="font-sans-semibold text-base">{product.name}</Text>
				<Text className="text-muted-foreground text-sm">
					Agora: {units(product.stock)}. Informe quanto tem de verdade na
					prateleira.
				</Text>
			</View>
			<FormSection>
				<FormField
					label="Quantidade certa"
					icon={PackageIcon}
					placeholder="Ex.: 8"
					value={values.newQuantity}
					onChangeText={(text) => set("newQuantity", text.replace(/\D/g, ""))}
					error={errors.newQuantity}
					keyboardType="number-pad"
					selectTextOnFocus
				/>
			</FormSection>
			<FormSection>
				<SelectField
					label="Motivo"
					placeholder="Escolher motivo"
					error={errors.reason}
					options={allowedReasons(product, quantity).map((value) => ({
						value,
						label: ADJUSTMENT_REASONS[value],
					}))}
					value={values.reason}
					onChange={(reason) => {
						// The offered expiries depend on the reason: choose again.
						form.setValues((current) => ({
							...current,
							reason,
							fromExpiry: undefined,
						}));
						form.clearServerErrors("reason");
						form.clearServerErrors("fromExpiry");
					}}
				/>
				<FormField
					label={
						values.reason === "other" ? "Explique" : "Observação (opcional)"
					}
					value={values.note}
					onChangeText={(text) => set("note", text)}
					placeholder={
						values.reason === "other"
							? "O que aconteceu com as unidades"
							: "Ex.: caixa amassada na entrega"
					}
					error={errors.note}
				/>
			</FormSection>
			<ExpirySection product={product} quantity={quantity} form={form} />
			<AdjustPreview
				product={product}
				newQuantity={quantity}
				reason={values.reason}
			/>
		</FormScreen>
	);
}

/** Fix the quantity when the app doesn't match the shelf (estoque.md, "Ajuste"), with the effect shown first. */
export function AdjustStockScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const query = useProduct(id);
	return (
		<ScreenQuery
			title="Ajustar estoque"
			query={query}
			skeleton={<FormSkeleton />}
			sheet
		>
			{(product) => <AdjustForm product={product} />}
		</ScreenQuery>
	);
}
