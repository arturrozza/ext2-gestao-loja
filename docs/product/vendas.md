# Vendas

## Objetivo

Registrar cada venda com seus custos reais, dar baixa no estoque e mostrar o **lucro real**. Inclui custos e comissões.

## Funcionalidades

- Registrar venda.
- Ver a lista, com filtros, e os detalhes de uma venda, incluindo a composição dos custos.
- Cancelar venda.

## Lista

- As vendas aparecem do dia mais recente para o mais antigo, pela data da venda.
- No topo, o total vendido, o lucro real, a margem e quantas vendas entram no filtro.
- Filtros:
  - **Período:** hoje, últimos 7 dias (hoje e os 6 dias antes), mês atual ou tudo. Vale a data da venda.
  - **Canal:** um ou mais.
  - **Resultado:** com lucro (acima de zero) ou com prejuízo (abaixo de zero). Uma venda de lucro zero não entra em
    nenhum dos dois.
- Venda cancelada continua na lista, riscada, mas não conta nos totais.

## O que a venda guarda

- **Data:** já vem com a de hoje e não pode ser futura.
- **Canal:** Loja, Mercado Livre ou Revendedora. Mercado Livre é só um canal manual.
- **Produtos:** ao menos um, com quantidade e preço. Cada produto entra uma vez só: para vender mais, aumenta a
  quantidade.
- **Desconto ou acréscimo:** opcional, sobre a venda inteira.
- **Custos:** frete, imposto, taxa de plataforma, comissão e outros, em reais ou percentual.
- **Condição de pagamento:** obrigatória, já vem como "À vista". Só informativa.
- **Forma de pagamento:** obrigatória (Pix, dinheiro, crédito ou débito), começa sem seleção. Só informativa.
- **Cliente:** opcional, ver [Clientes](clientes.md).
- **Revendedora:** obrigatória no canal Revendedora.

## Regras

- O preço vem do preço base e pode ser editado só naquela venda. Pode ser zero: um brinde que sai com a venda. Ele sai
  do estoque, e o custo dele entra no lucro dessa venda.
- O desconto não passa do valor dos produtos. Um desconto igual ao valor deixa a receita em zero: a venda fica com
  prejuízo do custo e sem margem.
- Só produtos, clientes e revendedoras ativos entram na venda.
- Se o valor der prejuízo, o app avisa, mas deixa concluir.
- O app sugere a taxa do Mercado Livre, a comissão e o imposto padrão. Todos são editáveis na venda.
- A taxa da maquininha, se considerada, entra como taxa de plataforma ou outros.
- O custo de cada item é o custo médio no momento do lançamento e fica gravado, mesmo que o custo médio mude depois.
- Venda com data passada usa o custo médio de agora; a data escolhida vale para a lista e os relatórios.
- **Estoque insuficiente:** a venda é bloqueada, com atalhos: "Estoque insuficiente: disponível 2. [Lançar compra] [Ajustar
  estoque]". Depois de corrigir, a pessoa volta para a venda com tudo preenchido.
- A baixa segue a ordem definida em [Estoque](estoque.md): primeiro a validade mais próxima, e unidades vencidas não
  entram. O "disponível" conta só as unidades que podem ser vendidas.
- Receita, custos e lucro são sempre calculados pelo sistema, nunca digitados, e ficam gravados na venda. Uma compra
  ou correção de custo depois não muda vendas já registradas.
- Custo em percentual é calculado sobre a receita e arredondado ao centavo, um por um.
- Se algo falhar no meio, nada da venda é gravado.

## Lucro real

```
receita         = soma de (quantidade × preço) − desconto + acréscimo
custo percentual = receita × percentual
lucro real      = receita − custo dos produtos − custos da venda
margem          = lucro real ÷ receita
```

O desconto conta uma vez só, na receita. Isso corrige a fórmula da EXT1, que o subtraía duas vezes.

Exemplo: 2 unidades a R$ 100, desconto de R$ 20, custo médio de R$ 40, frete de R$ 15 e taxa de 10%.

- Receita: R$ 200 − R$ 20 = **R$ 180**
- Custo dos produtos: 2 × R$ 40 = R$ 80
- Taxa: 10% de R$ 180 = R$ 18
- **Lucro real:** R$ 180 − R$ 80 − R$ 15 − R$ 18 = **R$ 67**

## Cancelamento

Venda não é editada nem apagada. Se foi lançada errada, cancela e lança de novo.

- A pessoa confirma e informa o motivo.
- As unidades voltam às mesmas validades de onde saíram, com registro no histórico.
- O custo médio não muda.
- A venda continua visível, marcada como cancelada.
- Ela deixa de contar em vendas, lucro e comissões.

## Ainda não disponível no app

Cancelar venda: o botão aparece na venda, marcado "Em construção", até a tarefa de cancelamentos.

## Fora do escopo

Controle do que falta receber, parcelas, fiado, importação do Mercado Livre e devolução parcial.

## Em aberto

- Conferir com o cliente a conta do lucro real, o imposto e a taxa padrão:
  [validar com o cliente](README.md#validar-com-o-cliente).
