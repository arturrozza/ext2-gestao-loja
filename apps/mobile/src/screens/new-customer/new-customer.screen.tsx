import { router } from "expo-router";
import { CustomerForm } from "@/components/person-form/customer-form";
import { EMPTY_CUSTOMER } from "@/components/person-form/customer-form.schema";
import { showToast } from "@/components/toast";
import { useCreateCustomer } from "@/queries/customers/use-customers";

export function NewCustomerScreen() {
	const create = useCreateCustomer();
	return (
		<CustomerForm
			title="Novo cliente"
			submitLabel="Cadastrar cliente"
			initial={EMPTY_CUSTOMER}
			mutation={create}
			onSaved={(customer) => {
				showToast("Cliente cadastrado");
				router.replace(`/customers/${customer.id}`);
			}}
		/>
	);
}
