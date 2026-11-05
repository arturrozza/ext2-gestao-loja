import { ConfirmSheet } from "@/components/confirm-sheet";
import { useSignOut } from "@/queries/auth/use-auth";

/** Confirms signing out. The root guard sends the user to login once the session is gone. */
export function SignOutSheet({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const signOut = useSignOut();
	const close = () => {
		signOut.reset();
		onClose();
	};

	return (
		<ConfirmSheet
			open={open}
			onClose={close}
			title="Sair da conta?"
			description="Para entrar de novo, você vai precisar do e-mail e da senha."
			confirmLabel="Sair"
			pending={signOut.isPending}
			error={signOut.error}
			onConfirm={() => signOut.mutate()}
		/>
	);
}
