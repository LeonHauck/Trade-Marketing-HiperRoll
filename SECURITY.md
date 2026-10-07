# Guia de Segurança — Trade Marketing HiperRoll

## Como o acesso funciona

- O login é conferido no servidor, pelo `backend/api.php`. Sem sessão válida, a API não lê nem grava nada.
- O usuário e o **hash** da senha ficam em `backend/config.php`. Esse arquivo existe só no servidor e está no `.gitignore`.
- Não há senha nem token no código-fonte. O repositório pode ser público sem expor o acesso.

## Definir ou trocar a senha

1. **Primeira vez:** abra `https://seu-dominio/backend/setup.php`, informe usuário e senha (mínimo de 10 caracteres) e salve. A página cria o `backend/config.php` e se bloqueia.
2. **Trocar a senha:** clique em **Trocar Senha** na barra lateral do painel, informe a senha atual e a nova. Quem trocou continua logado; os outros aparelhos precisam entrar novamente.
3. **Senha esquecida:** apague `backend/config.php` pelo gerenciador de arquivos da hospedagem e abra o `setup.php` de novo. Faça isso de uma vez, sem intervalo: enquanto o arquivo não existe, o sistema fica fechado para todos e a página de configuração fica aberta.

## O que nunca deve ir para o Git

| Item | Onde fica | Protegido por |
|---|---|---|
| Usuário e hash da senha | `backend/config.php` | `.gitignore` |
| Visitas, pedidos, rupturas, sessões | `backend/data/` | `.gitignore` e `backend/.htaccess` |
| Fotos das visitas | `uploads/` | `.gitignore` |

Antes de cada commit, confira com `git status` se nenhum desses caminhos aparece.

## Senhas que já estiveram no histórico

Versões antigas deste repositório tinham uma senha e um token escritos no código, e eles continuam visíveis no histórico do Git. Ambos foram desativados: o token não é mais aceito pela API e a senha só vale se alguém a escolher de novo no `setup.php`. **Não reutilize a senha antiga**, nem neste sistema nem em outros.

## Limites conhecidos

- Há um único usuário; todos que usam o sistema compartilham o mesmo login.
- As fotos em `uploads/` são acessíveis por endereço direto, sem login. Não fotografe nada sensível.
- `backend/test_write.php` é uma página de diagnóstico que não exige login. Pode ser apagada do servidor depois que a publicação estiver funcionando.

## Boas práticas

- Use uma senha longa e exclusiva deste sistema.
- Mantenha o site em HTTPS, para que a senha e o cookie de sessão trafeguem cifrados.
- Use sempre “Sair do Sistema” em computadores compartilhados.
