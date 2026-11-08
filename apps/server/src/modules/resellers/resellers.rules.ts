import { normalizePerson } from "../../lib/person";
import type { ResellersModel } from "./resellers.model";

/** A reseller as it's saved: the person data normalized (`normalizePerson`) plus the default commission. */
export function normalizeReseller(input: ResellersModel["body"]) {
	return {
		...normalizePerson(input),
		defaultCommission: input.defaultCommission,
	};
}
