# Compras

Entrada de mercadoria na loja. A compra aumenta a quantidade em estoque e recalcula o custo médio dos produtos.

## Regras funcionais

- **RF-COM-01.** O usuário pode lançar uma compra com data, observação e um ou mais itens. Cada item tem produto,
  quantidade, custo unitário e, quando o produto tem validade, a validade.
- **RF-COM-02.** O usuário pode adicionar produtos à compra pela busca ou lendo o código de barras.
- **RF-COM-03.** A data da compra vem preenchida com hoje e pode ser alterada.
- **RF-COM-04.** O usuário pode ver a lista de compras, da mais recente para a mais antiga, com número, data, valor e
  situação.
- **RF-COM-05.** O usuário pode ver os detalhes de uma compra: itens, quantidades, custos, validades, observação,
  autor e, quando cancelada, data e motivo do cancelamento.
- **RF-COM-06.** O usuário pode cancelar uma compra, depois de confirmar, informando um motivo opcional.

## Regras de negócio

- **RN-COM-01.** A data da compra não pode ser futura.
- **RN-COM-02.** Uma compra tem de 1 a 100 itens.
- **RN-COM-03.** Cada item tem produto ativo, quantidade inteira de 1 a 100.000 e custo unitário maior ou igual a
  zero. Custo zero é aceito (por exemplo, brinde do fornecedor).
- **RN-COM-04.** O mesmo produto pode aparecer em mais de um item da compra, por exemplo com validades ou custos
  diferentes.
- **RN-COM-05.** A validade é informada como mês e ano. É obrigatória quando o produto tem validade e recusada quando
  não tem. A validade não pode ser de um mês que já passou.
- **RN-COM-06.** Cada item gera um lote e uma movimentação de entrada no estoque ([Estoque](estoque.md)).
- **RN-COM-07.** Toda compra aumenta a quantidade e recalcula o custo médio de cada produto, na ordem em que as compras
  são lançadas, e não pela data informada. Uma compra lançada hoje com data passada entra no custo médio atual, e as
  vendas já registradas não mudam.
- **RN-COM-08.** O número da compra ("Compra #12") é sequencial na loja e nunca se repete, nem quando a compra é
  cancelada.
- **RN-COM-09.** Compra não é editada. Uma compra lançada errada é cancelada e lançada de novo.

### Cancelamento

- **RN-COM-10.** A compra cancelada continua no histórico, marcada como cancelada, com data e motivo.
- **RN-COM-11.** Cancelar tira do estoque as unidades que a compra trouxe e o valor que ela trouxe.
- **RN-COM-12.** Não é possível cancelar se alguma unidade da compra já saiu do estoque (venda, ajuste ou descarte).
  Nesse caso, a correção é feita por ajuste ou correção de custo ([Estoque](estoque.md)). Se a venda que levou as
  unidades for cancelada antes, as unidades voltam e a compra pode ser cancelada.
- **RN-COM-13.** Depois do cancelamento, o valor em estoque nunca fica negativo. Se o produto fica sem unidades, o
  valor zera.
- **RN-COM-14.** Uma compra cancelada não pode ser cancelada de novo.

## Cálculos

### Custo médio

```
novo custo médio = (quantidade atual × custo médio atual + quantidade da entrada × custo da entrada)
                   ÷ (quantidade atual + quantidade da entrada)
```

Sem estoque anterior, o custo médio é o custo da entrada.

Exemplo: 10 unidades a R$ 92 e depois 10 unidades a R$ 100 resultam em custo médio de R$ 96.

### Custo médio depois de cancelar

Se depois da compra cancelada só entraram outras compras, estoque e custo médio ficam como se ela não tivesse
existido. Se houve venda ou correção de custo no meio, o resultado é diferente, porque as vendas já registradas não
mudam.

Exemplo: 10 unidades a R$ 92 e 10 a R$ 100 dão custo médio de R$ 96. São vendidas 5 unidades (saem a R$ 96, total de
R$ 480). Cancelando a segunda compra, saem 10 unidades e R$ 1.000: restam 5 unidades e R$ 440, custo médio de R$ 88.

## Fora do escopo

Edição de compra, fornecedores, contas a pagar e nota fiscal de entrada.
