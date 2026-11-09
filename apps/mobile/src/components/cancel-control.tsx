import type { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { TextAreaField } from "@/components/text-area-field";
import { showToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useZodForm } from "@/lib/use-zod-form";

/** Longest reason the API keeps. */
const REASON_MAX = 500;

const requiredReason = z.object({
	reason: z.string().trim().min(1, "Informe o motivo."),
});
const optionalReason = z.object({ reason: z.string().trim() });

/**
 * Cancel a sale or a purchase: nothing is deleted, it stays in the history, marked (docs/product/README.md). The
 * button opens a confirmation with what happens and the reason; a refusal from the API shows there. `noun` is the
 * record ("venda", "compra"), `title` names it ("Venda #12"). The mutation gets the reason trimmed, maybe blank when
 * it isn't required.
 */
export function CancelControl({
	canceled,
	noun,
	title,
	description,
	successMessage,
	reasonRequired,
	placeholder,
	mutation,
}: {
	canceled: boolean;
	noun: string;
	title: string;
	description: string;
	successMessage: string;
	reasonRequired: boolean;
	placeholder: string;
	mutation: UseMutationResult<unknown, Error, string>;
}) {
	const [open, setOpen] = useState(false);
	const form = useZodForm(reasonRequired ? requiredReason : optionalReason, {
		reason: "",
	});
	const start = () => {
		form.reset();
		setOpen(true);
	};
	const close = () => {
		mutation.reset();
		setOpen(false);
	};
	const submit = form.handleSubmit(({ reason }) =>
		mutation.mutate(reason, {
			onSuccess: () => {
				close();
				showToast(successMessage);
			},
			onError: form.applyApiError,
		}),
	);

	// The sheet stays mounted once canceled, so it can finish sliding down.
	return (
		<>
			{canceled ? null : (
				<Button variant="ghost" onPress={start}>
					<Text className="text-destructive">Cancelar {noun}</Text>
				</Button>
			)}
			<ConfirmSheet
				open={open}
				// Not while the request is on its way: its answer (the toast, or why it was refused) shows here.
				onClose={mutation.isPending ? () => undefined : close}
				title={`Cancelar ${title}?`}
				description={description}
				confirmLabel={`Cancelar ${noun}`}
				pending={mutation.isPending}
				error={form.footerError(mutation.error) ? mutation.error : undefined}
				onConfirm={submit}
			>
				<TextAreaField
					label={reasonRequired ? "Motivo" : "Motivo (opcional)"}
					value={form.values.reason}
					onChangeText={(text) => form.set("reason", text)}
					error={form.errors.reason}
					placeholder={placeholder}
					maxLength={REASON_MAX}
				/>
			</ConfirmSheet>
		</>
	);
}
