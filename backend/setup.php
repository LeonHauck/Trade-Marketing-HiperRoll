<?php
// ============================================================
// Trade Marketing Hiperroll — Configuração inicial do acesso
// Cria backend/config.php com o usuário e o hash da senha.
// Só funciona enquanto config.php NÃO existir; depois disso fica bloqueada.
// Para trocar a senha: apague backend/config.php no servidor e abra esta página de novo.
// ============================================================

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');

const MIN_PASSWORD_LENGTH = 10;

$configFile = __DIR__ . '/config.php';

function page(string $title, string $bodyHtml): void {
    echo '<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8">'
       . '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
       . '<title>' . htmlspecialchars($title) . '</title>'
       . '<style>body{font-family:Arial,Helvetica,sans-serif;background:#f4f6fb;color:#1f2937;display:flex;justify-content:center;padding:40px 16px}'
       . '.card{background:#fff;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.08);padding:32px;max-width:420px;width:100%;border-top:4px solid #e31e24}'
       . 'h1{font-size:1.3rem;margin:0 0 8px;color:#0d3b7f}p{font-size:.95rem;line-height:1.5;color:#4b5563}'
       . 'label{display:block;font-weight:bold;font-size:.9rem;margin:16px 0 6px}'
       . 'input{width:100%;box-sizing:border-box;padding:11px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:1rem}'
       . 'button{margin-top:22px;width:100%;padding:12px;border:0;border-radius:8px;background:#e31e24;color:#fff;font-weight:bold;font-size:1rem;cursor:pointer}'
       . '.error{background:#ffebee;color:#b71c1c;padding:10px 12px;border-radius:8px;font-size:.9rem;margin-top:14px}'
       . 'a{color:#0047ab;font-weight:bold}code{background:#eef2ff;padding:2px 5px;border-radius:4px}</style></head>'
       . '<body><div class="card"><h1>' . htmlspecialchars($title) . '</h1>' . $bodyHtml . '</div></body></html>';
    exit;
}

if (file_exists($configFile)) {
    http_response_code(403);
    page('Acesso já configurado', '<p>O usuário e a senha já foram definidos. Esta página está bloqueada.</p>'
        . '<p>Para trocar a senha, apague o arquivo <code>backend/config.php</code> pelo Gerenciador de Arquivos da hospedagem e abra esta página novamente.</p>'
        . '<p><a href="../">Ir para o sistema</a></p>');
}

$error    = '';
$username = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim((string) ($_POST['username'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');
    $confirm  = (string) ($_POST['confirm'] ?? '');

    if (!preg_match('/^[A-Za-z0-9._-]{3,40}$/', $username)) {
        $error = 'O usuário deve ter de 3 a 40 caracteres, usando apenas letras, números, ponto, hífen ou sublinhado.';
    } elseif (strlen($password) < MIN_PASSWORD_LENGTH) {
        $error = 'A senha deve ter pelo menos ' . MIN_PASSWORD_LENGTH . ' caracteres.';
    } elseif ($password !== $confirm) {
        $error = 'A senha e a confirmação não são iguais.';
    } else {
        $content = "<?php\n"
                 . "// Gerado por backend/setup.php em " . date('d/m/Y H:i') . ". NÃO enviar para o Git.\n"
                 . "define('ADMIN_USERNAME', " . var_export($username, true) . ");\n"
                 . "define('ADMIN_PASSWORD_HASH', " . var_export(password_hash($password, PASSWORD_DEFAULT), true) . ");\n";

        // Modo 'x': só cria se o arquivo ainda não existir (evita sobrescrever uma configuração feita em paralelo).
        $handle = @fopen($configFile, 'x');
        if ($handle === false) {
            $error = 'Não foi possível criar backend/config.php. Verifique se a pasta backend aceita escrita.';
        } else {
            fwrite($handle, $content);
            fclose($handle);
            @chmod($configFile, 0600);
            page('Acesso configurado', '<p>Usuário e senha gravados com sucesso. A partir de agora o sistema só abre com esse login.</p>'
                . '<p><a href="../">Ir para o sistema</a></p>');
        }
    }
}

page('Configurar acesso', '<p>Defina o usuário e a senha que serão usados para entrar no sistema.</p>'
    . ($error ? '<div class="error">' . htmlspecialchars($error) . '</div>' : '')
    . '<form method="post" autocomplete="off">'
    . '<label for="username">Usuário</label><input id="username" name="username" value="' . htmlspecialchars($username) . '" required>'
    . '<label for="password">Senha (mínimo ' . MIN_PASSWORD_LENGTH . ' caracteres)</label><input id="password" name="password" type="password" required>'
    . '<label for="confirm">Confirmar senha</label><input id="confirm" name="confirm" type="password" required>'
    . '<button type="submit">Salvar</button></form>');
