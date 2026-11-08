# Decisões

> Registro curto do que foi decidido e por quê, a mais recente no topo. Vale para produto (regras de negócio) e para
> decisões técnicas que não ficam óbvias lendo o código. Quando uma decisão mudar, edite a entrada e diga o que mudou.

Formato:

```md
## AAAA-MM-DD: <título curto>

**Decisão:** o que foi decidido.
**Por quê:** o motivo, e as alternativas descartadas quando ajudar.
```

## 2026-11-06: Foto do produto no Cloudflare R2, enviada pela API (MUN-11)

**Decisão:** a foto do produto fica num bucket do Cloudflare R2 (`mundomadam-photos-prod`, e `mundomadam-photos-dev`
para o desenvolvimento local), servido pela URL pública `r2.dev`. O app manda a foto que já reduziu (JPEG, lado máximo
de 1080 px) para a API (`POST /products/photos`); a API confere pelos bytes que é um JPEG de até 2 MB, grava com uma
chave nova (`stores/<loja>/products/<uuid>.jpg`) e devolve a chave, que o produto salva como `photoKey`. Trocar ou
remover a foto não apaga o arquivo antigo, e a foto de um cadastro que não foi salvo fica sem uso no bucket. Sem as
variáveis do R2 as fotos ficam desligadas: os produtos aparecem sem foto e enviar uma responde 503. As duas regras do
leitor de código (adicionar direto na venda e na compra, oferecer cadastro na lista) foram escritas em `produtos.md`;
o código delas já existia desde as telas da MUN-21.
**Por quê:** a primeira ideia foi o app enviar direto para o bucket por uma URL pré-assinada, mas o `presign` do Bun só
assina o `host`: quem tivesse a URL mandaria qualquer arquivo, de qualquer tamanho e tipo, e poderia trocá-lo depois
de validado, num bucket público. Passando pela API, só ela escreve no bucket, e o que fica lá é sempre um JPEG
conferido. O custo é a foto (uns 150 KB) passar pelo server, e uma chamada fora do Eden no app (`uploadFile`): o Eden
só monta multipart com `Blob`, e o arquivo do Expo não é um (o `Blob` do React Native nem aceita bytes). Não apagar a
foto antiga segue o "nada se apaga" e mantém a auditoria apontando para algo que existe; o espaço das fotos sem uso é
irrisório. O `r2.dev` tem limite de taxa e é para desenvolvimento: troca-se por um domínio próprio só mudando
`PHOTOS_PUBLIC_URL` (ver `stack.md`).

## 2026-11-05: Dinheiro em centavos inteiros e percentuais em pontos-base (MUN-24)

