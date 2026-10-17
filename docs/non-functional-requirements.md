# Requisitos não funcionais

> Qualidades e restrições que valem para o sistema todo (RNF001–RNF020, entrega da EXT2).

## Segurança e privacidade

- **RNF001:** o acesso às funcionalidades principais exige autenticação do usuário.
- **RNF002:** senhas são armazenadas de forma protegida (hash com algoritmo adequado), nunca em texto puro.
- **RNF003:** a comunicação entre o app e o servidor usa canal criptografado (HTTPS).
- **RNF004:** o isolamento dos dados entre lojas é garantido no servidor, em todas as consultas e operações, e não
  apenas na interface.
- **RNF005:** credenciais e tokens de acesso ao Mercado Livre são armazenados de forma protegida, nunca exibidos ao
  usuário nem registrados em logs.
- **RNF006:** o tratamento de dados pessoais (usuários, revendedoras e compradores importados) segue a LGPD,
  coletando só o necessário. Revendedora: nome e telefone. Comprador do Mercado Livre: só o apelido.

## Integridade e confiabilidade

- **RNF007:** operações que alteram estoque e vendas são atômicas: a venda, seus itens, as movimentações e a baixa no
  estoque são gravados juntos, ou nenhum deles é gravado.
- **RNF008:** dados históricos (vendas, entradas, movimentações e custos aplicados) não são excluídos.
- **RNF009:** valores monetários e percentuais são guardados e calculados com precisão decimal, sem erro de
  arredondamento.
- **RNF010:** importar o mesmo pedido do Mercado Livre mais de uma vez não gera vendas duplicadas.
- **RNF011:** o banco de dados tem cópias de segurança periódicas, com possibilidade de restauração.
- **RNF012:** falha ou indisponibilidade do Mercado Livre não impede o uso do resto; o registro manual de vendas
  continua disponível.

## Desempenho

- **RNF013:** telas e consultas principais (listagens, estoque, relatórios por período) respondem em até 3 segundos
  em uso normal.
- **RNF014:** listagens com muitos registros usam paginação ou carregamento sob demanda.

## Usabilidade e portabilidade

- **RNF015:** a interface é adaptada a telas pequenas e permite registrar uma venda em poucos passos.
- **RNF016:** mensagens de erro são claras, em português, e dizem como corrigir o problema (ex.: "Estoque
  insuficiente: disponível 3 un.").
- **RNF017:** a interface usa português do Brasil, valores em reais (R$) e datas no formato dd/mm/aaaa.
- **RNF018:** o sistema funciona em celulares Android e iOS.

## Manutenibilidade

- **RNF019:** o código é organizado em módulos que correspondem aos módulos do sistema.
- **RNF020:** configurações sensíveis (chaves, segredos, endereços de serviços) ficam fora do código, em variáveis de
  ambiente.
