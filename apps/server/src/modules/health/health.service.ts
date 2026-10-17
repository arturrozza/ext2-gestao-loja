import { sql } from "drizzle-orm";
import { db } from "../../db";
import type { HealthModel } from "./health.model";

export const HealthService = {
	async check(): Promise<HealthModel["status"]> {
		try {
			await db.execute(sql`select 1`);
			return { status: "ok", database: "up" };
		} catch {
			return { status: "ok", database: "down" };
		}
	},
};
