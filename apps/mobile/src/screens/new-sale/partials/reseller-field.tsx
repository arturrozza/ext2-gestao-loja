import { HandshakeIcon } from "phosphor-react-native/src/icons/Handshake";
import { useState } from "react";
import { ResellerFields } from "@/components/person-form/reseller-form";
import {
	EMPTY_RESELLER,
	resellerFormSchema,
} from "@/components/person-form/reseller-form.schema";
import { resellerSubtitle } from "@/components/person-form/reseller-subtitle";
import { PersonPicker } from "@/components/person-picker";
import { PickerTrigger } from "@/components/picker-trigger";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useZodForm } from "@/lib/use-zod-form";
import {
	useCreateReseller,
	useResellers,
} from "@/queries/resellers/use-resellers";
import type { SaleReseller } from "../new-sale.schema";
import { QuickAddForm } from "./quick-add-form";

/** Register a reseller from the picker, with the same fields and rules as the reseller screen. */
function NewReseller({
	name,
	onCreated,
}: {
	name: string;
	onCreated: (reseller: SaleReseller) => void;
}) {
	const form = useZodForm(resellerFormSchema, { ...EMPTY_RESELLER, name });
	return (
		<QuickAddForm
			form={form}
			mutation={useCreateReseller()}
			onCreated={onCreated}
		>
			<ResellerFields form={form} />
		</QuickAddForm>
	);
}

/** Who sold on the reseller channel (revendedoras.md): picked like the customer, from a full sheet. */
export function ResellerField({
	value,
	onChange,
	error,
}: {
	value: SaleReseller | null;
	onChange: (reseller: SaleReseller) => void;
	error?: string;
}) {
	const [picking, setPicking] = useState(false);
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search);
	const query = useResellers({ search: debouncedSearch, archived: false });
	const resellers = query.data ?? [];
	const close = () => {
		setSearch("");
		setPicking(false);
	};
	// Only what the sale keeps, not the whole reseller (phone, totals...).
	const pick = ({ id, name, defaultCommission }: SaleReseller) => {
		onChange({ id, name, defaultCommission });
		close();
	};

	return (
		<>
			<PickerTrigger
				label="Revendedora"
				icon={HandshakeIcon}
				value={value?.name ?? null}
				placeholder="Escolher revendedora"
				error={error}
				onPress={() => setPicking(true)}
			/>
			<PersonPicker
				open={picking}
				onClose={close}
				title="Escolher revendedora"
				searchPlaceholder="Nome ou telefone"
				search={search}
				onSearchChange={setSearch}
				people={resellers.map((reseller) => ({
					id: reseller.id,
					name: reseller.name,
					detail: resellerSubtitle(reseller),
				}))}
				selectedId={value?.id ?? null}
				onPick={(person) => {
					const reseller = resellers.find((item) => item.id === person.id);
					if (reseller) pick(reseller);
				}}
				newLabel="Nova revendedora"
				renderNew={() => <NewReseller name={search.trim()} onCreated={pick} />}
			/>
		</>
	);
}
