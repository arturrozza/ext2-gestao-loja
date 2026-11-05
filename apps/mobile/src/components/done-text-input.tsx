import { type ComponentProps, useId } from "react";
import {
	InputAccessoryView,
	Keyboard,
	Platform,
	Pressable,
	TextInput,
	View,
} from "react-native";
import { Text } from "@/components/ui/text";
import { hapticTap, withHaptic } from "@/lib/haptics";
import { THEME } from "@/lib/theme";

/** The bar itself: an "OK" on the right that closes the keyboard. Drawn in the keyboard's window, so a fixed color. */
function DoneBar({ id }: { id: string }) {
	// The accessory also leaves a node of its own in the page: absolute, at the top of the field, full width. In iOS builds
	// it was seen covering the label and the top of the input once a second form opened. This 0x0 clip keeps it out of
	// sight; the bar's content moves to the keyboard's window, so it isn't clipped. `collapsable={false}`: never flattened.
	return (
		<View
			collapsable={false}
			className="absolute top-0 left-0 h-0 w-0 overflow-hidden"
		>
			<InputAccessoryView nativeID={id} backgroundColor={THEME.background}>
				<View className="h-11 flex-row items-center justify-end border-border border-t px-2">
					<Pressable
						onPress={withHaptic(hapticTap, () => Keyboard.dismiss())}
						accessibilityRole="button"
						accessibilityLabel="Fechar o teclado"
						hitSlop={8}
						className="h-11 justify-center px-3"
					>
						<Text className="font-sans-semibold text-[16px] text-primary">
							OK
						</Text>
					</Pressable>
				</View>
			</InputAccessoryView>
		</View>
	);
}

/**
 * `TextInput` that, on iOS, gets a bar over the keyboard with an "OK" that closes it, like the system apps (number pads
 * have no return key). Every text field of the app renders this one, never a bare `TextInput`. Each input brings its own
 * bar: a shared one isn't found from inside a modal, which is its own window. Android already has a key to close the
 * keyboard, so there it's a plain `TextInput`.
 */
export function DoneTextInput(props: ComponentProps<typeof TextInput>) {
	const id = useId();
	if (Platform.OS !== "ios") return <TextInput {...props} />;
	return (
		<>
			<TextInput {...props} inputAccessoryViewID={id} />
			<DoneBar id={id} />
		</>
	);
}
