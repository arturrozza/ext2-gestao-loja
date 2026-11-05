import { describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "../../src/app";
import { useTestDatabase } from "../support/database";
import { createUser, signedIn } from "../support/factories/accounts";

useTestDatabase();

const api = treaty(app);

describe("POST /auth/sign-in", () => {
	it("returns a bearer token and the session", async () => {
		const user = await createUser({ email: "dona@loja.com" });

		const { data, status } = await api.auth["sign-in"].post({
			email: "dona@loja.com",
			password: user.password,
		});

		expect(status).toBe(200);
		expect(data?.token).toBeString();
		expect(data?.user.email).toBe("dona@loja.com");
		expect(data?.store.name).toBe("Loja Teste");
	});

	it("answers 401 invalid_credentials for a wrong password", async () => {
		const user = await createUser();

		const { error } = await api.auth["sign-in"].post({
			email: user.email,
			password: "errada",
		});

		expect(error?.status).toBe(401);
		expect(error?.value).toEqual({
			code: "invalid_credentials",
			message: "E-mail ou senha inválidos.",
		});
	});

	it("answers 422 with the field for an invalid body", async () => {
		const { error } = await api.auth["sign-in"].post({
			email: "",
			password: "x",
		});

		expect(error?.status).toBe(422);
		expect(error?.value).toMatchObject({ code: "validation", field: "email" });
	});
});

describe("GET /auth/session", () => {
	it("returns the signed-in user and store", async () => {
		const { user, headers } = await signedIn();

		const { data, status } = await api.auth.session.get({ headers });

		expect(status).toBe(200);
		expect(data).toEqual({
			user: { id: user.id, name: user.name, email: user.email },
			store: { name: "Loja Teste" },
		});
	});

	it("answers 401 with WWW-Authenticate without a valid token", async () => {
		for (const headers of [{}, { authorization: "Bearer invalido" }]) {
			const { error, response } = await api.auth.session.get({ headers });

			expect(error?.status).toBe(401);
			expect(error?.value).toMatchObject({ code: "unauthorized" });
			expect(response.headers.get("www-authenticate")).toStartWith("Bearer");
		}
	});
});

describe("POST /auth/sign-out", () => {
	it("ends the session", async () => {
		const { headers } = await signedIn();

		const { status } = await api.auth["sign-out"].post(undefined, { headers });
		const after = await api.auth.session.get({ headers });

		expect(status).toBe(200);
		expect(after.error?.status).toBe(401);
	});

	it("answers 401 without a session", async () => {
		const { error } = await api.auth["sign-out"].post();
		expect(error?.status).toBe(401);
	});
});

describe("POST /auth/password", () => {
	it("changes the password", async () => {
		const { user, headers } = await signedIn();

		const { status } = await api.auth.password.post(
			{ currentPassword: user.password, newPassword: "nova-senha-1" },
			{ headers },
		);
		const signIn = await api.auth["sign-in"].post({
			email: user.email,
			password: "nova-senha-1",
		});

		expect(status).toBe(200);
		expect(signIn.status).toBe(200);
	});

	it("answers 400 invalid_password for a wrong current password", async () => {
		const { headers } = await signedIn();

		const { error } = await api.auth.password.post(
			{ currentPassword: "errada", newPassword: "nova-senha-1" },
			{ headers },
		);

		expect(error?.status).toBe(400);
		expect(error?.value).toMatchObject({
			code: "invalid_password",
			field: "currentPassword",
		});
	});

	it("answers 422 for a new password under 8 characters", async () => {
		const { user, headers } = await signedIn();

		const { error } = await api.auth.password.post(
			{ currentPassword: user.password, newPassword: "curta" },
			{ headers },
		);

		expect(error?.status).toBe(422);
		expect(error?.value).toMatchObject({
			code: "validation",
			field: "newPassword",
		});
	});

	it("answers 401 without a session", async () => {
		const { error } = await api.auth.password.post({
			currentPassword: "x",
			newPassword: "nova-senha-1",
		});
		expect(error?.status).toBe(401);
	});
});
