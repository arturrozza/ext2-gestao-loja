import { describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "../../src/app";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";
import { createProduct } from "../support/factories/catalog";

useTestDatabase();

const api = treaty(app);

describe("GET /alerts", () => {
	it("counts the products in each alert", async () => {
		const { headers, session } = await signedIn();
		await createProduct(session.store.id, { minStock: 5 });

		const { data } = await api.alerts.get({ headers });

		expect(data).toEqual({
			lowStock: 0,
			outOfStock: 1,
			nearExpiry: 0,
			expired: 0,
		});
	});

	it("answers 401 without a session", async () => {
		const { error } = await api.alerts.get();
		expect(error?.status).toBe(401);
	});
});