**Decisão:** dinheiro passa a ser guardado, trafegado e calculado em centavos inteiros (R$ 92,50 = `9250`) e
percentuais em pontos-base inteiros (12,5% = `1250`, 100% = `10000`), no banco, na API e no app. Toda divisão que pode
deixar fração de centavo passa por uma função só no server (`divideRounded`/`percentOf`), que arredonda para o mais
próximo com metade para longe do zero, uma vez, no fim da conta; o app tem a mesma função, para a prévia bater com o
que a API grava, e um teste confere as duas lado a lado. A API recusa (422) texto, fração ou negativo em vez de
converter. O banco também barra preço zero ou negativo e percentual fora de 0 a 10000 (CHECK). A migration converte os
dados que já existiam (preço base, impostos e taxas da loja, comissão das revendedoras) multiplicando por 100. A
conversão é exata e atômica: se algum valor não coubesse, nada mudaria e o deploy pararia. O `audit_log` não ganha
registro pela conversão, e os registros anteriores a ela guardam os valores na escala antiga, também como número
(`92.50` em vez de `9250`): só a data separa um do outro. Quem ler o histórico compara o `created_at` do registro com
o `applied_at` da migration `20261105194540_money_in_cents` em `drizzle.__drizzle_migrations`.
**Custo médio (para Compras, MUN-12):** o estoque guarda o valor total em centavos e a quantidade, e o custo médio é
`valor ÷ quantidade`, calculado quando precisa. A compra só soma (não arredonda). A saída tira
`custo médio × unidades` arredondado ao centavo, e zerar o estoque zera o valor. Assim o erro não acumula.
**Por quê:** é o padrão para dinheiro (Stripe, Adyen, o padrão Money): contas inteiras são exatas e não dependem de
converter texto em cada conta, que é onde um arredondamento errado escapa. Pontos-base são a unidade comum para taxas,
e manter percentual igual a dinheiro (inteiro em todas as camadas) evita duas regras. Guardar o custo médio já
arredondado acumularia erro a cada compra (R$ 10 em 3 unidades = R$ 3,33 × 3 = R$ 9,99); guardar com mais casas só
atrasaria o erro.
**Release:** server e app (OTA) sobem juntos na release, e a mudança é só para frente: o código antigo não funciona
com as colunas novas, então voltar o deploy não é opção. Na troca, o server antigo continua no ar até o novo passar
no healthcheck, já com as colunas convertidas: uma gravação dele nesse intervalo seria salva na escala errada ("10" de
10% viraria 0,1%). Um app antigo, falando com o server novo, mostra valores 100 vezes maiores até reiniciar com o
update, mas não grava nada (a API recusa o texto que ele manda). Aceito porque ninguém usa o app em produção ainda. Uma
mudança assim com o app em uso precisa de release sem ninguém usando, ou de colunas novas no lugar das antigas
(o server antigo falha em vez de gravar errado).

## 2026-11-08: Cliente segue as regras da revendedora, com lista paginada

**Decisão:** o cliente segue as mesmas regras da revendedora: nome pode se repetir, telefone opcional com DDD guardado
só com os dígitos, busca por nome ou telefone com ou sem máscara, e cliente arquivado não se edita, só reativa. A
diferença é que a lista de clientes é paginada. Enquanto Vendas (MUN-16) não existe, o total gasto, o número de compras
e a última compra vêm zerados e o histórico aparece como "Em construção". A normalização e a busca de pessoa (nome e
telefone) ficaram num helper só (`lib/person.ts`), usado por clientes e revendedoras.
**Por quê:** as duas são cadastros de pessoa com os mesmos campos básicos, e regras iguais deixam o app previsível.
Uma loja pode ter muitos clientes fixos, ao contrário das revendedoras, então a lista precisa paginar. Vendas
canceladas não contam no total gasto, como na comissão da revendedora.

## 2026-11-05: Revendedora com nome repetido, sem edição quando arquivada e vendas depois

**Decisão:** o nome da revendedora pode se repetir na loja; a lista e a escolha na venda mostram comissão e telefone
embaixo do nome. O telefone é opcional, com DDD, e fica guardado só com os dígitos; a busca acha com ou sem a máscara.
A comissão padrão vai de 0% a 100%. Revendedora arquivada não se edita, só reativa, como produto. A lista não é
paginada. Enquanto Vendas (MUN-16) não existe, os totais dela vêm zerados e as vendas e a comissão por período
aparecem como "Em construção"; o filtro por período entra com as vendas.
**Por quê:** pessoas diferentes podem ter o mesmo nome, e barrar o cadastro obrigaria a inventar apelido; o telefone
resolve a dúvida na hora de escolher. Guardar só os dígitos deixa a busca igual para qualquer jeito de digitar. Uma
loja tem poucas revendedoras, então paginar não compensa. Sem vendas, um filtro por período não teria o que mostrar
nem como ser testado.

## 2026-11-05: Registro de auditoria por trigger no banco

