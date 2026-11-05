import { CheckIcon } from "phosphor-react-native/src/icons/Check";
import { View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/** The radio's sibling for picking several: the same light ring, filled orange with a check when on. */
export function Checkbox({ on }: { on: boolean }) {
	return (
		<View
			className={cn(
				"h-[26px] w-[26px] items-center justify-center rounded-full",
				on ? "bg-primary" : "border-[1.5px] border-foreground/20",
			)}
		>
			{on ? (
				<Icon as={CheckIcon} size={15} className="text-primary-foreground" />
			) : null}
		</View>
	);
}
