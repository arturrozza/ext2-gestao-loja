import { audited } from "../../../src/db/audit";
import { insertedRow } from "../../../src/db/rows";
import { stores, users } from "../../../src/db/schema";
import { hashPassword } from "../../../src/modules/auth/auth.crypto";
import { AuthService } from "../../../src/modules/auth/auth.service";

let sequence = 0;

export async function createStore(overrides: { name?: string } = {}) {
	const store = insertedRow(
		await audited("system", (tx) =>
			tx
				.insert(stores)
				.values({ name: overrides.name ?? "Loja Teste" })
				.returning(),
		),
	);
	return store;
}

type UserOverrides = {
	storeId?: string;
	name?: string;
	email?: string;
	password?: string;
	deactivatedAt?: Date | null;
};

/** A user (in a new store unless `storeId` is given). `password` is returned in plain text for signing in. */
export async function createUser(overrides: UserOverrides = {}) {
	sequence += 1;
	const storeId = overrides.storeId ?? (await createStore()).id;
	const password = overrides.password ?? "senha-de-teste";
	const passwordHash = await hashPassword(password);
	const user = insertedRow(
		await audited("system", (tx) =>
			tx
				.insert(users)
				.values({
					storeId,
					name: overrides.name ?? `Usuária ${sequence}`,
					email: overrides.email ?? `usuaria${sequence}@teste.com`,
					passwordHash,
					deactivatedAt: overrides.deactivatedAt ?? null,
				})
				.returning(),
		),
	);
	return { ...user, password };
}

/** A signed-in user: the bearer header to send, the session services take and the user behind it. */
export async function signedIn(overrides: UserOverrides = {}) {
	const user = await createUser(overrides);
	const { token } = await AuthService.signIn({
		email: user.email,
		password: user.password,
	});
	const session = await AuthService.authenticate(`Bearer ${token}`);
	if (!session) throw new Error("expected a session");
	return {
		user,
		token,
		session,
		headers: { authorization: `Bearer ${token}` },
	};
}
