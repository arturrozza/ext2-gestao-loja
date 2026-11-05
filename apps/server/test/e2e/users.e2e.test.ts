import { describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "../../src/app";
import { useTestDatabase } from "../support/database";
import { createUser, signedIn } from "../support/factories/accounts";

useTestDatabase();

const api = treaty(app);

describe("GET /users", () => {
	it("lists the store's users", async () => {
		const { user, headers } = await signedIn();

		const { data, status } = await api.users.get({ headers });

		expect(status).toBe(200);
		expect(data).toEqual([
			{ id: user.id, name: user.name, email: user.email, active: true },
		]);
	});

	it("answers 401 without a session", async () => {
		const { error } = await api.users.get();
		expect(error?.status).toBe(401);
	});
});

describe("POST /users", () => {
	const input = {
		name: "Bia",
		email: "bia@loja.com",
		password: "senha-da-bia",
	};

	it("creates a user", async () => {
		const { headers } = await signedIn();

		const { data, status } = await api.users.post(input, { headers });

		expect(status).toBe(200);
		expect(data).toMatchObject({
			name: "Bia",
			email: "bia@loja.com",
			active: true,
		});
	});

	it("answers 409 email_taken for an e-mail in use", async () => {
		const { headers } = await signedIn();
		await createUser({ email: "bia@loja.com" });

		const { error } = await api.users.post(input, { headers });

		expect(error?.status).toBe(409);
		expect(error?.value).toMatchObject({ code: "email_taken", field: "email" });
	});

	it("answers 422 for an invalid e-mail or a short password", async () => {
		const { headers } = await signedIn();

		const email = await api.users.post(
			{ ...input, email: "nao-e-email" },
			{ headers },
		);
		const password = await api.users.post(
			{ ...input, password: "curta" },
			{ headers },
		);

		expect(email.error?.value).toMatchObject({
			code: "validation",
			field: "email",
		});
		expect(password.error?.value).toMatchObject({
			code: "validation",
			field: "password",
		});
	});

	it("answers 401 without a session", async () => {
		const { error } = await api.users.post(input);
		expect(error?.status).toBe(401);
	});
});

describe("POST /users/:id/deactivate and /reactivate", () => {
	it("deactivates and reactivates a user", async () => {
		const { user, headers } = await signedIn();
		const other = await createUser({ storeId: user.storeId });

		const off = await api
			.users({ id: other.id })
			.deactivate.post(undefined, { headers });
		const on = await api
			.users({ id: other.id })
			.reactivate.post(undefined, { headers });

		expect(off.data?.active).toBe(false);
		expect(on.data?.active).toBe(true);
	});

	it("answers 400 cannot_deactivate_self", async () => {
		const { user, headers } = await signedIn();

		const { error } = await api
			.users({ id: user.id })
			.deactivate.post(undefined, { headers });

		expect(error?.status).toBe(400);
		expect(error?.value).toMatchObject({ code: "cannot_deactivate_self" });
	});

	it("answers 404 for another store's user", async () => {
		const { headers } = await signedIn();
		const stranger = await createUser();

		const off = await api
			.users({ id: stranger.id })
			.deactivate.post(undefined, { headers });
		const on = await api
			.users({ id: stranger.id })
			.reactivate.post(undefined, { headers });

		expect(off.error?.status).toBe(404);
		expect(on.error?.value).toMatchObject({ code: "user_not_found" });
	});

	it("answers 422 for an id that isn't a uuid", async () => {
		const { headers } = await signedIn();

		const { error } = await api
			.users({ id: "123" })
			.deactivate.post(undefined, { headers });

		expect(error?.status).toBe(422);
	});

	it("answers 401 without a session", async () => {
		const id = crypto.randomUUID();
		const off = await api.users({ id }).deactivate.post();
		const on = await api.users({ id }).reactivate.post();
		expect([off.error?.status, on.error?.status]).toEqual([401, 401]);
	});
});
