import { type Href, Link } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

/** Section heading with an optional "Ver todos >" link on the right. */
export function SectionTitle({
	title,
	action,
	href,
}: {
	title: string;
	action?: string;
	href?: Href;
}) {
	return (
		<View className="flex-row items-center justify-between">
			<Text className="font-sans-semibold text-lg">{title}</Text>
			{action && href ? (
				<Link href={href} asChild>
					<Pressable hitSlop={8} className="flex-row items-center gap-1">
						<Text className="text-muted-foreground text-sm">{action}</Text>
						<Icon
							as={ChevronRight}
							size={16}
							className="text-muted-foreground"
						/>
					</Pressable>
				</Link>
			) : null}
		</View>
	);
}
