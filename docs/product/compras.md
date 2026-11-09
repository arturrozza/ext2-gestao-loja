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
- A data não pode ser no futuro. "Hoje" é o dia da loja (horário de Brasília), não o do celular.
- Cada item tem produto ativo, quantidade inteira maior que zero, custo unitário não negativo e validade.
- Custo zero é aceito (por exemplo, um brinde do fornecedor) e baixa o custo médio.
- O mesmo produto pode entrar em mais de um item da compra, por exemplo com validades ou custos diferentes.
- Cabem até 100 itens numa compra e até 100.000 unidades num item.
- A validade é obrigatória quando o produto "tem validade" e recusada quando não tem, informada como mês e ano. O
  produto conta como vencido depois do último dia desse mês, então não se lança uma validade de mês que já passou.
- Cada item gera um lote e uma movimentação de entrada, sem a pessoa lidar com lotes.
- Toda compra atualiza a quantidade e recalcula o custo médio do produto.
- O número da compra ("Compra #12") é sequencial na loja e nunca se repete, nem quando ela é cancelada.
- Se algo der errado em qualquer item, nada da compra é gravado.
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

O custo médio segue a **ordem em que as compras são lançadas**, não a data informada. Uma compra lançada hoje com data
da semana passada entra no custo médio de agora, e as vendas que já aconteceram não mudam. Isso pode ser revisto (ver
`docs/decisions.md`).

Venda, cancelamento de venda e ajuste não alteram o custo médio.

## Ainda não disponível no app

Cancelar compra: o botão aparece na compra, marcado "Em construção", até a tarefa de cancelamentos.
