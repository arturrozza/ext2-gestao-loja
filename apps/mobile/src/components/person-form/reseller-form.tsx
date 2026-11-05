import type { UseMutationResult } from "@tanstack/react-query";
import { FormField } from "@/components/form-field";
import { FormScreen } from "@/components/form-screen";
import { FormSection } from "@/components/form-section";
import { maskPhone } from "@/lib/masks";
import { useZodForm } from "@/lib/use-zod-form";
import type {
	Reseller,
	ResellerInput,
} from "@/queries/resellers/resellers.types";
import {
	type ResellerFormValues,
	resellerFormSchema,
} from "./reseller-form.schema";

type ResellerFormState = Pick<
	ReturnType<typeof useZodForm<typeof resellerFormSchema>>,
	"values" | "errors" | "set"
>;

/** The fields of a reseller, shared by the form screen and the quick add in the sale's picker. */
export function ResellerFields({ form }: { form: ResellerFormState }) {
	const { values, errors, set } = form;
	return (
		<>
			<FormField
				label="Nome"
				placeholder="Nome da revendedora"
				value={values.name}
				onChangeText={(text) => set("name", text)}
				error={errors.name}
			/>
			<FormField
				label="Telefone (opcional)"
				placeholder="(11) 90000-0000"
				value={values.phone}
				onChangeText={(text) => set("phone", maskPhone(text))}
				error={errors.phone}
				keyboardType="phone-pad"
			/>
			<FormField
				label="Comissão padrão (%)"
				value={values.defaultCommission}
				onChangeText={(text) => set("defaultCommission", text)}
				error={errors.defaultCommission}
				hint="Vem preenchida na venda e dá para mudar só naquela venda."
				keyboardType="decimal-pad"
				placeholder="10"
			/>
			<FormField
				label="Observação (opcional)"
				placeholder="Ex.: atende o bairro Jardins"
				value={values.note}
				onChangeText={(text) => set("note", text)}
				error={errors.note}
			/>
		</>
	);
}

/** Create or edit a reseller. A new default commission doesn't touch past sales (revendedoras.md). */
export function ResellerForm({
	title,
	submitLabel,
	initial,
	mutation,
	onSaved,
}: {
	title: string;
	submitLabel: string;
	initial: ResellerFormValues;
	mutation: UseMutationResult<Reseller, Error, ResellerInput>;
	onSaved: (reseller: Reseller) => void;
}) {
	const form = useZodForm(resellerFormSchema, initial);
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
				<ResellerFields form={form} />
			</FormSection>
		</FormScreen>
	);
}
