import { describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "../../src/app";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";

useTestDatabase();

const api = treaty(app);

const profile = {
	name: "Mundo Madam",
	document: "123.456.789-01",
	phone: "(11) 99999-8888",
	address: "Rua A, 1",
};

/** Percentages in basis points: 6% and 16,5%. */
const settings = {
	defaultTaxPercent: 600,
	mercadoLivreFeePercent: 1650,
	expiryWarningDays: 30,
};

describe("GET /store and PUT /store", () => {
	it("reads and saves the store data, and the session shows the new name", async () => {
		const { headers } = await signedIn();

		const saved = await api.store.put(profile, { headers });
		const read = await api.store.get({ headers });
		const session = await api.auth.session.get({ headers });

		expect(saved.data).toEqual(profile);
		expect(read.data).toEqual(profile);
		expect(session.data?.store.name).toBe("Mundo Madam");
	});

	it("answers 422 for an empty name and for a document with the wrong digits", async () => {
		const { headers } = await signedIn();

		const name = await api.store.put({ ...profile, name: "" }, { headers });
		const document = await api.store.put(
			{ ...profile, document: "123" },
			{ headers },
		);

		expect(name.error?.value).toMatchObject({
			code: "validation",
			field: "name",
		});
		expect(document.error?.status).toBe(422);
		expect(document.error?.value).toMatchObject({ field: "document" });
	});

	it("answers 401 without a session", async () => {
		const read = await api.store.get();
		const save = await api.store.put(profile);
		expect([read.error?.status, save.error?.status]).toEqual([401, 401]);
	});
});

describe("GET /store/settings and PUT /store/settings", () => {
	it("reads and saves the settings", async () => {
		const { headers } = await signedIn();

		const saved = await api.store.settings.put(settings, { headers });
		const read = await api.store.settings.get({ headers });

		expect(saved.data).toEqual(settings);
		expect(read.data).toEqual(settings);
	});

	it("accepts 0% and 100% (10000 basis points)", async () => {
		const { headers } = await signedIn();

		const { data } = await api.store.settings.put(
			{ ...settings, defaultTaxPercent: 0, mercadoLivreFeePercent: 10_000 },
			{ headers },
		);

		expect(data).toMatchObject({
			defaultTaxPercent: 0,
			mercadoLivreFeePercent: 10_000,
		});
	});

	it("answers 422 for days out of 1–365 and a percentage over 100", async () => {
		const { headers } = await signedIn();

		const days = await api.store.settings.put(
			{ ...settings, expiryWarningDays: 0 },
			{ headers },
		);
		const percent = await api.store.settings.put(
			{ ...settings, mercadoLivreFeePercent: 10_001 },
			{ headers },
		);

		expect(days.error?.value).toMatchObject({
			code: "validation",
			field: "expiryWarningDays",
		});
		expect(percent.error?.value).toMatchObject({
			code: "validation",
			field: "mercadoLivreFeePercent",
		});
	});

	it("answers 422 for a percentage that isn't whole basis points, and keeps the saved ones", async () => {
		const { headers } = await signedIn();
		await api.store.settings.put(settings, { headers });
		// What an old app sends ("6" meant 6%, now it would be 0,06%), a float or a negative: none is converted.
		const percents: unknown[] = ["6", "16.5", 12.5, -1, null];

		for (const field of [
			"defaultTaxPercent",
			"mercadoLivreFeePercent",
		] as const) {
			for (const value of percents) {
				const { error } = await api.store.settings.put(
					// What a client outside the contract sends.
					{ ...settings, [field]: value } as unknown as typeof settings,
					{ headers },
				);
				expect(error?.status).toBe(422);
				expect(error?.value).toMatchObject({ code: "validation", field });
			}
		}
		expect((await api.store.settings.get({ headers })).data).toEqual(settings);
	});

	it("answers 401 without a session", async () => {
		const read = await api.store.settings.get();
		const save = await api.store.settings.put(settings);
		expect([read.error?.status, save.error?.status]).toEqual([401, 401]);
	});
});

describe("store scoping", () => {
	it("each session reads and saves only its own store", async () => {
		const a = await signedIn();
		const b = await signedIn();

		await api.store.put({ ...profile, name: "Loja A" }, { headers: a.headers });
		await api.store.settings.put(
			{ ...settings, defaultTaxPercent: 900 },
			{ headers: a.headers },
		);

		const profileB = await api.store.get({ headers: b.headers });
		const settingsB = await api.store.settings.get({ headers: b.headers });
		expect(profileB.data?.name).toBe("Loja Teste");
		expect(settingsB.data?.defaultTaxPercent).toBe(0);
	});
});
