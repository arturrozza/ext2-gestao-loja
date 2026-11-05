import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { CameraIcon } from "phosphor-react-native/src/icons/Camera";
import { ImageIcon } from "phosphor-react-native/src/icons/Image";
import { TrashIcon } from "phosphor-react-native/src/icons/Trash";
import { Alert, Linking, View } from "react-native";
import { ProductThumb } from "@/components/product-thumb";
import { showToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

const OPTIONS: ImagePicker.ImagePickerOptions = {
	mediaTypes: ["images"],
	allowsEditing: true,
	aspect: [1, 1],
	// Compression happens once, in shrink().
	quality: 1,
};

/** Longest side (px) of a saved product photo: plenty for the app, a fraction of a camera photo's size. */
const MAX_SIDE = 1080;

/** Shrinks the cropped square to MAX_SIDE and saves it as a compressed JPEG, before it is uploaded. Never upscales. */
async function shrink(uri: string) {
	const image = await ImageManipulator.manipulate(uri, {
		maxWidth: MAX_SIDE,
		maxHeight: MAX_SIDE,
	}).renderAsync();
	const saved = await image.saveAsync({
		format: SaveFormat.JPEG,
		compress: 0.7,
	});
	return saved.uri;
}

/** The picked photo, ready to save, or null when the user cancelled. */
async function toPhoto(result: ImagePicker.ImagePickerResult) {
	const uri = result.canceled ? undefined : result.assets[0]?.uri;
	return uri ? shrink(uri) : null;
}

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
	return toPhoto(await ImagePicker.launchCameraAsync(OPTIONS));
}

async function pickPhoto() {
	return toPhoto(await ImagePicker.launchImageLibraryAsync(OPTIONS));
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
		try {
			const picked = await pick();
			if (picked) onChange(picked);
		} catch {
			showToast("Não foi possível usar essa foto. Tente outra.");
		}
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
