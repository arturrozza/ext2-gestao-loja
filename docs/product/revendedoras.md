# Revendedoras

Cadastro das revendedoras, vendas feitas por elas e cálculo da comissão. A revendedora é um cadastro e não acessa o
app.

## Regras funcionais

- **RF-REV-01.** O usuário pode ver a lista de revendedoras em ordem alfabética, com nome, comissão padrão, telefone e
  totais de todas as vendas.
- **RF-REV-02.** O usuário pode buscar revendedoras por nome ou telefone, com ou sem máscara.
- **RF-REV-03.** O usuário pode alternar entre revendedoras ativas e arquivadas.
- **RF-REV-04.** O usuário pode cadastrar e editar uma revendedora com nome, telefone, comissão padrão e observação.
- **RF-REV-05.** A tela da revendedora mostra o total vendido, o número de vendas, a comissão e a lista das vendas
  dela, filtrados por período: hoje, últimos 7 dias, mês atual ou tudo. O período inicial é o mês atual.
- **RF-REV-06.** O usuário pode arquivar e reativar uma revendedora.

## Regras de negócio

- **RN-REV-01.** Obrigatórios: nome (até 120 caracteres) e comissão padrão. Telefone e observação (até 500 caracteres)
  são opcionais.
- **RN-REV-02.** A comissão padrão vai de 0% a 100%, com até duas casas decimais.
- **RN-REV-03.** O nome pode se repetir. Na lista e na escolha da revendedora na venda, a comissão e o telefone
  aparecem abaixo do nome.
- **RN-REV-04.** Na venda pelo canal Revendedora, a comissão padrão da revendedora escolhida é sugerida como custo e
  pode ser alterada só naquela venda.
- **RN-REV-05.** A comissão incide sobre a receita da venda e entra como custo no lucro real.
- **RN-REV-06.** Mudar a comissão padrão não altera vendas já registradas.
- **RN-REV-07.** Revendedora não é excluída, é arquivada. Só revendedoras ativas podem ser escolhidas em novas vendas.
  Revendedoras arquivadas continuam nas vendas já registradas e nos relatórios e podem ser reativadas.
- **RN-REV-08.** Revendedora arquivada não é editada. Para alterar, o usuário reativa a revendedora antes.
- **RN-REV-09.** Total vendido, número de vendas e comissão consideram só as vendas não canceladas do canal
  Revendedora. A comissão é a soma dos custos de comissão dessas vendas.

## Cálculos

```
comissão = receita da venda × percentual de comissão
```

Exemplo: venda com receita de R$ 200 e comissão de 10% gera R$ 20 de custo de comissão.

## Fora do escopo

Consignado (revendedora que leva produtos e acerta depois), registro de acerto e acesso da revendedora ao app.