**Decisão:** toda escrita nas tabelas de negócio gera uma linha em `audit_log` (quem, quando, antes, depois e campos
alterados), gravada por uma trigger do Postgres. O autor vai na transação por `audited()`, e a trigger recusa escrita
sem autor. Senhas ficam de fora. A busca de produtos usa uma coluna com nome e códigos já normalizados (minúsculas,
sem acento), calculada no server, em vez da extensão `unaccent`.
**Por quê:** o mantenedor quer saber quem mudou o quê, como o auditing do Eloquent. O Drizzle não tem eventos de
model, e um log feito no código depende de cada service lembrar de chamar; a trigger pega toda escrita, e recusar
escrita sem autor transforma o esquecimento em erro. Na busca, a coluna normalizada evita depender de extensão no
Postgres da Railway e segue a mesma normalização do app. Limite conhecido: a busca (`LIKE '%palavra%'`) lê todos os
produtos da loja, sem índice; com catálogos grandes, trocar por `pg_trgm`.

## 2026-11-05: Categoria se arquiva, produto arquivado não se edita e o app deixa os dados falsos

**Decisão:** categorias passam a poder ser renomeadas, arquivadas e reativadas; não se excluem. Produto arquivado não
se edita, só reativa. O app para de usar dados falsos de uma vez (a MUN-20 vai junto com a MUN-10): os módulos que
ainda não existem mostram "Em construção" e escondem as ações, e estoque e custo aparecem como "—" até Compras e
Estoque. A sugestão de "Cadastrar primeira entrada" passou para Compras (MUN-12), e o campo de foto some do cadastro
até a tarefa de foto (MUN-11), para não aceitar uma foto que não seria salva.
**Por quê:** excluir uma categoria tiraria os produtos dela e mudaria os relatórios por categoria do passado; arquivar
esconde sem perder nada. Editar arquivado não tem uso e abre espaço para mexer no que já é histórico. Ligar só
produtos à API deixaria compras, vendas e estoque falsos apontando para produtos que não existem mais; mostrar "Em
construção" é mais honesto que manter uma demonstração inconsistente. Sem compras, não há estoque nem custo de verdade
para mostrar, e a primeira entrada não teria para onde levar.

## 2026-11-05: Libs nativas do MVP instaladas de uma vez, push incluído

**Decisão:** todas as libs nativas que o MVP usa entram no binário 1.2.0, incluindo o `expo-notifications`, mesmo com
push fora do MVP. Fotos de produto são reduzidas no aparelho (lado máximo de 1080 px, JPEG) antes do upload. Não entram
lib de gráfico (os gráficos usam `View` e `react-native-svg`) nem de compartilhar (exportação está fora do MVP).
**Por quê:** cada lib nativa exige um binário novo, e reinstalar o app no aparelho do cliente custa mais que uma
atualização OTA. Push vai existir no futuro, então a lib já vai no binário; ligar o envio (FCM, chave da Apple, pedir
permissão) fica para a MUN-7.

## 2026-11-05: Formulários sem card em volta dos campos, e o teclado não levanta o rodapé

**Decisão:** os campos dos formulários ficam direto na folha branca, sem card em volta; grupos se separam por um
titulozinho e itens repetidos por um fio. Os controles ganham uma cor própria (`--field`, 95,5%) que a folha não troca.
Com o teclado aberto, o botão de salvar fica embaixo, coberto, e só a área que rola sobe; no iOS, todo campo tem a
barra com "OK" para fechar o teclado.
**Por quê:** o mantenedor vetou card dentro de card. Sem o card cinza, os campos brancos sumiam na folha branca, daí a
cor própria. O teclado foi resolvido só com o que vem no React Native (`automaticallyAdjustKeyboardInsets`,
`KeyboardAvoidingView`, `InputAccessoryView`) para continuar rodando no Expo Go; o `react-native-keyboard-controller`,
que o guia do Expo recomenda, pede development build.

## 2026-11-05: Tela inicial em três seções de três atalhos

**Decisão:** os atalhos da tela inicial ficam em três seções de três: Dia a dia (Vendas, Compras, Produtos), Pessoas
(Clientes, Revendedoras, Usuários) e Gestão (Relatórios, Alertas, Loja). Usuários ganha atalho próprio, antes só
dentro de Loja. Seção com mais de três só se for preciso.
**Por quê:** seções com dois cards pareciam vazias, e duas seções grandes (testadas antes) não agradaram ao mantenedor.

