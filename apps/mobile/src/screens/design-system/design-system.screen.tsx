import { ScrollView, View } from "react-native";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { ShowcaseSection } from "./partials/showcase-section";

const BUTTON_VARIANTS = [
	"default",
	"secondary",
	"outline",
	"ghost",
	"link",
	"destructive",
] as const;
const BUTTON_SIZES = ["sm", "default", "lg"] as const;

export function DesignSystemScreen() {
	return (
		<View className="flex-1 bg-background">
			<ScreenHeader title="Design system" />
			<ScrollView contentContainerClassName="gap-8 px-4 pb-12">
				<ShowcaseSection title="Texto">
					<Text variant="h1">Título h1</Text>
					<Text variant="h2">Título h2</Text>
					<Text variant="h3">Título h3</Text>
					<Text variant="h4">Título h4</Text>
					<Text variant="lead">Lead: texto de destaque.</Text>
					<Text>Padrão: Plus Jakarta Sans regular.</Text>
					<Text variant="large">Large</Text>
					<Text variant="small">Small</Text>
					<Text variant="muted">Muted: texto secundário.</Text>
					<Text variant="code">code</Text>
				</ShowcaseSection>

				<ShowcaseSection title="Botões">
					{BUTTON_VARIANTS.map((variant) => (
						<Button key={variant} variant={variant}>
							<Text>{variant}</Text>
						</Button>
					))}
					<View className="flex-row items-center gap-2">
						{BUTTON_SIZES.map((size) => (
							<Button key={size} size={size} variant="outline">
								<Text>{size}</Text>
							</Button>
						))}
					</View>
					<Button disabled>
						<Text>desabilitado</Text>
					</Button>
				</ShowcaseSection>

				<ShowcaseSection title="Campo">
					<View className="gap-2">
						<Label nativeID="product-name">Nome do produto</Label>
						<Input
							aria-labelledby="product-name"
							placeholder="Ex.: Camiseta básica"
						/>
					</View>
					<Input editable={false} placeholder="Desabilitado" />
				</ShowcaseSection>

				<ShowcaseSection title="Card">
					<Card>
						<CardHeader>
							<CardTitle>Venda #123</CardTitle>
							<CardDescription>Hoje, 14:32</CardDescription>
						</CardHeader>
						<CardContent>
							<Text>3 itens · R$ 189,90</Text>
						</CardContent>
						<CardFooter className="gap-2">
							<Button variant="outline" size="sm">
								<Text>Detalhes</Text>
							</Button>
							<Button size="sm">
								<Text>Imprimir</Text>
							</Button>
						</CardFooter>
					</Card>
				</ShowcaseSection>
			</ScrollView>
		</View>
	);
}
