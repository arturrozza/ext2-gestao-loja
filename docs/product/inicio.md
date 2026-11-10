# Início

Tela inicial do app e navegação principal.

## Regras funcionais

- **RF-INI-01.** A tela inicial mostra uma saudação conforme a hora do dia (bom dia, boa tarde ou boa noite).
- **RF-INI-02.** A tela inicial mostra o resumo do mês atual: lucro real, faturamento, margem e número de vendas.
- **RF-INI-03.** O resumo mostra a variação percentual do lucro em relação aos mesmos dias do mês anterior.
- **RF-INI-04.** O resumo mostra um gráfico com o faturamento de cada um dos últimos 7 dias (hoje e os 6 dias
  anteriores).
- **RF-INI-05.** O usuário pode esconder e mostrar os valores do resumo. Os valores voltam a aparecer ao reabrir a
  tela.
- **RF-INI-06.** O resumo leva ao relatório do mês atual ([Relatórios](relatorios.md)).
- **RF-INI-07.** A tela inicial dá acesso aos módulos em três seções, cada uma com um contador ou descrição:
  - **Dia a dia:** Vendas (vendas do mês), Compras (compras lançadas) e Produtos (produtos cadastrados).
  - **Pessoas:** Clientes (clientes ativos), Revendedoras (revendedoras ativas) e Usuários (usuários ativos).
  - **Gestão:** Relatórios, Alertas (com o total de alertas ativos) e Loja.
- **RF-INI-08.** A barra inferior tem as abas Início, Vendas e Estoque (lista de produtos) e um botão "+" que abre as
  ações de cadastro: nova venda, nova compra, novo produto e novo cliente.

## Regras de negócio

- **RN-INI-01.** O resumo do mês considera as vendas do dia 1º do mês atual até hoje, pela data da venda, sem as
  canceladas.
- **RN-INI-02.** A comparação do lucro usa o mês anterior do dia 1º até o mesmo dia do mês de hoje. Se o mês anterior
  for mais curto, usa o mês anterior inteiro.
- **RN-INI-03.** A variação do lucro não aparece quando o lucro do período de comparação é zero ou negativo.
- **RN-INI-04.** Lucro negativo aparece destacado como prejuízo.
- **RN-INI-05.** O total de alertas conta cada alerta de cada produto: um produto em dois alertas soma 2
  ([Alertas](alertas.md)).

## Cálculos

```
variação do lucro = (lucro do mês atual − lucro do período de comparação) ÷ lucro do período de comparação
```

Exemplo: em 10 de março, o lucro de 1º a 10 de março é R$ 1.200 e o de 1º a 10 de fevereiro é R$ 1.000. A variação é
de +20%.
