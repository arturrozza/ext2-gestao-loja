import { audited } from "../../../src/db/audit";
import { insertedRow } from "../../../src/db/rows";
import { resellers } from "../../../src/db/schema";
import type { ResellersModel } from "../../../src/modules/resellers/resellers.model";
import { normalizeReseller } from "../../../src/modules/resellers/resellers.rules";

let sequence = 0;

/** A valid reseller form body; override any field. */
export function resellerBody(
	overrides: Partial<ResellersModel["body"]> = {},
): ResellersModel["body"] {
	sequence += 1;
	return {
		name: `Revendedora ${sequence}`,
		phone: null,
		defaultCommission: 1000,
		note: null,
		...overrides,
	};
}

export async function createReseller(
	storeId: string,
	overrides: Partial<ResellersModel["body"]> & { archived?: boolean } = {},
) {
	const { archived, ...body } = overrides;
	return insertedRow(
		await audited("system", (tx) =>
			tx
				.insert(resellers)
				.values({
					storeId,
					...normalizeReseller(resellerBody(body)),
					archivedAt: archived ? new Date() : null,
				})
				.returning(),
		),
	);
}
