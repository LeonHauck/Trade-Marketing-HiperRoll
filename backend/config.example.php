<?php
/**
 * ARQUIVO DE CONFIGURAÇÃO — NÃO FAZER COMMIT!
 * 
 * Este arquivo (backend/config.php) deve ser criado localmente
 * e contém credenciais sensíveis que não devem ir para o GitHub.
 * 
 * Instruções:
 * 1. Crie um arquivo backend/config.php no seu servidor
 * 2. Copie o conteúdo abaixo
 * 3. Substitua os valores pelos seus dados reais
 */

// Token de autenticação da API (MUDE ANTES DE FAZER DEPLOY!)
define('API_TOKEN', 'seu_token_secreto_muito_longo_e_unico_aqui');

// Credenciais de login (se aplicável)
define('ADMIN_USERNAME', 'admin');
define('ADMIN_PASSWORD', 'sua_senha_super_segura_aqui');

// Configurações do servidor
define('API_URL', 'http://seu-dominio.com/backend/api.php');
define('ENVIRONMENT', 'production'); // development ou production
define('DEBUG', false); // Nunca ativar em produção!

?>
