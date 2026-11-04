import { type ComponentProps, useId } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type FormFieldProps = ComponentProps<typeof Input> & {
	label: string;
	error?: string;
	hint?: string;
};

/** Label + Input + animated error/hint line. */
export function FormField({
	label,
	error,
	hint,
	className,
	...inputProps
}: FormFieldProps) {
	const id = useId();
	const message = error ?? hint;

	return (
		<View className="gap-2">
			<Label nativeID={id} className="px-1">
				{label}
			</Label>
			<Input
				aria-labelledby={id}
				className={cn(error && "border-destructive", className)}
				{...inputProps}
			/>
			{message ? (
				<Animated.View
					key={message}
					entering={FadeIn.duration(180)}
					exiting={FadeOut.duration(120)}
				>
					<Text
						className={cn(
							"px-1 text-sm",
							error ? "text-destructive" : "text-muted-foreground",
						)}
					>
						{message}
					</Text>
				</Animated.View>
			) : null}
		</View>
	);
}
