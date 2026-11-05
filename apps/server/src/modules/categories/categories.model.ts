import { t, type UnwrapSchema } from "elysia";

const category = t.Object({
	id: t.String(),
	name: t.String(),
	archived: t.Boolean(),
	/** Active products in the category. */
	productCount: t.Integer(),
});

export const CategoriesModel = {
	category,
	list: t.Array(category),
	body: t.Object({
		name: t.String({ minLength: 1, maxLength: 60, pattern: "\\S" }),
	}),
	params: t.Object({ id: t.String({ format: "uuid" }) }),
};

export type CategoriesModel = {
	category: UnwrapSchema<typeof CategoriesModel.category>;
	body: UnwrapSchema<typeof CategoriesModel.body>;
};
