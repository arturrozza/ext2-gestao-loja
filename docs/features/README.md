# Features

Uma spec por módulo, a partir do [`_template.md`](_template.md). Leia a spec antes de implementar; se a dúvida não
estiver respondida nela, pergunte em vez de inventar. Visão geral e decisões transversais: [`../product.md`](../product.md);
entidades e cálculos: [`../domain.md`](../domain.md); requisitos não funcionais:
[`../non-functional-requirements.md`](../non-functional-requirements.md).

## Specs

| Spec | Status | RF | RN | UC |
| --- | --- | --- | --- | --- |
| [Autenticação e loja](auth-and-store.md) | rascunho | RF001–RF011 | RN001–RN004 | UC01–UC04 |
| [Produtos](products.md) | rascunho | RF012–RF019 | RN005–RN008 | UC05–UC08 |
| [Entradas de estoque](stock-entries.md) | rascunho | RF020–RF027, RF091 | RN009–RN017 | UC09 |
| [Estoque](stock.md) | rascunho | RF028–RF037, RF098 | RN018–RN028 | UC10, UC11 |
| [Vendas, custos e comissões](sales.md) | rascunho | RF038–RF052, RF063–RF072, RF090 | RN029–RN046, RN049 | UC12–UC14 |
| [Revendedoras](resellers.md) | rascunho | RF053–RF062 | RN038, RN039, RN047–RN049 | UC15, UC16 |
| [Relatórios](reports.md) | rascunho | RF073–RF083 | RN044, RN050–RN052 | UC17 |
| [Alertas](alerts.md) | rascunho | RF084–RF089, RF099 | RN022, RN026–RN028, RN041, RN053–RN055 | UC18 |
| [Mercado Livre](mercado-livre.md) | rascunho | RF044, RF092–RF097 | RN056–RN061 | UC19, UC20 |

RF090–RF099 foram **propostos** no documento de Casos de Uso de Alto Nível para fechar a rastreabilidade com as RN;
foram incorporados nas specs acima.

## Ordem sugerida de implementação

Cada passo depende dos anteriores:

1. **Autenticação e loja**: sem ela, nenhuma rota pode ser exposta (RNF001).
2. **Produtos**.
3. **Entradas de estoque** e **Estoque** (lotes, movimentações, custo médio, ajustes).
4. **Revendedoras** (cadastro simples, necessário para o canal Revendedora).
5. **Vendas, custos e comissões**: o núcleo do lucro real.
6. **Alertas** e **Relatórios**: só leem os dados anteriores.
7. **Mercado Livre**: reaproveita o registro de venda; depende de credenciais e de decisões em aberto.

## Como evoluir uma spec

1. Responda as "Dúvidas em aberto" (e as decisões pendentes de [`product.md`](../product.md)) com o cliente.
2. Atualize a spec, apague a dúvida resolvida e mude o status para **aprovado**.
3. Ao começar a implementar: **em desenvolvimento**. Ao entrar em produção: **entregue**.
4. Mudou uma regra? Atualize a spec no mesmo PR do código.
