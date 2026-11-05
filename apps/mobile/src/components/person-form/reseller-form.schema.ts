import { z } from "zod";
import { optionalPhone, optionalText, percentField } from "@/lib/form-fields";
import { percentToInput } from "@/lib/money";
import type { Reseller } from "@/queries/resellers/resellers.types";

/** Reseller data (revendedoras.md): name, phone, default commission and note. */
export const resellerFormSchema = z.object({
	name: z.string().trim().min(1, "Informe o nome."),
	phone: optionalPhone,
	defaultCommission: percentField("Informe a comissão entre 0 e 100%."),
	note: optionalText,
});

export type ResellerFormValues = z.input<typeof resellerFormSchema>;

export const EMPTY_RESELLER: ResellerFormValues = {
	name: "",
	phone: "",
	defaultCommission: "",
	note: "",
};

export function resellerToForm(reseller: Reseller): ResellerFormValues {
	return {
		name: reseller.name,
		phone: reseller.phone ?? "",
		defaultCommission: percentToInput(reseller.defaultCommission),
		note: reseller.note ?? "",
	};
}
