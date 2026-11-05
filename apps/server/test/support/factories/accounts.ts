import { db } from "../../../src/db";
import { stores, users } from "../../../src/db/schema";
import { hashPassword } from "../../../src/modules/auth/auth.crypto";
import { AuthService } from "../../../src/modules/auth/auth.service";

let sequence = 0;

export async function createStore(overrides: { name?: string } = {}) {
	const [store] = await db
		.insert(stores)
		.values({ name: overrides.name ?? "Loja Teste" })
		.returning();
	if (!store) throw new Error("insert returned no row");
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
	const [user] = await db
		.insert(users)
		.values({
			storeId,
			name: overrides.name ?? `Usuária ${sequence}`,
			email: overrides.email ?? `usuaria${sequence}@teste.com`,
			passwordHash: await hashPassword(password),
			deactivatedAt: overrides.deactivatedAt ?? null,
		})
		.returning();
	if (!user) throw new Error("insert returned no row");
	return { ...user, password };
}

/** A signed-in user: the bearer header to send and the user behind it. */
export async function signedIn(overrides: UserOverrides = {}) {
	const user = await createUser(overrides);
	const { token } = await AuthService.signIn({
		email: user.email,
		password: user.password,
	});
	return { user, token, headers: { authorization: `Bearer ${token}` } };
}
