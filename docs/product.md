# Produto

> Visão de produto: o problema, para quem, o que o sistema faz e o que ainda falta decidir. Os detalhes de cada módulo
> ficam nas specs de [`features/`](features/README.md); entidades e cálculos, em [`domain.md`](domain.md).

## Origem

Este projeto implementa o que foi planejado na Extensão Universitária I e detalhado na Extensão Universitária II:

| Fonte | Conteúdo |
| --- | --- |
| Repositório [`gugeldev/ext.1`](https://github.com/gugeldev/ext.1) | módulos, requisitos funcionais, regras de negócio, modelo conceitual de dados, protótipo visual (`app-poc`, Next.js com dados mockados) e prova de conceito da API do Mercado Livre (`ml-poc`) |
| Entrega da EXT2 (PDFs) | Módulos do Sistema, Requisitos Funcionais (RF001–RF089), Requisitos Não Funcionais (RNF001–RNF020), Regras de Negócio (RN001–RN061), Casos de Uso de Alto Nível (UC01–UC20, com RF090–RF099 propostos) e Casos de Uso Expandidos (UC09, UC12, UC14) |

Os IDs (RF, RN, RNF, UC) são os mesmos dos documentos originais, para manter a rastreabilidade com as entregas
acadêmicas. Não renumere: se um requisito cair, marque como removido.

## Contexto e problema

Pequenos varejistas (o cliente é uma loja de perfumaria e cosméticos) não sabem com precisão quanto lucram em cada
produto ou venda:

- o preço de compra varia de uma compra para outra;
- o preço de venda muda com frequência (desconto, negociação, canal);
- cada canal tem custos diferentes: frete, imposto, taxa de plataforma (Mercado Livre), comissão de revendedora.

Sem isso, o lojista decide reposição e preço "no olho", perde produto por vencimento e não percebe vendas com prejuízo.

## Objetivo

Centralizar estoque, compras e vendas num app mobile, automatizando o cálculo de **custo médio**, **custos por venda**
e **lucro real**, para apoiar a decisão do lojista (o que repor, o que promover, qual canal compensa).

## Atores

| Ator | Tipo | Descrição |
| --- | --- | --- |
| Usuário (lojista) | Primário | Pessoa autenticada que opera todas as funcionalidades. |
| Mercado Livre (API) | Secundário (sistema externo) | Fornece pedidos, valores, taxas, dados de envio e status das vendas importadas. |

A **revendedora não é ator**: é um cadastro feito pelo usuário e vinculado às vendas; ela não acessa o app.

## Módulos

| Módulo | Spec | Resumo |
| --- | --- | --- |
| Autenticação e gestão da loja | [`auth-and-store.md`](features/auth-and-store.md) | conta, login/logout, recuperação de senha, dados da loja |
| Produtos | [`products.md`](features/products.md) | cadastro, busca, inativação |
| Entradas de estoque (compras) | [`stock-entries.md`](features/stock-entries.md) | registrar compra, lote, validade, custo médio |
| Estoque | [`stock.md`](features/stock.md) | saldo, lotes, movimentações, ajustes, valor em estoque |
| Vendas, custos e comissões | [`sales.md`](features/sales.md) | registrar e cancelar venda, custos, lucro real |
| Revendedoras | [`resellers.md`](features/resellers.md) | cadastro, comissão padrão, relatório de comissões |
| Relatórios | [`reports.md`](features/reports.md) | indicadores por período |
| Alertas | [`alerts.md`](features/alerts.md) | estoque baixo, vencimento, margem, produto parado |
| Integração com o Mercado Livre | [`mercado-livre.md`](features/mercado-livre.md) | vincular conta, importar vendas |

Requisitos que valem para o sistema todo: [`non-functional-requirements.md`](non-functional-requirements.md).

## Princípios

- **Lucro real é o centro.** Toda venda guarda o custo dos produtos e os custos aplicados no momento em que foi
  registrada (RN033, RN034, RN039). Mudar o custo médio ou a comissão padrão depois não altera vendas passadas.
- **Histórico não se apaga.** Vendas, entradas e movimentações não são excluídas; correções viram cancelamento, ajuste
  ou estorno (RN042–RN046, RNF008).
- **Toda mudança de quantidade é uma movimentação** (RN018), e o saldo do produto é a soma dos seus lotes.
- **Registro rápido no celular.** Uma venda deve ser registrada em poucos passos (RNF015).
- **O Mercado Livre é opcional.** Se a integração cair, o registro manual continua funcionando (RNF012).

## Escopo

Dentro: tudo o que está nas specs de `features/`.

Fora (por enquanto):

- emissão de nota fiscal, PDV com leitor/impressora, pagamentos;
- controle financeiro além das vendas (contas a pagar, fluxo de caixa, despesas fixas da loja);
- acesso de revendedoras ou clientes ao app;
- uso offline (o app é online-first, ver [`architecture.md`](architecture.md));
- outros marketplaces além do Mercado Livre;
- publicação nas lojas de apps (a distribuição prevista é um `.apk`).

O protótipo da EXT1 tinha um **onboarding guiado** (dados da loja → categoria → primeiro produto → quantidade mínima →
primeira entrada → revendedora → Mercado Livre). Ele não consta nos requisitos; fica como ideia de UX, a decidir
(ver D08).

## Decisões pendentes (transversais)

Divergências entre as fontes ou lacunas que afetam mais de um módulo. Responda pelo ID; depois de decidido, registre
a regra no doc correspondente e apague a linha daqui. Dúvidas específicas de um módulo ficam na spec dele.

| ID | Assunto | Situação | Proposta |
| --- | --- | --- | --- |
| D03 | **Compra com vários itens × entrada de um produto.** RF020–RF027 e UC09 tratam a entrada de um produto por vez; o modelo conceitual e o protótipo têm **Compra** com vários **itens de entrada**. | divergência | Seguir o modelo conceitual: uma compra (data, observações) com 1..N itens; cada item gera um lote e uma movimentação. |
| D04 | **Desconto contado duas vezes.** RN035 diz que o desconto reduz a receita; RN040 subtrai "descontos" de novo no lucro. | conflito | Seguir o protótipo: o desconto só reduz a receita e **não** é subtraído de novo. RN040 fica: `lucro = receita − custo dos produtos − custos da venda`. |
| D05 | **Base dos custos percentuais.** RN037 diz "valor da venda" sem definir se é antes ou depois de desconto/acréscimo. | lacuna | Base = receita da venda (já com desconto e acréscimo), como no protótipo. |
| D06 | **Lotes para todos os produtos.** RN024 fala em lote só para produtos com validade; o modelo conceitual gera lote em toda entrada. | divergência | Todo item de entrada gera um lote (com ou sem validade). A saída segue FEFO (validade mais próxima) e, sem validade, FIFO (entrada mais antiga). |
| D07 | **Categorias.** Existem no modelo conceitual e no protótipo, mas não há RF. | lacuna | Incluir como cadastro simples (nome) e filtro opcional em produtos, ou cortar. |
| D08 | **Onboarding guiado** do protótipo. | lacuna | Fora do primeiro corte; reavaliar depois das features principais. |
| D09 | **Parâmetros configuráveis** (RF099): antecedência de vencimento, período de produto parado, limite de baixa margem. | lacuna | Configurações da loja, com padrões do protótipo: 30 dias, 60 dias e 10%. A quantidade mínima é por produto. |
| D11 | **Unidade de quantidade.** Nada diz se a quantidade pode ser fracionada (kg, ml). | lacuna | Só inteiros (unidades), coerente com perfumaria/cosméticos. |
