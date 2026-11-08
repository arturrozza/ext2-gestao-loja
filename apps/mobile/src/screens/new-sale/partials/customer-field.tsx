import { UserIcon } from "phosphor-react-native/src/icons/User";
import { useState } from "react";
import { CustomerFields } from "@/components/person-form/customer-form";
import {
	customerFormSchema,
	EMPTY_CUSTOMER,
} from "@/components/person-form/customer-form.schema";
import { PersonPicker } from "@/components/person-picker";
import { PickerTrigger } from "@/components/picker-trigger";
import { formatPhone } from "@/lib/masks";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useZodForm } from "@/lib/use-zod-form";
import type { Customer } from "@/queries/customers/customers.types";
import {
	useCreateCustomer,
	useCustomers,
} from "@/queries/customers/use-customers";
import { flattenPages } from "@/queries/pagination";
import { QuickAddForm } from "./quick-add-form";

type Picked = { id: string; name: string };

/** Register a customer from the picker, with the same fields and rules as the customer screen. */
function NewCustomer({
	name,
	onCreated,
}: {
	name: string;
	onCreated: (customer: Customer) => void;
}) {
	const form = useZodForm(customerFormSchema, { ...EMPTY_CUSTOMER, name });
	return (
		<QuickAddForm
			form={form}
			mutation={useCreateCustomer()}
			onCreated={onCreated}
		>
			<CustomerFields form={form} />
		</QuickAddForm>
	);
}

/**
 * Optional customer (clientes.md): pick one from a full sheet, or register one right there, so it never slows the sale.
 */
export function CustomerField({
	value,
	onChange,
}: {
	value: Picked | null;
	onChange: (customer: Picked | null) => void;
}) {
	const [picking, setPicking] = useState(false);
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search);
	const query = useCustomers({ search: debouncedSearch, archived: false });
	const close = () => {
		setSearch("");
		setPicking(false);
	};
	const pick = (customer: Picked) => {
		onChange({ id: customer.id, name: customer.name });
		close();
	};

	return (
		<>
			<PickerTrigger
				icon={UserIcon}
				value={value?.name ?? null}
				placeholder="Sem cliente (opcional)"
				accessibilityLabel={
					value ? `Cliente: ${value.name}` : "Escolher cliente"
				}
				onPress={() => setPicking(true)}
				onClear={() => onChange(null)}
			/>
			<PersonPicker
				open={picking}
				onClose={close}
				title="Escolher cliente"
				searchPlaceholder="Nome ou telefone"
				search={search}
				onSearchChange={setSearch}
				people={flattenPages(query.data?.pages).map((customer) => ({
					id: customer.id,
					name: customer.name,
					detail: formatPhone(customer.phone),
				}))}
				hasMore={query.hasNextPage}
				selectedId={value?.id ?? null}
				onPick={pick}
				newLabel="Novo cliente"
				renderNew={() => <NewCustomer name={search.trim()} onCreated={pick} />}
			/>
		</>
	);
}
