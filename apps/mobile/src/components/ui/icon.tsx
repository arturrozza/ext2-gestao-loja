import { cssInterop } from "nativewind";
import type {
	IconProps as PhosphorIconProps,
	Icon as PhosphorIconType,
} from "phosphor-react-native";
import * as React from "react";
import { TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/** A Phosphor icon component (e.g. `HouseIcon`), passed to `Icon` through `as`. */
export type IconType = PhosphorIconType;

type IconProps = PhosphorIconProps & {
	as: IconType;
	className?: string;
};

function IconImpl({ as: IconComponent, ...props }: IconProps) {
	return <IconComponent {...props} />;
}

// Maps NativeWind classes to Phosphor props: `text-*` → `color`, `size-*`/`h-*`/`w-*` → `size`.
cssInterop(IconImpl, {
	className: {
		target: "style",
		nativeStyleToProp: {
			color: "color",
			height: "size",
			width: "size",
		},
	},
});

/**
 * Phosphor icon with NativeWind `className` support. Import each icon from its own path so the bundle only ships the
 * icons in use:
 *
 * ```tsx
 * import { ArrowRightIcon } from "phosphor-react-native/src/icons/ArrowRight";
 *
 * <Icon as={ArrowRightIcon} className="text-primary" size={16} />
 * ```
 *
 * `weight` (`bold` by default: `regular` reads too thin at these sizes) switches the style: `thin`, `light`, `regular`, `bold`, `fill`, `duotone`.
 */
function Icon({
	as: IconComponent,
	className,
	size = 14,
	weight = "bold",
	...props
}: IconProps) {
	const textClass = React.useContext(TextClassContext);
	return (
		<IconImpl
			as={IconComponent}
			className={cn("text-foreground", textClass, className)}
			size={size}
			weight={weight}
			{...props}
		/>
	);
}

export { Icon };
