import { t, type UnwrapSchema } from "elysia";
import { newPasswordSchema } from "../auth/auth.model";

const user = t.Object({
	id: t.String(),
	name: t.String(),
	email: t.String(),
	active: t.Boolean(),
});

export const UsersModel = {
	user,
	list: t.Array(user),
	createBody: t.Object({
		name: t.String({ minLength: 1, maxLength: 120, pattern: "\\S" }),
		email: t.String({ format: "email", maxLength: 254 }),
		password: newPasswordSchema,
	}),
	params: t.Object({ id: t.String({ format: "uuid" }) }),
};

export type UsersModel = {
	user: UnwrapSchema<typeof UsersModel.user>;
	createBody: UnwrapSchema<typeof UsersModel.createBody>;
};
