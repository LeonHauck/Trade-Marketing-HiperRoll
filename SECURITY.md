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

## Auditoria

- O servidor registra quem adicionou, editou ou excluiu visitas e pedidos, quem deu baixa manual em rupturas, quem criou ou excluiu planos de rota, quem importou CSV, quem apagou fotos antigas, quem mexeu em usuários e senhas, e cada entrada no sistema.
- Os registros ficam em `backend/data/audit_AAAA-MM.json`, um arquivo por mês. Senhas não são gravadas.
- A consulta é pela aba **Auditoria**, só para administradores. O painel não tem como editar nem apagar registros; isso só é possível mexendo nos arquivos pelo gerenciador da hospedagem.
- Cada visita e cada pedido também guarda quem adicionou e quem editou por último, mostrado ao administrador nas listas e nos modais. Esse carimbo é definido pelo servidor; o que o navegador enviar nesse campo é descartado.
- O registro começa na data em que esta versão foi publicada: o que foi feito antes não tem autoria.
- Faça backup da pasta `backend/data/` de tempos em tempos; os arquivos de auditoria vão junto.

## Fotos das visitas

- As fotos ficam em `uploads/`, que o `uploads/.htaccess` bloqueia para o navegador. Elas só abrem pelo painel, com login. Ao publicar, confira se esse arquivo foi enviado: sem ele, quem souber o endereço de uma foto consegue abri-la.
- Quem tem a aba **Fotos** vê, baixa e filtra todas as fotos. Só administradores apagam, e a limpeza fica na auditoria.
- Cada foto guarda quem enviou, a hora do servidor e a localização do celular no momento da foto. O sistema não acompanha a localização do promotor fora disso.
- A localização vem do próprio celular. Ela serve para conferência do dia a dia, não como prova: um aparelho adulterado consegue informar outra posição.
- Fotos tiradas sem sinal ficam guardadas no celular até serem enviadas. Peça ao promotor para abrir o sistema com internet ao fim do dia, até o aviso de fotos pendentes sumir.

## O que nunca deve ir para o Git

| Item | Onde fica | Protegido por |
|---|---|---|
| Usuários e hashes das senhas | `backend/config.php` | `.gitignore` |
| Visitas, pedidos, rupturas, rotas, sessões, auditoria, dados das fotos | `backend/data/` | `.gitignore` e `backend/.htaccess` |
| Fotos das visitas | `uploads/` | `.gitignore` e `uploads/.htaccess` |

Antes de cada commit, confira com `git status` se nenhum desses caminhos aparece.

## Senhas que já estiveram no histórico

Versões antigas deste repositório tinham uma senha e um token escritos no código, e eles continuam visíveis no histórico do Git. Ambos foram desativados: o token não é mais aceito pela API e a senha só vale se alguém a escolher de novo. **Não reutilize a senha antiga**, nem neste sistema nem em outros.

## Limites conhecidos

- O administrador define quais abas cada usuário vê. O servidor bloqueia de fato os Pedidos (quem não tem a aba não recebe nem altera pedidos), as Fotos (quem não tem a aba não lista nem baixa) e os planos de rota (o promotor recebe só os dele e não os altera). As demais abas ficam escondidas na tela, mas os dados de visitas, lojas e rupturas chegam ao navegador de qualquer usuário logado, porque o registro de visitas depende deles.
- Importações de CSV ficam só no navegador de quem as fez; a auditoria registra que aconteceram, mas depende de o painel conseguir avisar o servidor naquele momento.
- Com login compartilhado entre pessoas, a auditoria aponta o login, não a pessoa.
- `backend/test_write.php` é uma página de diagnóstico que não exige login. Envie-a ao servidor só quando precisar investigar um problema de gravação e apague em seguida.

## Boas práticas

- Use uma senha longa e exclusiva deste sistema, e não compartilhe o login entre pessoas.
- Mantenha o site em HTTPS, para que a senha e o cookie de sessão trafeguem cifrados.
- Use sempre “Sair do Sistema” em computadores compartilhados.
