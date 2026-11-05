import { CameraView, useCameraPermissions } from "expo-camera";
import { XIcon } from "phosphor-react-native/src/icons/X";
import { useRef } from "react";
import { Linking, Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { hapticPress, hapticTap, withHaptic } from "@/lib/haptics";

const BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e", "code128"] as const;

function PermissionAsk({
	canAsk,
	onAllow,
}: {
	canAsk: boolean;
	onAllow: () => void;
}) {
	return (
		<View className="flex-1 items-center justify-center gap-4 bg-card px-8">
			<Text className="text-center font-sans-semibold text-base">
				Precisamos da câmera
			</Text>
			<Text className="text-center text-muted-foreground text-sm">
				Ela é usada só para ler o código de barras dos produtos.
			</Text>
			<Button
				onPress={canAsk ? onAllow : () => Linking.openSettings()}
				className="self-stretch"
			>
				<Text>{canAsk ? "Permitir câmera" : "Abrir ajustes"}</Text>
			</Button>
		</View>
	);
}

/**
 * Full-screen camera that reads one barcode (EAN/UPC/Code 128) and hands it to `onScanned`. Used in the product
 * form, the product search, sales and purchases (docs/product/produtos.md). The camera only mounts while open.
 */
export function BarcodeScanner({
	open,
	onClose,
	onScanned,
}: {
	open: boolean;
	onClose: () => void;
	onScanned: (code: string) => void;
}) {
	const insets = useSafeAreaInsets();
	const [permission, requestPermission] = useCameraPermissions();
	// onBarcodeScanned fires for every frame with a code: only the first one counts.
	const handled = useRef(false);

	return (
		<Modal
			visible={open}
			animationType="slide"
			onRequestClose={onClose}
			onShow={() => {
				handled.current = false;
			}}
		>
			<View className="flex-1 bg-secondary">
				{permission?.granted ? (
					<CameraView
						style={StyleSheet.absoluteFill}
						barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
						onBarcodeScanned={(result) => {
							if (handled.current) return;
							handled.current = true;
							hapticPress();
							onScanned(result.data);
						}}
					/>
				) : permission ? (
					<PermissionAsk
						canAsk={permission.canAskAgain}
						onAllow={requestPermission}
					/>
				) : null}
				<View
					pointerEvents="box-none"
					className="absolute inset-x-0 top-0 flex-row items-center justify-between px-5"
					style={{ paddingTop: insets.top + 8 }}
				>
					<Pressable
						onPress={withHaptic(hapticTap, onClose)}
						accessibilityRole="button"
						accessibilityLabel="Fechar"
						className="h-11 w-11 items-center justify-center rounded-full bg-background"
					>
						<Icon as={XIcon} size={20} />
					</Pressable>
				</View>
				{permission?.granted ? (
					<View
						pointerEvents="none"
						className="absolute inset-x-0 items-center"
						style={{ bottom: insets.bottom + 40 }}
					>
						<View className="rounded-full bg-background px-4 py-2">
							<Text className="text-sm">Aponte para o código de barras</Text>
						</View>
					</View>
				) : null}
			</View>
		</Modal>
	);
}
