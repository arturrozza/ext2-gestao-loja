import * as ImagePicker from "expo-image-picker";
import { CameraIcon } from "phosphor-react-native/src/icons/Camera";
import { ImageIcon } from "phosphor-react-native/src/icons/Image";
import { TrashIcon } from "phosphor-react-native/src/icons/Trash";
import { Alert, Linking, View } from "react-native";
import { ProductThumb } from "@/components/product-thumb";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

const OPTIONS: ImagePicker.ImagePickerOptions = {
	mediaTypes: ["images"],
	allowsEditing: true,
	aspect: [1, 1],
	quality: 0.7,
};

/** Camera denied: the user can only allow it in the system settings. */
function explainCameraDenied() {
	Alert.alert(
		"Câmera sem permissão",
		"Permita o uso da câmera nos ajustes para tirar a foto, ou escolha uma foto da galeria.",
		[
			{ text: "Agora não", style: "cancel" },
			{ text: "Abrir ajustes", onPress: () => Linking.openSettings() },
		],
	);
}

async function takePhoto() {
	const permission = await ImagePicker.requestCameraPermissionsAsync();
	if (!permission.granted) {
		explainCameraDenied();
		return null;
	}
	const result = await ImagePicker.launchCameraAsync(OPTIONS);
	return result.canceled ? null : (result.assets[0]?.uri ?? null);
}

async function pickPhoto() {
	const result = await ImagePicker.launchImageLibraryAsync(OPTIONS);
	return result.canceled ? null : (result.assets[0]?.uri ?? null);
}

/** Take or pick a square photo of the product (produtos.md). Without one, an icon shows in its place. */
export function PhotoField({
	uri,
	onChange,
}: {
	uri: string | null;
	onChange: (uri: string | null) => void;
}) {
	const set = (pick: () => Promise<string | null>) => async () => {
		const picked = await pick();
		if (picked) onChange(picked);
	};

	return (
		<View className="flex-row items-center gap-4">
			<ProductThumb uri={uri} size="lg" />
			<View className="flex-1 gap-2">
				<Text className="font-sans-medium text-sm">Foto (opcional)</Text>
				<View className="flex-row flex-wrap gap-2">
					<Button size="sm" variant="outline" onPress={set(takePhoto)}>
						<Icon as={CameraIcon} size={16} />
						<Text>Tirar</Text>
					</Button>
					<Button size="sm" variant="outline" onPress={set(pickPhoto)}>
						<Icon as={ImageIcon} size={16} />
						<Text>Escolher</Text>
					</Button>
					{uri ? (
						<Button
							size="sm"
							variant="ghost"
							accessibilityLabel="Remover foto"
							onPress={() => onChange(null)}
						>
							<Icon as={TrashIcon} size={16} className="text-destructive" />
						</Button>
					) : null}
				</View>
			</View>
		</View>
	);
}
