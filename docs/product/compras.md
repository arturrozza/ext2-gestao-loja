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

## Cancelamento

- A pessoa confirma e pode informar o motivo, que é opcional.
- A compra fica no histórico, marcada como cancelada, com o motivo quando houver. O número dela não volta a ser usado.
- Saem do estoque as unidades que ela trouxe, com o valor que ela trouxe. Se depois dela só entraram outras compras,
  estoque e custo médio ficam como se ela nunca tivesse existido.
- Se houve venda ou correção de custo no meio, o custo médio fica um pouco diferente do "nunca existiu", porque as
  vendas já feitas não mudam. Exemplo: 10 unidades a R$ 92 e depois 10 a R$ 100 dão custo médio de R$ 96. Vendem-se 5
  (a R$ 96) e a segunda compra é cancelada: sobram 5 unidades a R$ 88.
- O estoque nunca fica com valor negativo, e, se não sobrar unidade, o valor zera.
- Não dá para cancelar se alguma unidade daquela compra já saiu do estoque, vendida, ajustada ou descartada. Nesse
  caso, a correção é pelo [ajuste ou por "Corrigir custo"](estoque.md). Se a venda for cancelada antes, as unidades
  voltam e a compra pode ser cancelada.
- Não dá para cancelar duas vezes.

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
