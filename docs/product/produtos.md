# Produtos

Cadastro dos produtos e das categorias da loja. A lista e a tela do produto também mostram o [Estoque](estoque.md).

## Regras funcionais

### Lista

- **RF-PRO-01.** O usuário pode ver a lista de produtos em ordem alfabética, com foto, nome, quantidade em estoque,
  preço base e localização.
- **RF-PRO-02.** O usuário pode buscar produtos por nome, código interno ou código de barras.
- **RF-PRO-03.** O usuário pode ler um código de barras pela câmera para buscar na lista.
- **RF-PRO-04.** O usuário pode filtrar a lista por uma ou mais categorias.
- **RF-PRO-05.** O usuário pode filtrar a lista por situação de estoque: estoque baixo, sem estoque, perto de vencer e
  vencido ([Estoque](estoque.md)).
- **RF-PRO-06.** O usuário pode alternar entre produtos ativos e arquivados.
- **RF-PRO-07.** Quando a busca por código de barras não encontra nenhum produto, o app oferece cadastrar um produto
  com aquele código já preenchido.

### Cadastro

- **RF-PRO-08.** O usuário pode cadastrar e editar um produto com nome, preço base, foto, categoria, código de barras,
  código interno, estoque mínimo, localização e a indicação "tem validade".
- **RF-PRO-09.** O usuário pode ler o código de barras pela câmera no cadastro do produto.
- **RF-PRO-10.** O usuário pode tirar uma foto ou escolher uma da galeria. A foto é recortada em quadrado.
- **RF-PRO-11.** O usuário pode trocar ou remover a foto.
- **RF-PRO-12.** Ao salvar um produto novo, o app oferece "Cadastrar primeira entrada", que abre uma nova compra com o
  produto já incluído. O usuário pode pular.
- **RF-PRO-13.** Sem foto, o app mostra um ícone na tela do produto e as iniciais do nome nas listas.

### Tela do produto

- **RF-PRO-14.** O usuário pode ver a foto do produto em tela cheia, com zoom.
- **RF-PRO-15.** O usuário pode arquivar e reativar o produto, depois de confirmar.

### Categorias

- **RF-PRO-16.** O usuário pode criar, renomear, arquivar e reativar categorias.
- **RF-PRO-17.** O usuário pode criar uma categoria a partir do cadastro do produto, que já fica selecionada.

### Código de barras em vendas e compras

- **RF-PRO-18.** Na nova venda e na nova compra, ler um código de barras adiciona o produto que tem esse código e deixa
  a leitura pronta para o próximo.

## Regras de negócio

- **RN-PRO-01.** Obrigatórios: nome (até 120 caracteres) e preço base.
- **RN-PRO-02.** O preço base é maior que zero. É o preço de venda sugerido em cada venda.
- **RN-PRO-03.** O código de barras é único na loja, contando os produtos arquivados.
- **RN-PRO-04.** O código interno é único na loja, contando os produtos arquivados, sem diferenciar maiúsculas de
  minúsculas ("mm-01" e "MM-01" são o mesmo código).
- **RN-PRO-05.** O nome do produto pode se repetir.
- **RN-PRO-06.** O estoque mínimo, quando informado, é um número inteiro de 0 a 1.000.000. Sem estoque mínimo, o
  produto não gera alerta de quantidade ([Alertas](alertas.md)).
- **RN-PRO-07.** "Tem validade" define se as compras do produto exigem validade ([Compras](compras.md)).
- **RN-PRO-08.** O produto nasce com estoque zero e custo zero. Quantidade e custo não são digitados no cadastro nem
  na edição: mudam por compra, venda, ajuste ou correção de custo.
- **RN-PRO-09.** Quantidades são sempre inteiras. Um kit é cadastrado como um produto próprio.
- **RN-PRO-10.** Cada produto tem no máximo uma categoria, e só uma categoria ativa pode ser escolhida.
- **RN-PRO-11.** Produto não é excluído, é arquivado. Produto arquivado não entra em novas compras nem em novas vendas,
  continua no histórico e nos relatórios, e pode ser ajustado no estoque.
- **RN-PRO-12.** Produto arquivado não é editado. Para alterar, o usuário reativa o produto antes.
- **RN-PRO-13.** O produto tem uma foto. O app reduz a foto antes de enviar. Trocar ou remover a foto não apaga a
  anterior, que continua guardada.
- **RN-PRO-14.** A categoria tem só o nome, com até 60 caracteres.
- **RN-PRO-15.** O nome da categoria é único na loja, contando as arquivadas, sem diferenciar maiúsculas, minúsculas e
  acentos.
- **RN-PRO-16.** Categoria não é excluída, é arquivada. Categoria arquivada não aparece para escolha no cadastro nem
  no filtro. Os produtos que já estão nela continuam com ela, inclusive nos relatórios.

## Fora do escopo

Embalagem, marca, fornecedor, referência de fábrica, NCM/CEST e peso.
