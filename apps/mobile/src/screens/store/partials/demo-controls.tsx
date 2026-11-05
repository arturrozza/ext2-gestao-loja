import { PaletteIcon } from "phosphor-react-native/src/icons/Palette";
import { View } from "react-native";
import { ChoiceChips } from "@/components/choice-chips";
import { ListCard, ListRow } from "@/components/list-card";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { type DemoScenario, useFakeDemo } from "@/queries/fake/use-fake-demo";

const SCENARIOS = [
	{ value: "in_use", label: "Loja em uso" },
	{ value: "starting", label: "Loja começando" },
] as const satisfies readonly { value: DemoScenario; label: string }[];

/**
 * FAKE DATA (MUN-21): switches to preview the app with data, empty (a store that just started) or with the API down.
 * Removed with the fake data in MUN-20.
 */
export function DemoControls() {
	const demo = useFakeDemo();

	return (
		<ListCard title="Demonstração">
			<View className="gap-3 px-4 py-3.5">
				<Text className="text-muted-foreground text-xs">
					Dados falsos, só para ver o app antes de ligar no servidor.
				</Text>
				<ChoiceChips
					options={SCENARIOS}
					value={demo.scenario}
					onChange={demo.setScenario}
				/>
			</View>
			<View className="flex-row items-center gap-3 px-4 py-3">
				<Text className="flex-1 text-sm">Simular servidor fora do ar</Text>
				<Switch
					value={demo.offline}
					onValueChange={(value) => demo.setOffline(value)}
				/>
			</View>
			<View className="flex-row items-center gap-3 px-4 py-3">
				<View className="flex-1 gap-0.5">
					<Text className="text-sm">Carregando para sempre</Text>
					<Text className="text-muted-foreground text-xs">
						Nada termina de carregar até desligar.
					</Text>
				</View>
				<Switch
					value={demo.loading}
					onValueChange={(value) => demo.setLoading(value)}
				/>
			</View>
			<ListRow title="Design system" icon={PaletteIcon} href="/design-system" />
		</ListCard>
	);
}
