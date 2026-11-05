import type { UseMutationResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

type QuickForm<I> = {
	handleSubmit: (onValid: (data: I) => void) => () => void;
	applyApiError: (error: unknown) => void;
	footerError: (error: unknown) => string | null;
};

/** The body of a "register and pick" sheet: the fields, the failed-request message and the button. */
export function QuickAddForm<I, T>({
	form,
	mutation,
	onCreated,
	children,
}: {
	form: QuickForm<I>;
	mutation: UseMutationResult<T, Error, I>;
	onCreated: (created: T) => void;
	children: ReactNode;
}) {
	const submit = form.handleSubmit((data) => {
		if (!mutation.isPending) {
			mutation.mutate(data, {
				onSuccess: onCreated,
				onError: form.applyApiError,
			});
		}
	});
	return (
		<>
			{children}
			<FieldError error={form.footerError(mutation.error)} />
			<Button loading={mutation.isPending} onPress={submit}>
				<Text>Cadastrar e escolher</Text>
			</Button>
		</>
	);
}
