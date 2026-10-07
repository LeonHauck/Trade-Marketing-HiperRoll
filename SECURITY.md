# Guia de Segurança — Trade Marketing HiperRoll

## Como o acesso funciona

- Cada pessoa entra com o próprio usuário e senha, conferidos no servidor pelo `backend/api.php`. Sem sessão válida, a API não lê nem grava nada.
- Os usuários e os **hashes** das senhas ficam em `backend/config.php`. Esse arquivo existe só no servidor e está no `.gitignore`.
- Não há senha nem token no código-fonte. O repositório pode ser público sem expor o acesso.
- Só administradores cadastram, alteram e excluem usuários. O servidor confere essa permissão a cada chamada.

## Usuários e senhas

1. **Primeira vez:** abra `https://seu-dominio/backend/setup.php` e crie o primeiro usuário (mínimo de 10 caracteres na senha). Ele será o administrador. A página cria o `backend/config.php` e se bloqueia.
2. **Novos usuários:** o administrador clica em **Usuários** na barra lateral e informa login, nome, cargo e uma senha inicial. Peça para a pessoa trocar essa senha no primeiro acesso.
3. **Trocar a própria senha:** botão **Trocar Senha** na barra lateral. Quem trocou continua logado; os outros aparelhos dessa pessoa precisam entrar novamente.
4. **Senha esquecida:** um administrador define outra na janela **Usuários**.
5. **Saída de alguém da equipe:** exclua o usuário na janela **Usuários**. O acesso é cortado na hora, inclusive em aparelhos já logados.
6. **O único administrador esqueceu a senha:** apague `backend/config.php` pelo gerenciador de arquivos da hospedagem e abra o `setup.php` de novo. Os outros usuários precisam ser recriados. Faça isso de uma vez, sem intervalo: enquanto o arquivo não existe, o sistema fica fechado para todos e a página de configuração fica aberta.

Vale manter pelo menos dois administradores, para o item 6 nunca ser necessário.

## O que nunca deve ir para o Git

| Item | Onde fica | Protegido por |
|---|---|---|
| Usuários e hashes das senhas | `backend/config.php` | `.gitignore` |
| Visitas, pedidos, rupturas, sessões | `backend/data/` | `.gitignore` e `backend/.htaccess` |
| Fotos das visitas | `uploads/` | `.gitignore` |

Antes de cada commit, confira com `git status` se nenhum desses caminhos aparece.

## Senhas que já estiveram no histórico

Versões antigas deste repositório tinham uma senha e um token escritos no código, e eles continuam visíveis no histórico do Git. Ambos foram desativados: o token não é mais aceito pela API e a senha só vale se alguém a escolher de novo. **Não reutilize a senha antiga**, nem neste sistema nem em outros.

## Limites conhecidos

- Todos os usuários enxergam e alteram os mesmos dados; não há permissões por tela. A única distinção é quem pode gerenciar usuários.
- O sistema não registra qual usuário lançou cada visita ou pedido.
- As fotos em `uploads/` são acessíveis por endereço direto, sem login. Não fotografe nada sensível.
- `backend/test_write.php` é uma página de diagnóstico que não exige login. Envie-a ao servidor só quando precisar investigar um problema de gravação e apague em seguida.

## Boas práticas

- Use uma senha longa e exclusiva deste sistema, e não compartilhe o login entre pessoas.
- Mantenha o site em HTTPS, para que a senha e o cookie de sessão trafeguem cifrados.
- Use sempre “Sair do Sistema” em computadores compartilhados.
