import { audited } from "../../../src/db/audit";
import { insertedRow } from "../../../src/db/rows";
import { customers } from "../../../src/db/schema";
import { normalizePerson } from "../../../src/lib/person";
import type { CustomersModel } from "../../../src/modules/customers/customers.model";

let sequence = 0;

/** A valid customer form body; override any field. */
export function customerBody(
	overrides: Partial<CustomersModel["body"]> = {},
): CustomersModel["body"] {
	sequence += 1;
	return { name: `Cliente ${sequence}`, phone: null, note: null, ...overrides };
}

export async function createCustomer(
	storeId: string,
	overrides: Partial<CustomersModel["body"]> & { archived?: boolean } = {},
) {
	const { archived, ...body } = overrides;
	return insertedRow(
		await audited("system", (tx) =>
			tx
				.insert(customers)
				.values({
					storeId,
					...normalizePerson(customerBody(body)),
					archivedAt: archived ? new Date() : null,
				})
				.returning(),
		),
	);
}
