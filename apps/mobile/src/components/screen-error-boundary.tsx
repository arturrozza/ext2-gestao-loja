import { type ErrorBoundaryProps, useRouter } from "expo-router";
import { WarningCircleIcon } from "phosphor-react-native/src/icons/WarningCircle";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { leaveScreen } from "@/lib/navigation";

/** Lines of the stack shown under the message: enough to find where it broke. */
const STACK_LINES = 6;

/**
 * A screen threw while rendering. Without a boundary a release build aborts the whole app; this keeps it open and
 * shows the error itself (message and the top of the stack), so a crash on a real device can be reported and fixed.
 */
export function ScreenErrorBoundary({ error, retry }: ErrorBoundaryProps) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const stack = error.stack?.split("\n").slice(0, STACK_LINES).join("\n");

	return (
		<ScrollView
			className="flex-1 bg-card"
			contentContainerClassName="items-center gap-2 px-8"
			contentContainerStyle={{
				paddingTop: insets.top + 64,
				paddingBottom: insets.bottom + 32,
			}}
		>
			<Icon as={WarningCircleIcon} size={36} className="text-foreground/35" />
			<Text className="mt-1 text-center font-sans-semibold text-base">
				Algo deu errado nesta tela
			</Text>
			<Text className="text-center text-muted-foreground text-sm">
				Tire um print desta tela e mande para o suporte.
			</Text>
			<View className="mt-3 self-stretch rounded-xl bg-background p-3">
				<Text selectable className="font-sans-semibold text-xs">
					{error.message}
				</Text>
				{stack ? (
					<Text selectable className="mt-2 text-[10px] text-muted-foreground">
						{stack}
					</Text>
				) : null}
			</View>
			<View className="mt-4 gap-2 self-stretch px-4">
				<Button onPress={retry}>
					<Text>Tentar de novo</Text>
				</Button>
				<Button variant="outline" onPress={() => leaveScreen(router)}>
					<Text>Voltar</Text>
				</Button>
			</View>
		</ScrollView>
	);
}
