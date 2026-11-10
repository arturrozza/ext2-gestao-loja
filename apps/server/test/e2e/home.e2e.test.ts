import { describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "../../src/app";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";
import { createProduct } from "../support/factories/catalog";

useTestDatabase();

const api = treaty(app);

describe("GET /home", () => {
	it("gives the month summary, the week and the number of alerts", async () => {
		const { headers, session } = await signedIn();
		await createProduct(session.store.id, { minStock: 5 });

		const { data } = await api.home.get({ headers });

		expect(data?.month).toMatchObject({ revenue: 0, salesCount: 0 });
		expect(data?.week).toHaveLength(7);
		expect(data?.alerts).toBe(1);
	});

	it("answers 401 without a session", async () => {
		const { error } = await api.home.get();
		expect(error?.status).toBe(401);
	});
});
