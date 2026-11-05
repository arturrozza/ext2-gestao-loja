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

const settings = {
	defaultTaxPercent: "6",
	mercadoLivreFeePercent: "16",
	expiryWarningDays: 30,
	staleProductDays: 60,
	lowMarginPercent: "10",
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

	it("accepts 0 and 100 as percentages", async () => {
		const { headers } = await signedIn();

		const { data } = await api.store.settings.put(
			{ ...settings, defaultTaxPercent: "0", lowMarginPercent: "100.00" },
			{ headers },
		);

		expect(data).toMatchObject({
			defaultTaxPercent: "0",
			lowMarginPercent: "100",
		});
	});

	it("answers 422 for days out of 1–365 and a percentage over 100", async () => {
		const { headers } = await signedIn();

		const days = await api.store.settings.put(
			{ ...settings, staleProductDays: 0 },
			{ headers },
		);
		const percent = await api.store.settings.put(
			{ ...settings, lowMarginPercent: "150" },
			{ headers },
		);

		expect(days.error?.value).toMatchObject({
			code: "validation",
			field: "staleProductDays",
		});
		expect(percent.error?.value).toMatchObject({
			code: "validation",
			field: "lowMarginPercent",
		});
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
			{ ...settings, defaultTaxPercent: "9" },
			{ headers: a.headers },
		);

		const profileB = await api.store.get({ headers: b.headers });
		const settingsB = await api.store.settings.get({ headers: b.headers });
		expect(profileB.data?.name).toBe("Loja Teste");
		expect(settingsB.data?.defaultTaxPercent).toBe("0");
	});
});
