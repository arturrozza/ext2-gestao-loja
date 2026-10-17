# Integração com o Mercado Livre

- **Status:** rascunho
- **Responsável:**
- **Última atualização:** 2026-10-17
- **Casos de uso:** UC19, UC20

## Objetivo

Reduzir o registro manual: as vendas feitas no Mercado Livre entram no sistema automaticamente, com valores e taxas,
para entrar no estoque e no lucro real como qualquer outra venda.

A conexão com a conta e a busca de pedidos já foram testadas na prova de conceito `ml-poc` do repositório
[`ext.1`](https://github.com/gugeldev/ext.1/tree/main/ml-poc).

## Requisitos funcionais

- [ ] RF044 — Cadastrar ou identificar vendas do Mercado Livre.
- [ ] RF092 *(proposto)* — Vincular a conta do Mercado Livre à loja.
- [ ] RF093 *(proposto)* — Importar vendas, evitando duplicidade pelo código externo.
- [ ] RF094 *(proposto)* — Associar produtos importados aos cadastrados antes da baixa no estoque.
- [ ] RF095 *(proposto)* — Registrar as taxas do Mercado Livre como custos da venda.
- [ ] RF096 *(proposto)* — Atualizar a venda quando o status mudar ou o pedido for cancelado.
- [ ] RF097 *(proposto)* — Permitir preencher à mão dados que faltarem para o lucro.

## Regras de negócio

- RN056 — A conta do ML fica vinculada só à loja que a autorizou.
- RN057 — Venda importada tem código externo único (sem duplicidade).
- RN058 — Produtos importados são associados aos cadastrados antes da baixa no estoque.
- RN059 — Taxas do ML viram custos da venda (taxa da plataforma).
- RN060 — Mudança de status e cancelamento atualizam a venda e aplicam o estorno.
- RN061 — Faltando dado para o lucro, o usuário pode completar à mão.

Não funcionais: RNF005 (credenciais protegidas), RNF006 (dados mínimos do comprador), RNF010 (idempotência), RNF012 (falha
no ML não derruba o resto).

## Fora do escopo

- Publicar/editar anúncios, sincronizar estoque do app para o ML.
- Responder perguntas, mensagens, etiquetas de envio.
- Mais de uma conta do ML.

## Fluxos / telas

**UC19 — Vincular conta.**
1. Tela "Mercado Livre" → "Conectar".
2. O app abre a página do Mercado Livre, onde o usuário entra na conta dele e autoriza o acesso.
3. De volta ao app, a tela mostra a conta conectada (apelido), a última sincronização e o botão "Desconectar".

Se a autorização expirar ou for revogada, a conta aparece como "reconectar" e a importação para, sem afetar o resto
(RNF012).

**UC20 — Importar vendas.**
1. O sistema busca os pedidos novos ou alterados desde a última sincronização (ver dúvidas sobre quando).
2. Cada pedido é identificado pelo número do pedido no Mercado Livre. Pedido já importado é atualizado, nunca
   duplicado (RN057, RNF010).
3. Cada item do pedido é associado a um produto cadastrado, se essa associação já foi feita antes para o mesmo anúncio.
   Sem associação, o pedido fica **pendente** e não mexe no estoque (RN058).
4. Na tela "Pendentes", o usuário associa cada item a um produto (com a opção "lembrar para os próximos"), completa
   dados que faltarem (RN061) e confirma.
5. Confirmado, o pedido vira uma venda normal: canal Mercado Livre, origem importada, número do pedido, comprador
   (apelido), custo dos produtos pelo custo médio vigente e a tarifa de venda do Mercado Livre como custo "taxa da
   plataforma". Baixa no estoque e movimentações seguem as regras de [`sales.md`](sales.md).
6. Pedido cancelado ou reembolsado no Mercado Livre depois de importado → a venda é cancelada e os produtos voltam ao
   estoque (UC14 3a, RN060).

## Dados

| Entidade | Campo | Observação |
| --- | --- | --- |
| Conta do ML | identificação e apelido da conta | uma conta por loja |
| Conta do ML | autorização de acesso | protegida, nunca exibida (RNF005) |
| Conta do ML | última sincronização | |
| Associação | anúncio do ML → produto | para associar os próximos pedidos automaticamente |
| Pedido pendente | número do pedido, itens (título, quantidade, valor unitário, tarifa), data, comprador, status | até virar venda |
| Venda | número do pedido no ML | sem repetição (RN057) |

Informações do pedido usadas: número, data, status, itens (anúncio, título, quantidade, valor unitário, tarifa de
venda), apelido do comprador, envio, reembolsos e motivo de cancelamento.

## API

A definir na implementação.

## Critérios de aceite

- [ ] Dado o mesmo pedido importado duas vezes, então existe uma venda só.
- [ ] Dado pedido com item sem mapeamento, então ele fica pendente e o estoque não muda.
- [ ] Dada a associação com "lembrar", então o próximo pedido do mesmo item é importado direto.
- [ ] Dado pedido com tarifa de venda de R$ 12,00, então a venda tem custo "taxa da plataforma" de R$ 12,00.
- [ ] Dado pedido importado e depois cancelado no ML, então na próxima sincronização a venda fica cancelada e o
      estoque volta.
- [ ] Dado o ML fora do ar, então a sincronização falha com mensagem clara e a venda manual continua funcionando.
- [ ] A autorização de acesso ao Mercado Livre nunca aparece no app.

## Dúvidas em aberto

- **Quando importar:** só quando o usuário tocar em "Sincronizar", automaticamente de tempos em tempos, ou assim que
  a venda acontece no Mercado Livre?
- **Estoque insuficiente na associação:** a venda já aconteceu no ML, mas RN020/RN031 proíbem estoque negativo. Bloquear
  até o usuário lançar a entrada, ou permitir com aviso?
- **Frete:** quando o vendedor paga o frete (Mercado Envios), importar como custo de frete? A PoC não tratou disso.
- **Reembolso parcial:** cancelar a venda inteira, ignorar ou ajustar o valor?
- **Imposto:** aplicar automaticamente o percentual de imposto da loja nas vendas importadas?
- **Desde quando importar** na primeira conexão (ex.: últimos 30 dias)?
- Desconectar a conta mantém as vendas já importadas (proposta: sim) e os mapeamentos?
