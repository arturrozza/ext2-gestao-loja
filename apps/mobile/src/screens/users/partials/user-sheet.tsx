import { View } from "react-native";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { errorMessage } from "@/lib/errors";
import { useSetUserActive } from "@/queries/users/use-users";
import type { User } from "@/queries/users/users.types";

/** Deactivate an active user (they're signed out at once) or bring a deactivated one back. Nothing is deleted. */
export function UserSheet({
	user,
	onClose,
}: {
	user: User | null;
	onClose: () => void;
}) {
	const setActive = useSetUserActive();
	const close = () => {
		setActive.reset();
		onClose();
	};
	const toggle = () => {
		if (user) {
			setActive.mutate(
				{ id: user.id, active: !user.active },
				{ onSuccess: close },
			);
		}
	};

	return (
		<BottomSheet open={user !== null} onClose={close} title={user?.name ?? ""}>
			<View className="gap-3 px-3 pt-1">
				<Text className="text-muted-foreground text-sm">
					{user?.active
						? "Ao desativar, a pessoa sai do app na hora e não consegue mais entrar. Dá para reativar depois."
						: "Ao reativar, a pessoa volta a entrar com o e-mail e a senha que já tinha."}
				</Text>
				{setActive.error ? (
					<Text className="text-destructive text-sm">
						{errorMessage(setActive.error)}
					</Text>
				) : null}
				<Button
					variant={user?.active ? "destructive" : "default"}
					loading={setActive.isPending}
					onPress={toggle}
				>
					<Text>{user?.active ? "Desativar usuário" : "Reativar usuário"}</Text>
				</Button>
				<Button variant="outline" onPress={close}>
					<Text>Voltar</Text>
				</Button>
			</View>
		</BottomSheet>
	);
}
