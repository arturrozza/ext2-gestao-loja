# Acesso

Entrada no app, sessão, troca de senha e acesso de suporte.

## Regras funcionais

- **RF-ACE-01.** Sem sessão, o app mostra a tela de boas-vindas com o botão "Entrar". Nenhuma outra tela fica
  acessível.
- **RF-ACE-02.** O usuário entra com e-mail e senha.
- **RF-ACE-03.** O usuário pode sair do app pela tela da Loja, depois de confirmar.
- **RF-ACE-04.** O usuário pode trocar a própria senha pela tela da Loja, informando a senha atual e a nova.
- **RF-ACE-05.** Ao abrir o app sem internet com uma sessão salva, o app mostra um erro com a opção de tentar de novo,
  sem encerrar a sessão.
- **RF-ACE-06.** Quando a sessão deixa de valer (expirou, usuário desativado ou senha trocada em outro aparelho), a
  próxima ação no app leva de volta à tela de boas-vindas.

## Regras de negócio

- **RN-ACE-01.** Não existe cadastro aberto. A loja e o primeiro usuário são criados na implantação do sistema; os
  outros usuários são criados por quem já usa o app ([Usuários](usuarios.md)).
- **RN-ACE-02.** O e-mail é comparado sem diferenciar maiúsculas de minúsculas.
- **RN-ACE-03.** A senha tem de 8 a 128 caracteres.
- **RN-ACE-04.** Usuário desativado não entra.
- **RN-ACE-05.** A sessão expira após 30 dias sem uso. Cada uso renova o prazo.
- **RN-ACE-06.** Sair encerra a sessão do aparelho.
- **RN-ACE-07.** Trocar a senha mantém a sessão do aparelho atual e encerra as sessões do usuário nos outros
  aparelhos.
- **RN-ACE-08.** Depois de 5 senhas erradas em 15 minutos, o e-mail fica bloqueado para entrar até a janela de 15
  minutos acabar. A mesma regra vale para a senha atual na troca de senha.
- **RN-ACE-09.** A equipe de suporte tem uma senha mestra, configurada fora do app, que entra como qualquer usuário
  ativo e vale como senha atual na troca de senha. Cada uso fica registrado. Sem configuração, a senha mestra fica
  desligada.
- **RN-ACE-10.** Se o usuário esquecer a senha, a equipe de suporte entra com a senha mestra e define uma nova, ou
  outro usuário da loja desativa esse usuário e cria outro.
- **RN-ACE-11.** Todos os usuários têm as mesmas permissões.
