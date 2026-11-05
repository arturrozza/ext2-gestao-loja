import { t, type UnwrapSchema } from "elysia";

/** Rule for a password being set (new user, password change). */
export const newPasswordSchema = t.String({ minLength: 8, maxLength: 128 });

const user = t.Object({ id: t.String(), name: t.String(), email: t.String() });
const store = t.Object({ name: t.String() });
const session = t.Object({ user, store });

export const AuthModel = {
	signInBody: t.Object({
		email: t.String({ minLength: 1, maxLength: 254 }),
		// Not `password`: a sign-in must accept whatever was set before the length rule changes.
		password: t.String({ minLength: 1, maxLength: 128 }),
	}),
	signInResponse: t.Object({ token: t.String(), user, store }),
	session,
	changePasswordBody: t.Object({
		currentPassword: t.String({ minLength: 1, maxLength: 128 }),
		newPassword: newPasswordSchema,
	}),
};

export type AuthModel = {
	signInBody: UnwrapSchema<typeof AuthModel.signInBody>;
	signInResponse: UnwrapSchema<typeof AuthModel.signInResponse>;
	session: UnwrapSchema<typeof AuthModel.session>;
	changePasswordBody: UnwrapSchema<typeof AuthModel.changePasswordBody>;
};

/** The signed-in session, resolved by the `auth` macro. `store.id` scopes every query (never taken from the app). */
export type AuthSession = {
	id: string;
	user: { id: string; name: string; email: string };
	store: { id: string; name: string };
};
