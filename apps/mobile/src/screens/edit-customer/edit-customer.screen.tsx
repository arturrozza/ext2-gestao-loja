import { Redirect, router, useLocalSearchParams } from "expo-router";
import { CustomerForm } from "@/components/person-form/customer-form";
import { customerToForm } from "@/components/person-form/customer-form.schema";
import { ScreenQuery } from "@/components/screen-query";
import { FormSkeleton } from "@/components/skeleton";
import { showToast } from "@/components/toast";
import {
	useCustomer,
	useUpdateCustomer,
} from "@/queries/customers/use-customers";

/**
 * Edit a customer's data. An archived one isn't edited: reaching this route anyway (a link, the back stack) leads to
 * their screen, where they can be reactivated.
 */
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
			{(customer) =>
				customer.archived ? (
					<Redirect href={`/customers/${customer.id}`} />
				) : (
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
				)
			}
		</ScreenQuery>
	);
}