## 2026-11-05: Imposto e taxa do Mercado Livre começam em 0%

**Decisão:** a loja nasce com imposto padrão e taxa do Mercado Livre em 0%, e os alertas com os padrões de
[Alertas](product/alertas.md) (30 dias, 60 dias e 10%). Percentuais vão de 0 a 100 com até duas casas, e os períodos
de 1 a 365 dias.
**Por quê:** os percentuais reais ainda não foram confirmados com o cliente. Começar em 0% não inventa um número: a
venda não sugere custo nenhum até a loja configurar os dela.

## 2026-11-05: Auth própria, usuários criados no app e senha mestra

**Decisão:** login com e-mail e senha feito por nós, sem lib: senha em argon2id (`Bun.password`), sessão com token
opaco Bearer (RFC 6750) guardado só como hash, 30 dias sem uso. A loja e o primeiro usuário são criados no deploy a
partir de variáveis `SEED_*`, só quando não há usuário nenhum. Quem está logado cria, desativa e reativa os outros
usuários; todos podem o mesmo. Uma senha mestra opcional (`MASTER_PASSWORD`) entra como qualquer usuário, em qualquer
ambiente, para suporte. 5 senhas erradas em 15 minutos bloqueiam o e-mail, contando em memória.
**Por quê:** só existe login com e-mail e senha, sem cadastro aberto, e-mail ou OAuth. O better-auth (usado em outro
projeto do mantenedor) traria tabelas e fluxos que não usamos e deixaria a senha mestra mais difícil. O seed no deploy
dispensa um passo manual no Railway. A senha mestra substitui a tela de "esqueci a senha" por enquanto: a equipe entra
como a pessoa e troca a senha. Ninguém desativa o próprio usuário, para a loja nunca ficar sem acesso.

## 2026-11-05: Nome "MM Vendas" e ícone da sacola

**Decisão:** o app aparece no celular como **MM Vendas**. O ícone e a splash são uma sacola de compras branca e
inclinada, com "mm" vazado, sobre o laranja do app (`#EA580C`). O scheme passou a ser `mundomadam`. O slug do Expo
continua `mobile` e o bundle id continua `com.mundomadam.loja`.
**Por quê:** o nome foi escolhido com a loja, e a sacola liga a marca a vendas. O slug e o bundle id não aparecem
para quem usa o app. Trocar o slug mexe no vínculo com o projeto do EAS, e trocar o bundle id cria outro app na Apple
e no Android. Por isso eles ficam diferentes do nome de propósito.

## 2026-11-04: Fonte Manrope no lugar da Plus Jakarta Sans

**Decisão:** o app usa a Manrope. Também foram testadas a Geist (centraliza melhor, mas tem cara de ferramenta técnica)
e a Figtree; a Manrope foi a escolhida pela aparência, mais calorosa.
**Por quê:** na Plus Jakarta Sans o texto ficava visivelmente abaixo do centro nos campos do iPhone (as minúsculas
ficam 2,2px abaixo do meio da linha a 16px) e exigia ajuste manual. Na Manrope ficam 1,8px abaixo e as maiúsculas
a 0,4px do centro, sem ajuste.

## 2026-11-04: Telas mais enxutas depois de ver o app rodando

**Decisão:** cada tela mostra primeiro o que se usa todo dia, e o resto fica a um toque:

- **Estoque:** a linha do produto mostra quantidade, preço e localização. Custo e valor em estoque ficam na tela do produto.
- **Vendas e Estoque:** um só botão de criar, o **+** da barra de baixo. Canal e categoria viram filtro em uma folha.
- **Nova venda:** desconto, custos, cliente e data ficam recolhidos. Nova venda e nova compra perguntam antes de descartar.
- **Alertas:** agrupados por tipo, com a contagem de cada um. **Relatórios:** divididos em Resumo, Produtos e Canais.

**Por quê:** ao ver o app rodando, as telas estavam corretas, mas carregadas demais em comparação com a tela inicial.

