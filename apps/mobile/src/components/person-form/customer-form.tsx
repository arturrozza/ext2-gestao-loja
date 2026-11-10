import type { UseMutationResult } from "@tanstack/react-query";
import { PhoneIcon } from "phosphor-react-native/src/icons/Phone";
import { UserIcon } from "phosphor-react-native/src/icons/User";
import { AddressField } from "@/components/address-field";
import { FormField } from "@/components/form-field";
import { FormScreen } from "@/components/form-screen";
import { FormSection } from "@/components/form-section";
import { maskPhone } from "@/lib/masks";
import { useZodForm } from "@/lib/use-zod-form";
import type {
	Customer,
	CustomerInput,
} from "@/queries/customers/customers.types";
import {
	type CustomerFormValues,
	customerFormSchema,
} from "./customer-form.schema";

type CustomerFormState = Pick<
	ReturnType<typeof useZodForm<typeof customerFormSchema>>,
	"values" | "errors" | "set"
>;

/** The fields of a customer, shared by the form screen and the quick add in the sale's picker. */
export function CustomerFields({ form }: { form: CustomerFormState }) {
	const { values, errors, set } = form;
	return (
		<>
			<FormField
				label="Nome"
				icon={UserIcon}
				placeholder="Nome do cliente"
				value={values.name}
				onChangeText={(text) => set("name", text)}
				error={errors.name}
			/>
			<FormField
				label="Telefone (opcional)"
				icon={PhoneIcon}
				placeholder="(11) 90000-0000"
				value={values.phone}
				onChangeText={(text) => set("phone", maskPhone(text))}
				error={errors.phone}
				keyboardType="phone-pad"
			/>
			<AddressField
				value={values.address}
				onChangeText={(text) => set("address", text)}
				error={errors.address}
			/>
			<FormField
				label="Observação (opcional)"
				placeholder="Ex.: prefere perfumes florais"
				value={values.note}
				onChangeText={(text) => set("note", text)}
				error={errors.note}
			/>
		</>
	);
}

/** Create or edit a customer. */
export function CustomerForm({
	title,
	submitLabel,
	initial,
	mutation,
	onSaved,
}: {
	title: string;
	submitLabel: string;
	initial: CustomerFormValues;
	mutation: UseMutationResult<Customer, Error, CustomerInput>;
	onSaved: (customer: Customer) => void;
}) {
	const form = useZodForm(customerFormSchema, initial);
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
				<CustomerFields form={form} />
			</FormSection>
		</FormScreen>
	);
}
