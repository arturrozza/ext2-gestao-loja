import { FormField } from "@/components/form-field";

/** The optional free-text address of the store or a customer: grows with the lines typed. */
export function AddressField({
	value,
	onChangeText,
	error,
}: {
	value: string;
	onChangeText: (text: string) => void;
	error?: string;
}) {
	return (
		<FormField
			label="Endereço (opcional)"
			placeholder="Rua, número – bairro, cidade/UF"
			value={value}
			onChangeText={onChangeText}
			error={error}
			multiline
			className="h-auto min-h-12 py-3"
		/>
	);
}
