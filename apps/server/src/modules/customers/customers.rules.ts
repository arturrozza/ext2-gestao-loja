import { normalizePerson } from "../../lib/person";
import { blankToNull } from "../../lib/text";
import type { CustomersModel } from "./customers.model";

/**
 * A customer as it's saved: the person data normalized (`normalizePerson`) plus the address, which stays out of the
 * search (clientes.md). An address left out of the body is `undefined`, which Drizzle skips: a new customer gets
 * none, an edit keeps theirs.
 */
export function normalizeCustomer(input: CustomersModel["body"]) {
	return {
		...normalizePerson(input),
		address:
			input.address === undefined ? undefined : blankToNull(input.address),
	};
}
