import { router } from "expo-router";
import { ResellerForm } from "@/components/person-form/reseller-form";
import { EMPTY_RESELLER } from "@/components/person-form/reseller-form.schema";
import { showToast } from "@/components/toast";
import { useCreateReseller } from "@/queries/resellers/use-resellers";

export function NewResellerScreen() {
	const create = useCreateReseller();
	return (
		<ResellerForm
			title="Nova revendedora"
			submitLabel="Cadastrar revendedora"
			initial={EMPTY_RESELLER}
			mutation={create}
			onSaved={(reseller) => {
				showToast("Revendedora cadastrada");
				router.replace(`/resellers/${reseller.id}`);
			}}
		/>
	);
}
