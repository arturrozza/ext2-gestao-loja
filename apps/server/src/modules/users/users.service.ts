import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { audited, type Transaction } from "../../db/audit";
import { insertedRow } from "../../db/rows";
import { sessions, users } from "../../db/schema";
import { guardUnique, httpError, unauthorized } from "../../lib/http-error";
import { hashPassword, normalizeEmail } from "../auth/auth.crypto";
import type { AuthSession } from "../auth/auth.model";
import type { UsersModel } from "./users.model";

const columns = {
	id: users.id,
	name: users.name,
	email: users.email,
	deactivatedAt: users.deactivatedAt,
};

type UserRow = {
	id: string;
	name: string;
	email: string;
	deactivatedAt: Date | null;
};

function toUser({ deactivatedAt, ...row }: UserRow): UsersModel["user"] {
	return { ...row, active: deactivatedAt === null };
}

const notFound = () =>
	httpError(404, {
		code: "user_not_found",
		message: "Usuário não encontrado.",
	});

/**
 * Locks the signed-in user's row and the target's (in id order, so two of these never deadlock) and reads their latest
 * state. The target must be in the session's store (404 otherwise); the signed-in user must still be active (401).
 */
async function lockTarget(
	tx: Transaction,
	session: AuthSession,
	userId: string,
) {
	const rows = await tx
		.select(columns)
		.from(users)
		.where(
			and(
				inArray(users.id, [session.user.id, userId]),
				eq(users.storeId, session.store.id),
			),
		)
		.orderBy(asc(users.id))
		.for("update");
	const actor = rows.find((row) => row.id === session.user.id);
	const target = rows.find((row) => row.id === userId);
	if (!target) throw notFound();
	if (!actor || actor.deactivatedAt) throw httpError(401, unauthorized);
	return target;
}

/** Users of the session's store. No roles: any user manages the others (docs/product/usuarios.md). */
export const UsersService = {
	async list(storeId: string): Promise<UsersModel["user"][]> {
		const rows = await db
			.select(columns)
			.from(users)
			.where(eq(users.storeId, storeId))
			.orderBy(asc(users.name));
		return rows.map(toUser);
	},

	async create(
		session: AuthSession,
		input: UsersModel["createBody"],
	): Promise<UsersModel["user"]> {
		const passwordHash = await hashPassword(input.password);
		const row = await guardUnique(
			() =>
				audited(session.user.id, async (tx) =>
					insertedRow(
						await tx
							.insert(users)
							.values({
								storeId: session.store.id,
								name: input.name.trim(),
								email: normalizeEmail(input.email),
								passwordHash,
							})
							.returning(columns),
					),
				),
			async () =>
				httpError(409, {
					code: "email_taken",
					message: "Já existe um usuário com esse e-mail.",
					field: "email",
				}),
		);
		return toUser(row);
	},

	/**
	 * Deactivating ends the user's sessions at once. Nobody deactivates themselves, and the signed-in user must still be
	 * active when it happens, so two users deactivating each other at the same time can't leave the store with nobody.
	 */
	async deactivate(
		session: AuthSession,
		userId: string,
	): Promise<UsersModel["user"]> {
		if (userId === session.user.id) {
			throw httpError(400, {
				code: "cannot_deactivate_self",
				message: "Você não pode desativar o próprio usuário.",
			});
		}
		return audited(session.user.id, async (tx) => {
			const target = await lockTarget(tx, session, userId);
			if (target.deactivatedAt) return toUser(target);

			const deactivatedAt = new Date();
			await tx.update(users).set({ deactivatedAt }).where(eq(users.id, userId));
			await tx.delete(sessions).where(eq(sessions.userId, userId));
			return toUser({ ...target, deactivatedAt });
		});
	},

	/**
	 * Back with the same e-mail and password. Sessions left from before the deactivation don't come back with them; an
	 * already active user is returned as is, keeping their sessions.
	 */
	async reactivate(
		session: AuthSession,
		userId: string,
	): Promise<UsersModel["user"]> {
		return audited(session.user.id, async (tx) => {
			const target = await lockTarget(tx, session, userId);
			if (!target.deactivatedAt) return toUser(target);

			await tx
				.update(users)
				.set({ deactivatedAt: null })
				.where(eq(users.id, userId));
			await tx.delete(sessions).where(eq(sessions.userId, userId));
			return toUser({ ...target, deactivatedAt: null });
		});
	},
};
