import { z } from "zod";
import { optionalPhone, optionalText } from "@/lib/form-fields";
import type { Customer } from "@/queries/customers/customers.types";

/** Customer data (clientes.md): name, phone and note. */
export const customerFormSchema = z.object({
	name: z.string().trim().min(1, "Informe o nome."),
	phone: optionalPhone,
	note: optionalText,
});

export type CustomerFormValues = z.input<typeof customerFormSchema>;

export const EMPTY_CUSTOMER: CustomerFormValues = {
	name: "",
	phone: "",
	note: "",
};

export function customerToForm(customer: Customer): CustomerFormValues {
	return {
		name: customer.name,
		phone: customer.phone ?? "",
		note: customer.note ?? "",
	};
}