## 2026-11-04: Telas definitivas com dados falsos e padrões a confirmar

> Os dados falsos saíram em 2026-11-05 (ver "Categoria se arquiva, produto arquivado não se edita e o app deixa os
> dados falsos"); os padrões abaixo continuam valendo.

**Decisão:** as telas antigas do mock foram apagadas e refeitas nas rotas definitivas, seguindo a tela inicial como
modelo, com dados falsos isolados por módulo (`src/queries/<módulo>/<módulo>.fake.ts`). As listas que crescem são
paginadas e virtualizadas, e produto se escolhe sempre por um seletor em tela cheia com busca, código de barras e filtros.

Onde as regras não diziam, as telas adotaram estes padrões, provisórios até o mantenedor ou o cliente confirmar:

- **Condição de pagamento:** "À vista" e "A prazo".
- **Janela da margem:** o mesmo período do produto parado (60 dias por padrão), já que as regras usam um número só.
- **Produto parado que nunca vendeu:** conta a partir da primeira entrada em estoque.
- **Margem por produto:** os custos e o desconto da venda são divididos pelo valor de cada item.
- **Cancelar compra:** bloqueado também se unidades saíram por ajuste, não só por venda.
- **Unidades vencidas:** contam no valor em estoque até serem descartadas.
- **Motivos de ajuste:** aumentar só aceita contagem ou outro; "vencido descartado" só para unidades vencidas.
- **Corrigir custo:** não aparece sem estoque, porque a próxima compra define o custo.
- **Obrigatórios além das regras:** preço base maior que zero e comissão padrão da revendedora.
- **Categoria:** nome repetido é recusado.
- **Outros limites de formulário:** senha com pelo menos 8 caracteres, dias de alerta entre 1 e 365, período do
  relatório de até 5 anos, rankings com 5 produtos, desconto até o valor da venda e CPF/CNPJ conferido só pela quantidade
  de dígitos.
- **Produto arquivado** não gera alerta.
- **Tendência da tela inicial:** compara com os mesmos dias do mês anterior, não com o mês inteiro.

**Por quê:** ver e validar o app inteiro antes do backend, sem refazer tela quando cada módulo ligar na API. O catálogo
vai ser grande, pedido do mantenedor, por isso o seletor e a paginação.

## 2026-11-04: Transições só com deslize, sem fade

**Decisão:** toda tela entra deslizando da direita, formulários também (antes subiam com `fade_from_bottom`). O
conteúdo não faz mais fade ao abrir a tela. A gaveta do "+" sobe deslizando de baixo, e só o fundo escurece. Na tela
inicial, uma barra compacta com "Início" aparece no topo ao rolar, como o título grande do iOS.
**Por quê:** o mantenedor achou as transições com fade ruins; o deslize é o padrão que a pessoa conhece do iPhone e
do WhatsApp. A barra compacta mostra onde a pessoa está depois que a saudação sai da tela.

## 2026-11-04: Ícones do Phosphor no lugar do Lucide

**Decisão:** o app usa o [Phosphor](https://phosphoricons.com) (`phosphor-react-native`) em todos os ícones, pelo
`Icon` de `src/components/ui/icon.tsx`. Cada ícone é importado pelo caminho dele, não pelo pacote inteiro.
**Por quê:** pedido do mantenedor. O Phosphor tem pesos (`regular`, `fill`, `bold`...), o que permite, por exemplo, a
aba ativa com o ícone preenchido. A importação por caminho é a recomendada pela doc do pacote: pelo índice, o app
levaria os 1500 ícones.

## 2026-11-04: Tela inicial e navegação

**Decisão:** a tela inicial segue o app do Inter Empresas: card branco de destaque com o lucro real do mês e seções com
carrossel de atalhos para todos os módulos (Dia a dia, Estoque, Gestão). Fundo cinza claro e cards brancos sem borda,
ícones sem fundo, cantos `rounded-2xl`, header rolando com a página. A barra de abas fica com Início, Vendas e Estoque;
a aba "Mais" saiu. O "+" da barra abre uma gaveta com nova venda, nova compra, novo produto e novo cliente. Badge de
pendência só em Alertas.

**Por quê:**

- **"Mais" saiu:** a tela inicial já leva a todos os módulos, a aba repetia o mesmo menu.
- **Gaveta no "+":** junta todo cadastro num lugar só. A nova venda passa a ter dois toques ("+" e "Nova venda") em
  vez de um, o que o mantenedor aceitou ao aprovar a tela; o card e as pílulas de nova venda poluíam a tela.
- **Sem card preto ou laranja:** pesavam demais. A profundidade vem do branco sobre o cinza, sem sombra.
- **Badge só em Alertas:** com badge em vários lugares, nenhum chama atenção.
- **Banner de alertas removido:** o número no atalho de Alertas já avisa.
- **Olho que esconde os valores** no card de destaque, como em app de banco: o lojista usa o app no balcão, com
  cliente vendo a tela.
- **Tela do Mercado Livre sem acesso:** só abria pelo "Mais". A integração está fora do MVP; a tela do mock fica no
  código até ser apagada ou reaproveitada.

## 2026-11-04: Regras do produto revisadas com base na EXT1

**Decisão:** os nove módulos, as funcionalidades e as regras foram revisados um a um e estão em
[`product/`](product/README.md), que é a fonte da verdade. Os principais pontos que mudaram em relação à EXT1:

- Mercado Livre sem integração, só como canal manual, com taxa sugerida.
- Novo módulo Clientes, a confirmar com o cliente.
- Estoque sem tela própria, dentro de Produtos.
- Estoque e custo só entram pela compra, nunca no cadastro.
- Unidades vencidas não entram na venda.
- O desconto conta uma vez só no lucro real.
- Códigos RF/RN abandonados.

**Por quê:**

- **Mercado Livre:** a importação não compensa agora, e a venda manual já cobre o canal.
- **Clientes:** é central no Pedido OK, que o cliente usa hoje.
- **Estoque em Produtos:** duas telas mostrariam a mesma lista.
- **Estoque e custo pela compra:** o Pedido OK deixa editar estoque e custo no produto, e isso foi descartado para toda
  unidade ter origem registrada e o custo médio ficar correto.
- **Vencidos:** a saída pela validade mais próxima (RN025) entregaria justamente o produto vencido.
- **Desconto:** o RN040 subtraía de novo o que o RN035 já tirava da receita.
- **Códigos:** muita regra mudou e eles ficariam confusos.

## 2026-11-04: Auditoria e integridade como regra geral

**Decisão:** nada se apaga nem se reescreve, todo registro guarda autor e data, operações são atômicas, o banco também
recusa estoque negativo, e as movimentações de estoque são um ledger imutável com quantidade, custo e custo médio
resultante.
**Por quê:** erros de estoque e custo contaminam o lucro de tudo o que vem depois, então precisam ser rastreáveis e
recalculáveis.

## 2026-11-04: Continuar online-first, com uma loja e dados separados por loja

**Decisão:** sem offline no MVP. Toda tabela de negócio tem `store_id`, e o banco permite vários usuários por loja, mas o
app começa com uma loja, sem troca de loja nem cadastro.
**Por quê:** a internet quase não cai e há dados móveis, e offline exigiria banco local e sincronização. Se a falta de
internet virar problema real, dá para acrescentar uma fila de vendas sem reescrever o app. Separar os dados por loja custa
pouco agora; o caro é a parte de produto, que fica para depois.

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

**Decisão:** os docs de produto antigos saíram do repo. As regras passam a vir do mantenedor. **Mudou em 2026-11-04:** os
docs de produto voltaram, reescritos e enxutos, em [`product/`](product/README.md), para um agente sem contexto entender o
sistema. As regras não óbvias continuam sendo confirmadas com o mantenedor.
**Por quê:** os docs antigos estavam poluídos, com conflitos e lacunas em aberto.
