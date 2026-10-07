<?php
/**
 * MODELO de backend/config.php — o arquivo real NÃO vai para o Git (está no .gitignore).
 *
 * Forma recomendada: não copie este arquivo. Abra backend/setup.php no navegador,
 * informe o usuário e a senha, e o config.php é criado automaticamente no servidor.
 *
 * Forma manual (só se preferir): copie este arquivo para backend/config.php e
 * preencha os dois valores. O hash da senha é gerado com o PHP:
 *     php -r "echo password_hash('SUA_SENHA', PASSWORD_DEFAULT);"
 */

define('ADMIN_USERNAME', 'seu.usuario');
define('ADMIN_PASSWORD_HASH', 'cole_aqui_o_hash_gerado_pelo_password_hash');
