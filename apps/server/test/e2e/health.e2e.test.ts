import { describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "../../src/app";

const api = treaty(app);

describe("GET /health", () => {
	it("reports the API and database as up", async () => {
		const { data, status } = await api.health.get();

		expect(status).toBe(200);
		expect(data).toEqual({ status: "ok", database: "up" });
	});
});
