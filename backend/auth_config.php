<?php
// ============================================================
// Trade Marketing Hiperroll — Usuários do sistema (backend/config.php)
// Usado pelo setup.php (primeira configuração) e pelo api.php (login, troca de
// senha e cadastro de usuários). Aberto direto no navegador, não faz nem mostra nada.
// ============================================================

const MIN_PASSWORD_LENGTH = 10;
const USERNAME_PATTERN    = '/^[A-Za-z0-9._-]{3,40}$/';
const DEFAULT_USER_ROLE   = 'Trade Marketing';
// Hash bcrypt que não corresponde a nenhuma senha: usado só para o login de um usuário
// inexistente gastar o mesmo tempo de um existente (não revela quais logins existem).
const DUMMY_PASSWORD_HASH = '$2y$10$abcdefghijklmnopqrstuuKuI1bHcQ3xY9mZ0aB2cD4eF6gH8iJ0kL';

// "kenia.laina" -> "Kenia Laina" (usado quando o nome completo não foi informado)
function displayNameFromUsername(string $username): string {
    return ucwords(str_replace(['.', '_', '-'], ' ', strtolower($username)));
}

// Lê os usuários do config.php. Retorna [usuario => ['name', 'role', 'hash', 'admin']],
// com a chave sempre em minúsculas. Entende também o formato antigo, de um único
// usuário em constantes — que passa a ser o primeiro administrador.
function loadAuthUsers(string $configFile): array {
    $config = require $configFile;
    if (is_array($config) && isset($config['users']) && is_array($config['users'])) {
        return $config['users'];
    }
    if (defined('ADMIN_USERNAME') && defined('ADMIN_PASSWORD_HASH')) {
        return [strtolower(ADMIN_USERNAME) => [
            'name'  => displayNameFromUsername(ADMIN_USERNAME),
            'role'  => DEFAULT_USER_ROLE,
            'hash'  => ADMIN_PASSWORD_HASH,
            'admin' => true,
        ]];
    }
    return [];
}

// Grava todos os usuários. Com $mustNotExist, falha se o arquivo já existir
// (evita sobrescrever uma configuração feita em paralelo).
function writeAuthUsers(string $configFile, array $users, bool $mustNotExist = false): bool {
    $content = "<?php\n"
             . "// Gerado pelo sistema em " . date('d/m/Y H:i') . ". NÃO enviar para o Git.\n"
             . "return " . var_export(['users' => $users], true) . ";\n";

    if ($mustNotExist) {
        $handle = @fopen($configFile, 'x');
        if ($handle === false) return false;
        $written = fwrite($handle, $content);
        fclose($handle);
    } else {
        $written = @file_put_contents($configFile, $content, LOCK_EX);
    }
    if ($written === false) return false;

    @chmod($configFile, 0600);
    // Sem isto o PHP pode continuar usando por alguns segundos a versão antiga que guardou em cache.
    if (function_exists('opcache_invalidate')) @opcache_invalidate($configFile, true);
    return true;
}

function hashPassword(string $password): string {
    return password_hash($password, PASSWORD_DEFAULT);
}
