import { router, useLocalSearchParams } from "expo-router";
import { ResellerForm } from "@/components/person-form/reseller-form";
import { resellerToForm } from "@/components/person-form/reseller-form.schema";
import { ScreenQuery } from "@/components/screen-query";
import { FormSkeleton } from "@/components/skeleton";
import { showToast } from "@/components/toast";
import {
	useReseller,
	useUpdateReseller,
} from "@/queries/resellers/use-resellers";

export function EditResellerScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const query = useReseller(id);
	const update = useUpdateReseller(id);
	return (
		<ScreenQuery
			title="Editar revendedora"
			query={query}
			skeleton={<FormSkeleton />}
			sheet
		>
			{(reseller) => (
				<ResellerForm
					title="Editar revendedora"
					submitLabel="Salvar"
					initial={resellerToForm(reseller)}
					mutation={update}
					onSaved={() => {
						showToast("Revendedora salva");
						router.back();
					}}
				/>
			)}
		</ScreenQuery>
	);
}
