/** FAKE BACKEND (MUN-21): session in memory. The real one (MUN-8) keeps the session for 30 days without use. */

import { ApiError } from "@/lib/api-error";
import { bootFakeDb } from "@/queries/fake/fake-boot";
import { db } from "@/queries/fake/fake-db";
import { fakeRequest } from "@/queries/fake/fake-server";
import type { ChangePasswordInput, Session, SignInInput } from "./auth.types";

let signedIn = false;

function currentSession(): Session | null {
	if (!signedIn) return null;
	const { user, store } = db.current;
	return {
		user: { id: user.id, name: user.name, email: user.email },
		store: { name: store.name },
	};
}

export const authFake = {
	session: () =>
		fakeRequest(() => {
			bootFakeDb();
			return currentSession();
		}),

	signIn: (input: SignInInput) =>
		fakeRequest(() => {
			const { user } = db.current;
			const matches =
				input.email.trim().toLowerCase() === user.email &&
				input.password === user.password;
			if (!matches) {
				throw new ApiError(
					"invalid_credentials",
					"E-mail ou senha incorretos.",
				);
			}
			signedIn = true;
			return currentSession();
		}),

	signOut: () =>
		fakeRequest(() => {
			signedIn = false;
		}),

	changePassword: (input: ChangePasswordInput) =>
		fakeRequest(() => {
			if (input.currentPassword !== db.current.user.password) {
				throw new ApiError(
					"invalid_password",
					"A senha atual está incorreta.",
					{
						field: "currentPassword",
					},
				);
			}
			db.current.user.password = input.newPassword;
		}),
};
