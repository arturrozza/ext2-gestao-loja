import { Link } from "expo-router";
import { ClockIcon } from "phosphor-react-native/src/icons/Clock";
import { EnvelopeIcon } from "phosphor-react-native/src/icons/Envelope";
import { IdentificationCardIcon } from "phosphor-react-native/src/icons/IdentificationCard";
import { KeyIcon } from "phosphor-react-native/src/icons/Key";
import { MapPinIcon } from "phosphor-react-native/src/icons/MapPin";
import { PercentIcon } from "phosphor-react-native/src/icons/Percent";
import { PhoneIcon } from "phosphor-react-native/src/icons/Phone";
import { SignOutIcon } from "phosphor-react-native/src/icons/SignOut";
import { StorefrontIcon } from "phosphor-react-native/src/icons/Storefront";
import { UserIcon } from "phosphor-react-native/src/icons/User";
import { UsersIcon } from "phosphor-react-native/src/icons/Users";
import { useState } from "react";
import { Pressable } from "react-native";
import { InfoRow } from "@/components/info-row";
import { ListCard, ListRow } from "@/components/list-card";
import { QueryView } from "@/components/query-states";
import { ScreenHeader } from "@/components/screen-header";
import { ScreenLayout } from "@/components/screen-layout";
import { RowsSkeleton } from "@/components/skeleton";
import { Text } from "@/components/ui/text";
import { hapticTap } from "@/lib/haptics";
import { formatPercent } from "@/lib/money";
import { useSession } from "@/queries/auth/use-auth";
import { useStoreProfile, useStoreSettings } from "@/queries/store/use-store";
import { SignOutSheet } from "./partials/sign-out-sheet";

function EditLink({ href }: { href: "/store/edit" | "/store/settings" }) {
	return (
		<Link href={href} asChild>
			<Pressable onPress={hapticTap} hitSlop={8} accessibilityRole="button">
				<Text className="font-sans-medium text-primary text-sm">Editar</Text>
			</Pressable>
		</Link>
	);
}

function StoreData() {
	const query = useStoreProfile();
	return (
		<QueryView query={query} skeleton={<RowsSkeleton rows={4} />}>
			{(store) => (
				<ListCard
					title="Dados da loja"
					action={<EditLink href="/store/edit" />}
				>
					<InfoRow label="Nome" icon={StorefrontIcon} value={store.name} />
					<InfoRow
						label="Documento"
						icon={IdentificationCardIcon}
						value={store.document}
					/>
					<InfoRow label="Telefone" icon={PhoneIcon} value={store.phone} />
					<InfoRow label="Endereço" icon={MapPinIcon} value={store.address} />
				</ListCard>
			)}
		</QueryView>
	);
}

function StoreSettingsCard() {
	const query = useStoreSettings();
	return (
		<QueryView query={query} skeleton={<RowsSkeleton rows={5} />}>
			{(settings) => (
				<ListCard
					title="Configurações"
					action={<EditLink href="/store/settings" />}
				>
					<InfoRow
						label="Imposto padrão"
						icon={PercentIcon}
						value={formatPercent(settings.defaultTaxPercent)}
					/>
					<InfoRow
						label="Taxa do Mercado Livre"
						icon={PercentIcon}
						value={formatPercent(settings.mercadoLivreFeePercent)}
					/>
					<InfoRow
						label="Avisar vencimento"
						icon={ClockIcon}
						value={`${settings.expiryWarningDays} dias antes`}
					/>
				</ListCard>
			)}
		</QueryView>
	);
}

/** Store data, settings and the account (password, sign out). docs/product/acesso-e-loja.md. */
export function StoreScreen() {
	const session = useSession();
	const [signingOut, setSigningOut] = useState(false);

	return (
		<ScreenLayout header={<ScreenHeader title="Loja" />}>
			<StoreData />
			<StoreSettingsCard />
			<ListCard title="Conta">
				<InfoRow
					label="Usuário"
					icon={UserIcon}
					value={session.data?.user.name}
				/>
				<InfoRow
					label="E-mail"
					icon={EnvelopeIcon}
					value={session.data?.user.email}
				/>
				<ListRow dense title="Usuários" icon={UsersIcon} href="/store/users" />
				<ListRow
					dense
					title="Trocar senha"
					icon={KeyIcon}
					href="/store/password"
				/>
				<ListRow
					dense
					title="Sair"
					icon={SignOutIcon}
					onPress={() => setSigningOut(true)}
				/>
			</ListCard>
			<SignOutSheet open={signingOut} onClose={() => setSigningOut(false)} />
		</ScreenLayout>
	);
}
