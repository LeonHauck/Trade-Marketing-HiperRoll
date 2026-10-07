<?php
// ============================================================
// Trade Marketing Hiperroll — Gravação do backend/config.php
// Usado pelo setup.php (primeira configuração) e pelo api.php (troca de senha).
// Aberto direto no navegador, este arquivo não faz nem mostra nada.
// ============================================================

const MIN_PASSWORD_LENGTH = 10;

// Grava o usuário e o hash da senha. Com $mustNotExist, falha se o arquivo já existir
// (evita sobrescrever uma configuração feita em paralelo). Retorna o hash gravado ou null.
function writeAuthConfig(string $configFile, string $username, string $password, bool $mustNotExist): ?string {
    $hash    = password_hash($password, PASSWORD_DEFAULT);
    $content = "<?php\n"
             . "// Gerado pelo sistema em " . date('d/m/Y H:i') . ". NÃO enviar para o Git.\n"
             . "define('ADMIN_USERNAME', " . var_export($username, true) . ");\n"
             . "define('ADMIN_PASSWORD_HASH', " . var_export($hash, true) . ");\n";

    if ($mustNotExist) {
        $handle = @fopen($configFile, 'x');
        if ($handle === false) return null;
        $written = fwrite($handle, $content);
        fclose($handle);
    } else {
        $written = @file_put_contents($configFile, $content, LOCK_EX);
    }
    if ($written === false) return null;

    @chmod($configFile, 0600);
    // Sem isto o PHP pode continuar usando por alguns segundos a versão antiga que guardou em cache.
    if (function_exists('opcache_invalidate')) @opcache_invalidate($configFile, true);
    return $hash;
}
