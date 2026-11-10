import { z } from "zod";
import {
	optionalAddress,
	optionalPhone,
	optionalText,
} from "@/lib/form-fields";
import { formatPhone } from "@/lib/masks";
import type { Customer } from "@/queries/customers/customers.types";

/** Customer data (clientes.md): name, phone, address and note. */
export const customerFormSchema = z.object({
	name: z.string().trim().min(1, "Informe o nome."),
	phone: optionalPhone,
	address: optionalAddress,
	note: optionalText,
});

export type CustomerFormValues = z.input<typeof customerFormSchema>;

export const EMPTY_CUSTOMER: CustomerFormValues = {
	name: "",
	phone: "",
	address: "",
	note: "",
};

export function customerToForm(customer: Customer): CustomerFormValues {
	return {
		name: customer.name,
		phone: formatPhone(customer.phone) ?? "",
		address: customer.address ?? "",
		note: customer.note ?? "",
	};
}
