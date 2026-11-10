import { EyeIcon } from "phosphor-react-native/src/icons/Eye";
import { EyeSlashIcon } from "phosphor-react-native/src/icons/EyeSlash";
import { type ComponentProps, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { DoneTextInput } from "@/components/done-text-input";
import { Icon, type IconType } from "@/components/ui/icon";
import { hapticSelect, withHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/** Soft gray of the icons inside a field, the same as the search field's. */
const FIELD_ICON = "text-foreground/45";

/** The eye on the right of a password field: shows or hides what was typed. */
function PasswordToggle({
	revealed,
	onToggle,
}: {
	revealed: boolean;
	onToggle: () => void;
}) {
	return (
		<Pressable
			onPress={withHaptic(hapticSelect, onToggle)}
			accessibilityRole="button"
			accessibilityLabel={revealed ? "Esconder senha" : "Mostrar senha"}
			className="absolute inset-y-0 right-0 w-12 items-center justify-center"
		>
			<Icon
				as={revealed ? EyeIcon : EyeSlashIcon}
				size={18}
				className={FIELD_ICON}
			/>
		</Pressable>
	);
}

/** The icon on the left of a field: centered, or at the top, beside the first line, when the field grows (multiline). */
function FieldIcon({
	icon,
	multiline,
}: {
	icon: IconType;
	multiline?: boolean;
}) {
	return (
		<View
			pointerEvents="none"
			className={cn(
				"absolute left-4",
				multiline ? "top-[15px]" : "inset-y-0 justify-center",
			)}
		>
			<Icon as={icon} size={18} className={FIELD_ICON} />
		</View>
	);
}

type InputProps = Omit<
	ComponentProps<typeof DoneTextInput>,
	"secureTextEntry"
> & {
	/** Icon on the left, in the soft gray of the search field. Optional: a field can go without it. */
	icon?: IconType;
	/**
	 * Password field: hidden by default, with an eye on the right to show it. It never autocapitalizes, autocorrects or
	 * spellchecks, hidden or shown (a caller can still override them).
	 */
	password?: boolean;
};

/**
 * Text input. Size with `text-[16px]`, never `text-base`: Tailwind's `text-base` also sets a 24px line height, and on
 * iOS a TextInput with a fixed line height draws its text low. On iOS the keyboard gets an "OK" bar to close it.
 *
 * Always wrapped in a `View`: `className` styles the input itself, never the wrapper. The icon (and the password eye)
 * sit over the input, which keeps its own border: focus and error colors work the same with or without them, and the
 * icon never changes color.
 */
function Input({ className, icon, password = false, ...props }: InputProps) {
	const [revealed, setRevealed] = useState(false);
	const passwordProps = password
		? ({
				secureTextEntry: !revealed,
				autoCapitalize: "none",
				autoCorrect: false,
				spellCheck: false,
			} as const)
		: undefined;

	return (
		<View className="relative w-full">
			<DoneTextInput
				{...passwordProps}
				className={cn(
					"font-sans dark:bg-input/30 border-transparent bg-field text-foreground flex h-12 w-full min-w-0 flex-row items-center rounded-[8px] border px-4 py-1 text-[16px] focus:border-primary",
					icon && "pl-11",
					password && "pr-12",
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
			{icon ? <FieldIcon icon={icon} multiline={props.multiline} /> : null}
			{password ? (
				<PasswordToggle
					revealed={revealed}
					onToggle={() => setRevealed((current) => !current)}
				/>
			) : null}
		</View>
	);
}

export { Input };
