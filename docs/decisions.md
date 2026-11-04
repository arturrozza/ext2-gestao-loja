# Decisões

> Registro curto do que foi decidido e por quê, a mais recente no topo. Vale para produto (regras de negócio) e para
> decisões técnicas que não ficam óbvias lendo o código. Quando uma decisão mudar, edite a entrada e diga o que mudou.

Formato:

```md
## AAAA-MM-DD: <título curto>

**Decisão:** o que foi decidido.
**Por quê:** o motivo, e as alternativas descartadas quando ajudar.
```

## 2026-11-04: Subir para o Expo SDK 58 sem suporte oficial do NativeWind

**Decisão:** o app foi para o SDK 58 (RN 0.88, React 19.3), mantendo o NativeWind 4.2.7, que só declara suporte até o
SDK 57.
**Por quê:** o Expo Go novo só roda o SDK 58, e o ciclo de vida por cenas do iOS 27 vem nele, então a subida viria de
qualquer jeito. Migrar para o NativeWind 5 foi descartado: ainda é RC e exige Tailwind 4. As telas foram conferidas no
Expo Go e funcionaram. Builds nativos do SDK 58 (EAS, com R8 ligado por padrão no Android) ainda não foram testados.

## 2026-11-04: Design system do app com React Native Reusables

**Decisão:** os componentes base do app vêm do React Native Reusables (estilo shadcn/ui, variante NativeWind), copiados
para `src/components/ui`. O visual segue uma referência enviada pelo mantenedor: fundo branco, superfícies cinza claro
preenchidas, ações em laranja (`#EA580C`), destaques em preto, sem sombras, controles totalmente arredondados, header
e navbar customizados, animações suaves sem bounce, só tema claro, fonte Plus Jakarta Sans.
**Por quê:** o Reusables é a única opção que encaixa no NativeWind 4 + Tailwind 3 sem migração, e os componentes ficam
no repo, sem lib em runtime. O gluestack-ui v5 exige Tailwind 4 (NativeWind 5, ainda pre-release, ou Uniwind). O
`@expo/ui` usa componentes nativos (SwiftUI/Compose), que quase não aceitam estilo com Tailwind: fica para casos
pontuais. No visual, as tentativas sem referência não agradaram: paleta toda neutra (sem vida), violeta (não pegou bem),
laranja com sombras e pílulas (cara de "AI slop"). O terracota da referência foi testado, mas o mantenedor
preferiu manter o laranja e o arredondado total: as cores principais são branco, laranja e preto. Dark mode fica para depois.

## 2026-11-03: Regras de negócio entram aos poucos

**Decisão:** os docs de produto (visão, domínio, requisitos não funcionais e specs por módulo) saíram do repo. As regras
de negócio passam a vir do mantenedor, feature por feature, e cada uma que não for óbvia no código é registrada aqui.
**Por quê:** as specs vinham dos documentos de planejamento, com conflitos e lacunas em aberto. Registrar só o que foi
decidido de fato evita implementar regra que ninguém confirmou.
