import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { app } from "../../src/app";
import { UsersService } from "../../src/modules/users/users.service";
import { useTestDatabase } from "../support/database";
import { signedIn } from "../support/factories/accounts";

useTestDatabase();
afterEach(() => mock.restore());

const call = (path: string, init?: RequestInit) =>
	app.handle(new Request(`http://localhost${path}`, init));

describe("errors outside the routes", () => {
	it("answers an unknown route with 404 in the API's error shape", async () => {
		const response = await call("/nao-existe");

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({
			code: "not_found",
			message: "Rota não encontrada.",
		});
	});

	it("answers a body that isn't JSON with 400 invalid_body", async () => {
		const response = await call("/auth/sign-in", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: "{ not json",
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ code: "invalid_body" });
	});
});

describe("unexpected errors", () => {
	it("answer 500 internal without the original message", async () => {
		const { headers } = await signedIn();
		spyOn(UsersService, "list").mockRejectedValueOnce(
			new Error("Failed query: select ... params: segredo"),
		);
		spyOn(console, "error").mockImplementationOnce(() => undefined);

		const response = await call("/users", { headers });

		expect(response.status).toBe(500);
		const body = await response.text();
		expect(JSON.parse(body)).toEqual({
			code: "internal",
			message: "Algo deu errado. Tente de novo.",
		});
		expect(body).not.toContain("segredo");
	});
});
