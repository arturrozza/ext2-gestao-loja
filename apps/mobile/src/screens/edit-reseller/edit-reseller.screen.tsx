import { Redirect, router, useLocalSearchParams } from "expo-router";
import { ResellerForm } from "@/components/person-form/reseller-form";
import { resellerToForm } from "@/components/person-form/reseller-form.schema";
import { ScreenQuery } from "@/components/screen-query";
import { FormSkeleton } from "@/components/skeleton";
import { showToast } from "@/components/toast";
import {
	useReseller,
	useUpdateReseller,
} from "@/queries/resellers/use-resellers";

/**
 * Edit a reseller's data. An archived one isn't edited: reaching this route anyway (a link, the back stack) leads to
 * her screen, where she can be reactivated.
 */
export function EditResellerScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const query = useReseller(id, "all");
	const update = useUpdateReseller(id);
	return (
		<ScreenQuery
			title="Editar revendedora"
			query={query}
			skeleton={<FormSkeleton />}
			sheet
		>
			{(reseller) =>
				reseller.archived ? (
					<Redirect href={`/resellers/${reseller.id}`} />
				) : (
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
				)
			}
		</ScreenQuery>
	);
}
