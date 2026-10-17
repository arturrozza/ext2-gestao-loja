# Produtos

- **Status:** rascunho
- **Responsável:**
- **Última atualização:** 2026-10-17
- **Casos de uso:** UC05, UC06, UC07, UC08

## Objetivo

Cadastrar e encontrar rapidamente os produtos da loja. O produto é a base de estoque, vendas, relatórios e alertas.

## Requisitos funcionais

- [ ] RF012 — Cadastrar produto com as informações básicas.
- [ ] RF013 — Consultar os produtos cadastrados.
- [ ] RF014 — Visualizar os detalhes de um produto.
- [ ] RF015 — Editar as informações de um produto.
- [ ] RF016 — Buscar produtos por nome, código interno ou código de barras.
- [ ] RF017 — Inativar um produto.
- [ ] RF018 — Reativar um produto inativo.
- [ ] RF019 — Visualizar produtos ativos e inativos separadamente.

## Regras de negócio

- RN005 — Todo produto precisa de nome.
- RN006 — Código interno e código de barras, quando informados, são únicos na loja.
- RN007 — Produto com movimentações ou vendas não pode ser excluído, só inativado.
- RN008 — Produto inativo continua em históricos e relatórios, mas não pode ser usado em novas entradas ou vendas.

## Fora do escopo

- Variações (tamanho, cor) como um produto com filhos: cada variação é um produto.
- Preço por canal.
- Importar catálogo do Mercado Livre.

## Fluxos / telas

**UC05 — Cadastrar produto.** Formulário: nome, código de barras (digitar ou escanear com a câmera), código interno,
categoria (D07), preço base, quantidade mínima, localização, "controla validade", foto. Quantidade e custo médio
**não** são digitados: começam em zero e mudam pelas entradas.

**UC06 — Consultar produtos.** Lista com abas Ativos / Inativos (RF019), busca por nome, código interno ou de barras
(RF016), e leitura de código de barras pela câmera como atalho de busca. Cada linha mostra nome, foto, quantidade em
estoque e selo de estoque baixo/vencimento. O detalhe mostra os dados do produto, saldo, custo médio, valor em estoque
e atalhos para lotes e movimentações ([`stock.md`](stock.md)).

**UC07 — Editar produto.** Mesmo formulário do cadastro; RN006 vale na edição.

**UC08 — Inativar e reativar.** Ação no detalhe, com confirmação. Inativar grava a data de inativação. Produto inativo
some dos seletores de entrada e venda, mas segue no histórico.

> No PDF de Casos de Uso de Alto Nível, a descrição do UC08 repete por engano a do UC09 (registrar entrada). A
> descrição correta é a acima.

## Dados

| Campo | Tipo | Obrigatório | Validação |
| --- | --- | --- | --- |
| nome | texto | sim | 1–120 caracteres (RN005) |
| código de barras | texto | não | único na loja (RN006); só dígitos (EAN-8/13, UPC) |
| código interno | texto | não | único na loja (RN006) |
| categoria | ref. | não | D07 |
| foto | imagem | não | ver dúvidas |
| preço base | dinheiro | sim | ≥ 0 |
| quantidade mínima | inteiro | sim (padrão 0) | ≥ 0 |
| localização | texto | não | texto livre: "caixa 3", "prateleira B2", "gôndola 1" |
| controla validade | booleano | sim (padrão não) | |
| situação | ativo/inativo | sim | |
| custo médio atual | decimal | calculado | só muda por entrada ([`domain.md`](../domain.md#custo-médio-rn014rn017)) |

A unicidade dos códigos considera também os produtos inativos, para não reaproveitar um código que existe no
histórico.

## API

A definir na implementação.

## Critérios de aceite

- [ ] Dado um produto sem nome, quando salvo, então recebo "Informe o nome do produto".
- [ ] Dado um código de barras já usado por outro produto, quando salvo, então recebo erro dizendo qual produto usa o
      código.
- [ ] Dado um código de barras, quando busco por ele, então o produto é encontrado; o mesmo vale para código interno e
      parte do nome (sem diferenciar maiúsculas e acentos).
- [ ] Dado um produto inativo, então ele aparece na aba Inativos e não aparece no seletor de venda nem de entrada.
- [ ] Dado um produto inativo com vendas, então as vendas e relatórios antigos continuam mostrando o produto.
- [ ] Dado um produto recém-criado, então quantidade = 0 e custo médio = 0.

## Dúvidas em aberto

- D07 (categorias) e D11 (quantidade inteira), em [`product.md`](../product.md#decisões-pendentes-transversais).
- **Excluir** produto sem nenhuma movimentação/venda é permitido (RN007 sugere que sim)? Ou só inativar, sempre?
- **Foto:** é necessária no MVP? (Tirar foto pelo app tem um custo de implementação maior que o resto do cadastro.)
- **Preço base:** é só sugestão no formulário de venda, ou o app deve avisar quando a venda sai abaixo dele ("menor
  valor de venda")?
- Pode mudar "controla validade" depois de haver lotes?
