import { formatPhone } from "@/lib/masks";
import { formatPercent } from "@/lib/money";
import type { Reseller } from "@/queries/resellers/resellers.types";

/**
 * "Comissão 10% · (11) 99999-8888": the line under her name in the list and the sale's picker. Names may repeat, so
 * the phone tells two "Ana" apart.
 */
export function resellerSubtitle(reseller: Reseller): string {
	return [
		`Comissão ${formatPercent(reseller.defaultCommission)}`,
		formatPhone(reseller.phone),
	]
		.filter(Boolean)
		.join(" · ");
}
