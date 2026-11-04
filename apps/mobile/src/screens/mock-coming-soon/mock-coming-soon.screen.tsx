import { useLocalSearchParams } from "expo-router";
import { HammerIcon } from "phosphor-react-native/src/icons/Hammer";
import { View } from "react-native";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

/** Placeholder for modules reachable from the home screen that don't have a screen yet. */
export function MockComingSoonScreen() {
	const { title } = useLocalSearchParams<{ title?: string }>();
	const name = title ?? "Em breve";

	return (
		<ScreenLayout header={<ScreenHeader title={name} />}>
			<View className="items-center gap-3 rounded-2xl bg-card px-6 py-10">
				<Icon as={HammerIcon} size={28} className="text-foreground/50" />
				<Text className="font-sans-semibold text-lg">Em construção</Text>
				<Text className="text-center text-muted-foreground text-sm">
					A tela de {name.toLowerCase()} ainda está sendo feita. Ela vai
					aparecer aqui assim que estiver pronta.
				</Text>
			</View>
		</ScreenLayout>
	);
}
