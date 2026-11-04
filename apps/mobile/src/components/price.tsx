import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const brl = new Intl.NumberFormat("pt-BR", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

/** Money in BRL with smaller cents ("R$ 320,⁰⁰" style from the reference). */
export function Price({
	value,
	className,
}: {
	value: number;
	className?: string;
}) {
	const [integer, cents] = brl.format(value).split(",");

	return (
		<Text className={cn("font-sans-semibold text-lg", className)}>
			R$ {integer}
			<Text className="font-sans-medium text-muted-foreground text-sm">
				,{cents}
			</Text>
		</Text>
	);
}
