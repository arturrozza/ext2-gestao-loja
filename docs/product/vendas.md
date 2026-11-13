# Vendas

Registro das vendas com seus custos, baixa no estoque e cálculo do lucro real.

## Regras funcionais

### Nova venda

- **RF-VEN-01.** O usuário pode registrar uma venda com data, canal, produtos, desconto ou acréscimo, custos,
  condição de pagamento, forma de pagamento (venda à vista) ou data de pagamento (venda a prazo), cliente e, no canal
  Revendedora, a revendedora.
- **RF-VEN-02.** A data vem preenchida com hoje e pode ser alterada.
- **RF-VEN-03.** O usuário pode adicionar produtos pela busca ou lendo o código de barras. Cada produto entra com
  quantidade 1 e com o preço base, e o usuário pode alterar quantidade e preço.
- **RF-VEN-04.** O usuário escolhe entre nenhum ajuste, desconto ou acréscimo sobre a venda inteira.
- **RF-VEN-05.** O app sugere os custos da venda, editáveis e removíveis:
  - o imposto padrão da loja, quando maior que zero;
  - no canal Mercado Livre, a taxa do Mercado Livre como taxa de plataforma, quando maior que zero;
  - no canal Revendedora, a comissão padrão da revendedora escolhida.
- **RF-VEN-06.** Ao trocar de canal ou de revendedora, o app troca a taxa e a comissão sugeridas e mantém os outros
  custos.
- **RF-VEN-07.** O usuário pode adicionar custos de frete, imposto, taxa de plataforma, comissão e outros, em reais ou
  em percentual, com um nome opcional (por exemplo, "Embalagem").
- **RF-VEN-08.** A condição de pagamento vem como "À vista" e pode ser trocada para "A prazo" (fiado). Na venda à
  vista, a forma de pagamento (Pix, dinheiro, crédito ou débito) começa sem seleção. Na venda a prazo, o usuário
  informa a data prevista de pagamento, e a forma de pagamento fica para quando a venda for paga.
- **RF-VEN-09.** O usuário pode buscar um cliente ou criar um na própria venda, informando só o nome.
- **RF-VEN-10.** Enquanto a venda é preenchida, o app mostra a receita, os custos e o lucro ou prejuízo.
- **RF-VEN-11.** Se a venda dá prejuízo, o app avisa e permite concluir.
- **RF-VEN-12.** Se falta estoque vendável de um produto, o app mostra "Estoque insuficiente: disponível N." com os
  atalhos "Lançar compra" e "Ajustar estoque". Depois da correção, o usuário volta para a venda com os dados
  preenchidos.

### Lista e detalhes

- **RF-VEN-13.** O usuário pode ver a lista de vendas, da data mais recente para a mais antiga.
- **RF-VEN-14.** O topo da lista mostra o total vendido, o lucro real, a margem e o número de vendas que entram nos
  filtros.
- **RF-VEN-15.** O usuário pode filtrar a lista por:
  - **período:** hoje, últimos 7 dias, mês atual ou tudo;
  - **canal:** um ou mais;
  - **resultado:** com lucro ou com prejuízo.
- **RF-VEN-16.** A venda cancelada aparece na lista riscada.
- **RF-VEN-17.** O usuário pode ver os detalhes de uma venda: produtos, preços, receita, composição dos custos, custo
  dos produtos, lucro real, margem, pagamento e sua situação, cliente, revendedora, autor e, quando cancelada, data e
  motivo do cancelamento.

### Cancelamento

- **RF-VEN-18.** O usuário pode cancelar uma venda, depois de confirmar, informando o motivo.

### Pagamento a prazo

- **RF-VEN-19.** O usuário pode marcar uma venda a prazo como paga, informando a data do pagamento (hoje, por padrão)
  e a forma de pagamento.
- **RF-VEN-20.** O usuário pode voltar uma venda a prazo paga para não paga.
- **RF-VEN-21.** A lista e os detalhes mostram a situação das vendas a prazo: paga, não paga ou vencida. O usuário pode
  filtrar a lista por situação de pagamento: não paga, vencida ou paga.

## Regras de negócio

### Dados da venda

- **RN-VEN-01.** A data da venda não pode ser futura.
- **RN-VEN-02.** O canal é obrigatório: Loja, Mercado Livre ou Revendedora.
- **RN-VEN-03.** A revendedora é obrigatória no canal Revendedora e não é aceita nos outros canais.
- **RN-VEN-04.** Uma venda tem de 1 a 100 produtos. Cada produto aparece uma vez por venda; para vender mais unidades,
  aumenta-se a quantidade.
- **RN-VEN-05.** A quantidade de cada produto é inteira, de 1 a 100.000.
- **RN-VEN-06.** O preço de cada produto vem do preço base e pode ser alterado só naquela venda. O preço pode ser zero
  (brinde que sai com a venda): o brinde sai do estoque e o custo dele entra no lucro da venda.
- **RN-VEN-07.** O desconto não passa do valor dos produtos. Um desconto igual ao valor dos produtos deixa a receita em
  zero.
