import type { ComponentProps } from "react";
import { FormField } from "@/components/form-field";
import { cn } from "@/lib/utils";

/** A `FormField` for a few lines of free text (a reason, a note): the same look, taller, text from the top. */
export function TextAreaField({
	className,
	...props
}: Omit<ComponentProps<typeof FormField>, "multiline" | "textAlignVertical">) {
	return (
		<FormField
			{...props}
			multiline
			textAlignVertical="top"
			className={cn("h-28 py-3", className)}
		/>
	);
}
