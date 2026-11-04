# Compras

## Objetivo

Registrar a mercadoria que entra na loja para manter a quantidade e o custo médio corretos. Esse custo é a base do lucro
real.

## Funcionalidades

- Lançar compra com um ou mais produtos.
- Ver o histórico e os detalhes das compras.
- Cancelar compra.

## Regras

- A compra tem data (já vem com a de hoje e pode ser alterada), observação opcional e um ou mais itens.
- Cada item tem produto ativo, quantidade inteira maior que zero, custo unitário não negativo e validade.
- A validade é obrigatória quando o produto "tem validade", informada como mês e ano. O produto conta como vencido depois
  do último dia desse mês.
- Cada item gera um lote e uma movimentação de entrada, sem a pessoa lidar com lotes.
- Toda compra atualiza a quantidade e recalcula o custo médio do produto.
- Compra não é editada. Lançou errado, cancela e lança de novo.
- Ao cancelar, o estoque e o custo médio são recalculados como se a compra não tivesse existido, e ela fica no histórico
  marcada como cancelada.
- Não dá para cancelar se alguma unidade daquela compra já foi vendida. Nesse caso, a correção é pelo
  [ajuste ou por "Corrigir custo"](estoque.md).

## Custo médio

```
novo custo médio = (quantidade atual × custo médio atual + quantidade da entrada × custo da entrada)
                   ÷ (quantidade atual + quantidade da entrada)
```

Sem estoque anterior, o custo médio é o custo da entrada. Exemplo: 10 unidades a R$ 92 + 10 a R$ 100 = custo médio de
R$ 96.

Venda, cancelamento de venda e ajuste não alteram o custo médio.

## Em aberto

- Compra com data passada: o custo médio segue a ordem de lançamento ou a data informada?