- **RN-VEN-08.** Uma venda tem até 20 custos. Custo em percentual vai de 0% a 100%.
- **RN-VEN-09.** A condição de pagamento (À vista ou A prazo) é obrigatória. A venda à vista exige a forma de
  pagamento e já nasce paga. A venda a prazo exige a data prevista de pagamento, nasce não paga e só tem forma de
  pagamento quando é paga. O sistema controla apenas se a venda foi paga: não há parcelas, juros, cobrança nem
  pagamento parcial.
- **RN-VEN-10.** O cliente é opcional na venda à vista e obrigatório na venda a prazo.
- **RN-VEN-11.** Só produtos, clientes e revendedoras ativos entram em uma venda.
- **RN-VEN-12.** A taxa da maquininha, quando considerada, é lançada como taxa de plataforma ou como outro custo.
- **RN-VEN-13.** O número da venda ("Venda #12") é sequencial na loja e nunca se repete, nem quando a venda é
  cancelada.

### Estoque e custo

- **RN-VEN-14.** A venda é recusada se algum produto não tem unidades vendáveis suficientes. As unidades vendáveis
  excluem as vencidas.
- **RN-VEN-15.** As unidades saem do estoque pela ordem definida em [Estoque](estoque.md): validade mais próxima
  primeiro.
- **RN-VEN-16.** O custo de cada produto é o custo médio no momento do registro, arredondado ao centavo, e fica gravado
  na venda.
- **RN-VEN-17.** Uma venda com data passada usa o custo médio do momento do registro. A data informada vale para a
  lista e os relatórios.
- **RN-VEN-18.** Receita, custos e lucro real são calculados pelo sistema no registro e ficam gravados. Uma compra,
  ajuste ou correção de custo posterior não altera vendas já registradas.
- **RN-VEN-19.** Venda não é editada nem apagada, exceto a situação de pagamento da venda a prazo (RN-VEN-30 e
  RN-VEN-31). Uma venda lançada errada é cancelada e lançada de novo.

### Lista

- **RN-VEN-20.** O período "últimos 7 dias" é hoje e os 6 dias anteriores. Os períodos usam a data da venda.
- **RN-VEN-21.** "Com lucro" é lucro acima de zero e "com prejuízo" é lucro abaixo de zero. Venda com lucro zero não
  entra em nenhum dos dois.
- **RN-VEN-22.** Vendas canceladas não entram nos totais.

### Cancelamento

- **RN-VEN-23.** O motivo do cancelamento é obrigatório (até 500 caracteres).
- **RN-VEN-24.** As unidades voltam aos mesmos lotes de onde saíram, com uma movimentação de venda cancelada. Se o lote
  venceu nesse meio tempo, as unidades voltam vencidas.
- **RN-VEN-25.** O cancelamento não altera o custo médio: as unidades voltam pelo custo médio atual. Se o produto está
  sem estoque, voltam pelo custo gravado na venda.
- **RN-VEN-26.** A venda cancelada continua visível, com data e motivo do cancelamento, e deixa de contar em vendas,
  lucro, comissões, relatórios e totais de clientes e revendedoras.
- **RN-VEN-27.** Uma venda cancelada não pode ser cancelada de novo.

### Pagamento a prazo

- **RN-VEN-28.** A data prevista de pagamento não pode ser anterior à data da venda.
- **RN-VEN-29.** A venda a prazo não paga cuja data prevista já passou é vencida. A situação de vencida é calculada a
  cada consulta e não fica gravada.
- **RN-VEN-30.** Ao marcar como paga, o usuário informa a data do pagamento, que não pode ser futura nem anterior à
  data da venda, e a forma de pagamento. Só venda a prazo não cancelada pode ser marcada como paga.
- **RN-VEN-31.** Uma venda a prazo paga pode voltar a ser não paga. A data e a forma do pagamento são apagadas e a
  alteração fica no registro de auditoria.
- **RN-VEN-32.** O pagamento não altera receita, custos, lucro nem relatórios, que seguem a data da venda.
- **RN-VEN-33.** A venda cancelada não tem mais situação de pagamento: não pode ser marcada como paga, deixa de
  aparecer como vencida e não entra nos filtros por situação de pagamento.

## Cálculos

```
receita           = soma de (quantidade × preço) − desconto + acréscimo
custo do produto  = quantidade × custo médio no registro
custo percentual  = receita × percentual, arredondado ao centavo, um custo por vez
lucro real        = receita − custo dos produtos − custos da venda
margem            = lucro real ÷ receita
```

O desconto é descontado uma vez, na receita. Com receita zero, a margem não é calculada.

Exemplo: 2 unidades a R$ 100, desconto de R$ 20, custo médio de R$ 40, frete de R$ 15 e taxa de 10%.

- Receita: R$ 200 − R$ 20 = **R$ 180**
- Custo dos produtos: 2 × R$ 40 = R$ 80
- Taxa: 10% de R$ 180 = R$ 18
- **Lucro real:** R$ 180 − R$ 80 − R$ 15 − R$ 18 = **R$ 67**
- **Margem:** R$ 67 ÷ R$ 180 = 37,2%

## Fora do escopo

Edição de venda, parcelas, juros, cobrança, pagamento parcial, devolução parcial e importação de vendas do Mercado
Livre.
