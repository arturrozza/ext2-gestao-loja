import { BarcodeIcon } from "phosphor-react-native/src/icons/Barcode";
import { MagnifyingGlassIcon } from "phosphor-react-native/src/icons/MagnifyingGlass";
import { XCircleIcon } from "phosphor-react-native/src/icons/XCircle";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Icon } from "@/components/ui/icon";
import { hapticSelect, hapticTap, withHaptic } from "@/lib/haptics";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Search input with a magnifier, a clear button and, with `scan`, a barcode button that fills the search with the
 * scanned code. `surface`: white on the gray page, gray inside a white card.
 */
export function SearchField({
	value,
	onChangeText,
	placeholder = "Buscar",
	scan = false,
	surface = "page",
}: {
	value: string;
	onChangeText: (text: string) => void;
	placeholder?: string;
	scan?: boolean;
	surface?: "page" | "card";
}) {
	const [scanning, setScanning] = useState(false);

	return (
		<View
			className={cn(
				"h-12 flex-row items-center gap-2 rounded-[8px] pr-1.5 pl-4",
				surface === "page" ? "bg-background" : "bg-card",
			)}
		>
			<Icon as={MagnifyingGlassIcon} size={18} className="text-foreground/45" />
			<TextInput
				value={value}
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColor={THEME.mutedForeground}
				autoCorrect={false}
				returnKeyType="search"
				accessibilityLabel={placeholder}
				className="h-full flex-1 font-sans text-[16px] text-foreground"
			/>
			{value ? (
				<Pressable
					onPress={withHaptic(hapticSelect, () => onChangeText(""))}
					accessibilityLabel="Limpar busca"
					hitSlop={8}
					className="p-1"
				>
					<Icon as={XCircleIcon} size={18} className="text-foreground/40" />
				</Pressable>
			) : null}
			{scan ? (
				<>
					<Pressable
						onPress={withHaptic(hapticTap, () => setScanning(true))}
						accessibilityLabel="Ler código de barras"
						hitSlop={8}
						className="h-9 w-9 items-center justify-center rounded-[2px] active:bg-accent"
					>
						<Icon as={BarcodeIcon} size={20} className="text-foreground/60" />
					</Pressable>
					<BarcodeScanner
						open={scanning}
						onClose={() => setScanning(false)}
						onScanned={(code) => {
							setScanning(false);
							onChangeText(code);
						}}
					/>
				</>
			) : null}
		</View>
	);
}
