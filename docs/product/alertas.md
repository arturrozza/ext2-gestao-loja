# Alertas

Avisos de falta de estoque e de validade.

## Regras funcionais

- **RF-ALE-01.** A tela de Alertas mostra um card por tipo de alerta, com o número de produtos em cada um.
- **RF-ALE-02.** Tocar em um card abre a lista de produtos já filtrada por aquele alerta. Da tela do produto, o usuário
  pode lançar uma compra, ajustar o estoque ou descartar as unidades vencidas.
- **RF-ALE-03.** O atalho de Alertas na tela inicial mostra o total de alertas ([Início](inicio.md)).

## Regras de negócio

- **RN-ALE-01.** Os tipos de alerta são:

  | Alerta | Quando aparece |
  | --- | --- |
  | Sem estoque | Quantidade zero, em produto com estoque mínimo definido |
  | Estoque baixo | Quantidade maior que zero e igual ou menor que o estoque mínimo |
  | Vencido | O produto tem unidades com validade de um mês que já terminou |
  | Perto de vencer | O produto tem unidades não vencidas cujo mês de validade termina dentro da antecedência de vencimento da loja (30 dias por padrão) |

- **RN-ALE-02.** Produto sem estoque mínimo não gera alerta de quantidade.
- **RN-ALE-03.** Produto sem validade não gera alerta de vencimento.
- **RN-ALE-04.** Produto arquivado não gera alerta.
- **RN-ALE-05.** Os alertas usam os mesmos critérios dos filtros de estoque da lista de produtos: o número do card é
  igual ao número de produtos da lista filtrada.
- **RN-ALE-06.** Os alertas são calculados a partir dos dados atuais e deixam de aparecer quando a situação é
  resolvida. Não é possível dispensar um alerta.
- **RN-ALE-07.** Um produto pode estar em mais de um alerta ao mesmo tempo.
- **RN-ALE-08.** A antecedência de vencimento é configurada na [Loja](loja.md).

## Fora do escopo

Alertas de margem baixa, margem negativa e produto parado, notificação push e e-mail.
