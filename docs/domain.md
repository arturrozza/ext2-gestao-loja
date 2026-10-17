# Domínio

> Glossário, entidades e cálculos compartilhados pelas features. Baseado no Modelo Conceitual de Dados da EXT1 e nas
> regras de negócio. Descreve o conceito, não o banco de dados.
> Itens marcados com **(D0x)** dependem de uma decisão pendente em [`product.md`](product.md#decisões-pendentes-transversais).

## Glossário

| Termo | Significado |
| --- | --- |
| Loja | O estabelecimento. Todo dado de negócio pertence a uma loja; o MVP opera com uma só. |
| Usuário | Pessoa que acessa o app. |
| Produto | Mercadoria vendida pela loja. |
| Categoria | Agrupamento opcional de produtos (D07). |
| Compra | Uma entrada de mercadorias, com data e itens (D03). |
| Item de entrada | Um produto dentro de uma compra: quantidade, custo unitário e validade. |
| Lote | As unidades recebidas num item de entrada. Guarda quantidade inicial, disponível e validade. |
| Movimentação de estoque | Qualquer alteração na quantidade disponível de um lote. |
| Venda | Uma operação comercial, manual ou importada. |
| Item de venda | Um produto vendido: quantidade, valor unitário e custo unitário considerado. |
| Custo de venda | Frete, imposto, taxa de plataforma, comissão ou outro custo de uma venda. |
| Revendedora | Pessoa que vende em nome da loja, com comissão. Não usa o app. |
| Conta do Mercado Livre | Conta do Mercado Livre que o usuário autorizou para a loja. |
| Canal | Onde a venda aconteceu: Loja, Mercado Livre ou Revendedora. |
| Origem da venda | Manual (digitada no app) ou importada (Mercado Livre). |
| Custo médio | Custo ponderado das unidades em estoque de um produto. |
| Receita | Valor efetivamente vendido, já com desconto e acréscimo. |
| Lucro real | Receita menos custo dos produtos e custos da venda. |
| Margem | Lucro real ÷ receita. |
| FEFO | *First expired, first out*: sai primeiro o lote com validade mais próxima. |

## Entidades e relacionamentos

Toda entidade abaixo pertence a uma loja, mesmo onde a seta não aparece.

```
Loja 1──1 Usuário            (MVP: um usuário por loja)
Loja 1──N Produto N──0..1 Categoria
Compra 1──N Item de entrada N──1 Produto
Item de entrada 1──1 Lote N──1 Produto
Lote 1──N Movimentação
Venda 1──N Item de venda N──1 Produto
Item de venda 1──N Movimentação (saída de lotes diferentes)
Venda 1──N Custo de venda
Venda N──0..1 Revendedora
Venda N──0..1 Conta do Mercado Livre
```

Relatórios e alertas **não são entidades**: são calculados a partir dos dados acima.

### Produto

Nome (obrigatório), código de barras, código interno, foto, categoria, preço base, custo médio atual, quantidade
mínima, localização física, controla validade (sim/não), situação (ativo/inativo), data de inativação.

- A quantidade em estoque **não** é digitada: é a soma das quantidades disponíveis dos lotes.
- O custo médio só muda por entrada (RN014, RN017).
- "Preço base" é o "preço base ou menor valor de venda" dos módulos: o preço de referência sugerido na venda.

### Compra e item de entrada

Compra: data, observações, situação (concluída/cancelada), data de cancelamento.
Item de entrada: produto, quantidade, custo unitário, validade (quando o produto controla validade).

### Lote

Produto, item de entrada de origem, quantidade inicial, quantidade disponível, custo unitário da entrada, validade
(opcional). Todo item de entrada gera um lote (D06). Saldo do produto = Σ quantidade disponível dos lotes.

### Movimentação de estoque

Lote, tipo, quantidade, data, origem, motivo, e o vínculo com o item de entrada ou item de venda quando houver
(RN019). Movimentações são imutáveis.

| Tipo | Origem | Efeito no lote | Quando |
| --- | --- | --- | --- |
| entrada | compra | + | item de entrada registrado |
| saída | venda | − | item de venda registrado (pode gerar várias, uma por lote) |
| ajuste | ajuste manual | + ou − | correção manual, com motivo obrigatório (RN021) |
| estorno | cancelamento | + (venda) ou − (compra) | cancelamento de venda ou de compra |

### Venda, item e custo

Venda: data, canal, origem, revendedora, conta do Mercado Livre, código externo (importadas), desconto, acréscimo,
valor total, lucro real, situação (concluída/cancelada), data de cancelamento.
Item: produto, quantidade, valor unitário, **custo unitário considerado** (congelado), subtotal.
Custo: tipo (frete, imposto, taxa de plataforma, comissão, outro), tipo de cálculo (fixo/percentual), valor base
(R$ ou %), **valor calculado** em R$ (congelado).

A comissão da revendedora é um custo do tipo "comissão" (RN049).

### Revendedora

Nome, telefone, comissão padrão (%), observações, situação (ativa/inativa), data de inativação.

### Conta do Mercado Livre

Identificador da conta no ML, nome da conta, credenciais de acesso e data da última sincronização. No máximo uma por loja. As credenciais de acesso ficam protegidas e nunca são exibidas (RNF005).

### Configurações da loja (D09)

Antecedência para "próximo do vencimento" (dias), período para "produto parado" (dias), limite de "baixa margem" (%).

## Cálculos

Valores em dinheiro e percentuais são calculados com precisão de centavos, sem erro de arredondamento (RNF009).

### Custo médio (RN014–RN017)

Recalculado a cada item de entrada:

```
novo custo médio = (qtd atual × custo médio atual + qtd entrada × custo unitário entrada)
                   ÷ (qtd atual + qtd entrada)
```

- Sem estoque anterior (qtd atual = 0): novo custo médio = custo unitário da entrada (RN016).
- Exemplo: 10 un. a R$ 20,00 + entrada de 10 un. a R$ 30,00 → R$ 25,00.
- Vendas, ajustes e estornos de venda **não** recalculam o custo médio (RN017; estorno: ponto em aberto do UC14,
  proposta aceita aqui).

### Valor em estoque (RN023)

```
valor do produto = quantidade disponível × custo médio atual
valor total      = Σ valor dos produtos
```

### Receita da venda (RN035)

```
subtotal do item = quantidade × valor unitário
receita          = Σ subtotais − desconto + acréscimo
```

### Custos da venda (RN036, RN037)

```
custo fixo       = valor base (R$)
custo percentual = receita × valor base ÷ 100      (D05)
comissão         = receita × comissão (%) ÷ 100    (comissão padrão da revendedora, editável na venda)
```

O valor calculado é gravado e não muda depois (RN039).

### Lucro real e margem (RN040, RN041)

```
custo dos produtos = Σ (quantidade × custo unitário considerado)
custos da venda    = Σ valor calculado dos custos (frete, imposto, taxa, comissão, outros)
lucro real         = receita − custo dos produtos − custos da venda     (sem subtrair o desconto de novo, D04)
margem             = lucro real ÷ receita      (receita > 0)
```

- Margem negativa: lucro real < 0 (RN041).
- Baixa margem: 0 ≤ margem < limite configurado (padrão 10%).
- Exemplo: 2 un. a R$ 100,00, desconto R$ 20,00, custo médio R$ 40,00, frete fixo R$ 15,00, taxa 10%:
  receita = 180,00; custo dos produtos = 80,00; taxa = 18,00; lucro = 180 − 80 − 15 − 18 = **67,00**; margem ≈ 37,2%.

### Margem de um produto (relatórios e alertas)

Uma venda pode ter vários produtos, então os custos da venda são rateados pela participação de cada item na soma dos
subtotais:

```
participação do item = subtotal do item ÷ Σ subtotais da venda
lucro do item        = subtotal − quantidade × custo considerado − participação × custos da venda
margem do produto    = Σ lucro dos itens ÷ Σ subtotais    (só vendas concluídas no período)
```

> O protótipo rateava pela receita (com desconto). Ratear pela soma dos subtotais fecha a conta melhor; confirmar
> junto com D04.

### Baixa de estoque na venda (RN025, RN032)

Para cada item, retirar a quantidade dos lotes com saldo em ordem FEFO: validade mais próxima primeiro; lotes sem
validade por último, por data de entrada (FIFO). Cada lote tocado gera uma movimentação de saída.

### Situação de um lote (RN026–RN028)

```
sem validade → não gera alerta
validade < hoje                         → vencido
hoje ≤ validade ≤ hoje + antecedência   → próximo do vencimento
caso contrário                          → ok
```

"Hoje" é a data local da loja (America/Sao_Paulo), não UTC.

### Estoque baixo (RN022)

`quantidade disponível ≤ quantidade mínima` do produto.

### Produto parado (RN053)

Produto ativo sem venda concluída nos últimos N dias (padrão 60). Para não marcar como parado um produto recém
cadastrado, a contagem começa na data da última venda ou, se nunca vendeu, na data da primeira entrada (ver dúvida em
[`alerts.md`](features/alerts.md)).

## Totais e vendas canceladas

Vendas canceladas ficam no histórico, mas **não entram** em nenhum total de vendas, lucro, custos ou comissões
(RN044).
