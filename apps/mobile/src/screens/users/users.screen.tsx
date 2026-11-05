import { router } from "expo-router";
import { PlusIcon } from "phosphor-react-native/src/icons/Plus";
import { useState } from "react";
import { IconButton } from "@/components/icon-button";
import { ListCard, ListRow } from "@/components/list-card";
import { QueryView } from "@/components/query-states";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { RowsSkeleton } from "@/components/skeleton";
import { StatusPill } from "@/components/status-pill";
import { useSession } from "@/queries/auth/use-auth";
import { useUsers } from "@/queries/users/use-users";
import type { User } from "@/queries/users/users.types";
import { UserSheet } from "./partials/user-sheet";

/**
 * One `ListRow` per user, returned as an array (not a component) so `ListCard` sees each row and draws the hairlines
 * between them. The signed-in user can't be deactivated, so their row isn't tappable.
 */
function userRows(
	users: User[],
	selfId: string | undefined,
	onSelect: (user: User) => void,
) {
	return users.map((user) => {
		const self = user.id === selfId;
		return (
			<ListRow
				key={user.id}
				title={user.name}
				subtitle={user.email}
				muted={!user.active}
				right={self ? <StatusPill label="Você" tone="highlight" /> : undefined}
				onPress={self ? undefined : () => onSelect(user)}
			/>
		);
	});
}

/** Who can sign in to the store. Anyone signed in creates, deactivates and reactivates users (no roles yet). */
export function UsersScreen() {
	const query = useUsers();
	const session = useSession();
	const selfId = session.data?.user.id;
	const [selected, setSelected] = useState<User | null>(null);

	return (
		<ScreenLayout
			onRefresh={query.refetch}
			header={
				<ScreenHeader
					title="Usuários"
					right={
						<IconButton
							icon={PlusIcon}
							label="Novo usuário"
							variant="primary"
							onPress={() => router.push("/store/users/new")}
						/>
					}
				/>
			}
		>
			<QueryView query={query} skeleton={<RowsSkeleton rows={3} />}>
				{(users) => {
					const active = users.filter((user) => user.active);
					const inactive = users.filter((user) => !user.active);
					return (
						<>
							<ListCard title="Ativos">
								{userRows(active, selfId, setSelected)}
							</ListCard>
							{inactive.length > 0 ? (
								<ListCard title="Desativados">
									{userRows(inactive, selfId, setSelected)}
								</ListCard>
							) : null}
						</>
					);
				}}
			</QueryView>
			<UserSheet user={selected} onClose={() => setSelected(null)} />
		</ScreenLayout>
	);
}
