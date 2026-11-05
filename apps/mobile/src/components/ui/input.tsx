import type { ComponentProps } from "react";
import { Platform } from "react-native";
import { DoneTextInput } from "@/components/done-text-input";
import { cn } from "@/lib/utils";

/**
 * Text input. Size with `text-[16px]`, never `text-base`: Tailwind's `text-base` also sets a 24px line height, and on
 * iOS a TextInput with a fixed line height draws its text low. On iOS the keyboard gets an "OK" bar to close it.
 */
function Input({ className, ...props }: ComponentProps<typeof DoneTextInput>) {
	return (
		<DoneTextInput
			className={cn(
				"font-sans dark:bg-input/30 border-transparent bg-field text-foreground flex h-12 w-full min-w-0 flex-row items-center rounded-[8px] border px-4 py-1 text-[16px] focus:border-primary",
				props.editable === false &&
					cn(
						"opacity-50",
						Platform.select({
							web: "disabled:pointer-events-none disabled:cursor-not-allowed",
						}),
					),
				Platform.select({
					web: cn(
						"placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground outline-none transition-[color,box-shadow] md:text-sm",
						"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
						"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
					),
					native: "placeholder:text-muted-foreground/50",
				}),
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
