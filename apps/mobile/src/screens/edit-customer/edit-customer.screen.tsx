import { router, useLocalSearchParams } from "expo-router";
import { CustomerForm } from "@/components/person-form/customer-form";
import { customerToForm } from "@/components/person-form/customer-form.schema";
import { ScreenQuery } from "@/components/screen-query";
import { FormSkeleton } from "@/components/skeleton";
import { showToast } from "@/components/toast";
import {
	useCustomer,
	useUpdateCustomer,
} from "@/queries/customers/use-customers";

export function EditCustomerScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const query = useCustomer(id);
	const update = useUpdateCustomer(id);
	return (
		<ScreenQuery
			title="Editar cliente"
			query={query}
			skeleton={<FormSkeleton />}
			sheet
		>
			{(customer) => (
				<CustomerForm
					title="Editar cliente"
					submitLabel="Salvar"
					initial={customerToForm(customer)}
					mutation={update}
					onSaved={() => {
						showToast("Cliente salvo");
						router.back();
					}}
				/>
			)}
		</ScreenQuery>
	);
}
