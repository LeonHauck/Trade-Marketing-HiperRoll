<?php
// ============================================================
// Trade Marketing Hiperroll — Backend API
// Hospedagem: HostGator (PHP 7.4+, sem banco de dados)
// ============================================================

// --- Headers ---
// Sem cabeçalhos de CORS: a API só atende o próprio site (mesma origem).
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// --- Segurança: usuário e senha ---
// Ficam em backend/config.php, criado por backend/setup.php direto no servidor.
// Esse arquivo NÃO vai para o Git (está no .gitignore).
$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    http_response_code(503);
    echo json_encode(['ok' => false, 'error' => 'Sistema ainda não configurado. Acesse backend/setup.php para criar o usuário e a senha.']);
    exit;
}
require $configFile;
require __DIR__ . '/auth_config.php';

const SESSION_LIFETIME   = 60 * 60 * 24 * 30; // 30 dias sem uso até pedir login de novo
const LOGIN_MAX_FAILURES = 8;                 // tentativas erradas por IP...
const LOGIN_WINDOW       = 15 * 60;           // ...dentro desta janela (segundos)

// --- Pastas de dados ---
$dataDir    = __DIR__ . '/data/';
$uploadDir  = dirname(__DIR__) . '/uploads/';
$sessionDir = $dataDir . 'sessions/';

foreach ([$dataDir, $uploadDir, $sessionDir] as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// --- Sessão ---
// As sessões ficam em backend/data/sessions (e não na pasta padrão do servidor) para
// que a limpeza automática de outros sites da hospedagem compartilhada não derrube o login.
ini_set('session.gc_maxlifetime', (string) SESSION_LIFETIME);
ini_set('session.gc_probability', '1');
ini_set('session.gc_divisor', '100');
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
session_save_path($sessionDir);
session_name('hr_session');

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

function sessionCookieOptions(int $expires): array {
    global $isHttps;
    return ['expires' => $expires, 'path' => '/', 'secure' => $isHttps, 'httponly' => true, 'samesite' => 'Lax'];
}

// Muda quando a senha é trocada — sessões abertas com a senha antiga deixam de valer.
function passwordFingerprint(string $hash = ADMIN_PASSWORD_HASH): string {
    return substr(hash('sha256', $hash), 0, 16);
}

function isLoggedIn(): bool {
    return isset($_SESSION['user'], $_SESSION['pw']) && hash_equals(passwordFingerprint(), $_SESSION['pw']);
}

$action = $_GET['action'] ?? '';

// Só abre sessão para quem já tem o cookie ou está entrando agora — assim acessos
// anônimos (robôs, tela de login) não criam arquivos de sessão no servidor.
if (isset($_COOKIE[session_name()]) || $action === 'login') {
    session_set_cookie_params([
        'lifetime' => SESSION_LIFETIME, 'path' => '/', 'secure' => $isHttps, 'httponly' => true, 'samesite' => 'Lax'
    ]);
    session_start();
}

// --- Helpers de leitura/escrita ---
function readData(string $file, $default = []) {
    global $dataDir;
    $path = $dataDir . $file;
    if (file_exists($path)) {
        $json = file_get_contents($path);
        $decoded = json_decode($json, true);
        return ($decoded !== null) ? $decoded : $default;
    }
    return $default;
}

function writeData(string $file, $data): bool {
    global $dataDir;
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    return file_put_contents($dataDir . $file, $json) !== false;
}

// --- Limite de senhas erradas por IP (login e troca de senha) ---
function recentPasswordFailures(): array {
    $now = time();
    return array_filter(readData('login_attempts.json', []), function ($a) use ($now) {
        return is_array($a) && ($a['first'] ?? 0) > $now - LOGIN_WINDOW;
    });
}

function clientIp(): string {
    return $_SERVER['REMOTE_ADDR'] ?? 'desconhecido';
}

function rejectIfTooManyFailures(): void {
    if ((recentPasswordFailures()[clientIp()]['count'] ?? 0) >= LOGIN_MAX_FAILURES) {
        http_response_code(429);
        echo json_encode(['ok' => false, 'error' => 'Muitas tentativas. Aguarde 15 minutos e tente novamente.']);
        exit;
    }
}

function registerPasswordFailure(): void {
    $attempts = recentPasswordFailures();
    $ip = clientIp();
    $attempts[$ip] = ['count' => ($attempts[$ip]['count'] ?? 0) + 1, 'first' => $attempts[$ip]['first'] ?? time()];
    writeData('login_attempts.json', $attempts);
    usleep(500000);
}

function clearPasswordFailures(): void {
    $attempts = recentPasswordFailures();
    unset($attempts[clientIp()]);
    writeData('login_attempts.json', $attempts);
}

// --- Roteador ---
$method = $_SERVER['REQUEST_METHOD'];
$body   = [];
if ($method === 'POST') {
    $rawBody = file_get_contents('php://input');
    $body = json_decode($rawBody, true) ?? [];
}

// --- Autenticação ---
switch ($action) {

    // ── Informa se a sessão do navegador ainda é válida ──────
    case 'session':
        echo json_encode(['ok' => true, 'logged_in' => isLoggedIn()]);
        exit;

    // ── Login ────────────────────────────────────────────────
    case 'login':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok' => false]); exit; }

        rejectIfTooManyFailures();

        $username = trim((string) ($body['username'] ?? ''));
        $password = (string) ($body['password'] ?? '');
        $userOk   = hash_equals(strtolower(ADMIN_USERNAME), strtolower($username));
        $passOk   = password_verify($password, ADMIN_PASSWORD_HASH);

        if (!$userOk || !$passOk) {
            registerPasswordFailure();
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Usuário ou senha incorretos.']);
            exit;
        }

        clearPasswordFailures();

        session_regenerate_id(true);
        $_SESSION['user'] = ADMIN_USERNAME;
        $_SESSION['pw']   = passwordFingerprint();
        echo json_encode(['ok' => true]);
        exit;

    // ── Logout ───────────────────────────────────────────────
    case 'logout':
        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION = [];
            session_destroy();
        }
        setcookie(session_name(), '', sessionCookieOptions(time() - 3600));
        echo json_encode(['ok' => true]);
        exit;
}

// Daqui para baixo, só com login feito.
if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Sessão expirada. Entre novamente.']);
    exit;
}

// ── Troca de senha (pelo botão "Trocar Senha" do painel) ─────
// Fica antes do session_write_close() porque precisa atualizar a sessão atual:
// as demais sessões abertas com a senha antiga deixam de valer.
if ($action === 'change_password') {
    if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok' => false]); exit; }

    rejectIfTooManyFailures();

    $current = (string) ($body['current_password'] ?? '');
    $new     = (string) ($body['new_password'] ?? '');

    // 400 (e não 401) nos erros: para o painel, 401 significa "sessão expirada".
    if (!password_verify($current, ADMIN_PASSWORD_HASH)) {
        registerPasswordFailure();
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'A senha atual está incorreta.']);
        exit;
    }
    if (strlen($new) < MIN_PASSWORD_LENGTH) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'A nova senha deve ter pelo menos ' . MIN_PASSWORD_LENGTH . ' caracteres.']);
        exit;
    }
    if ($new === $current) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'A nova senha deve ser diferente da atual.']);
        exit;
    }

    $newHash = writeAuthConfig($configFile, ADMIN_USERNAME, $new, false);
    if ($newHash === null) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Não foi possível gravar a nova senha no servidor.']);
        exit;
    }

    clearPasswordFailures();
    session_regenerate_id(true);
    $_SESSION['pw'] = passwordFingerprint($newHash);
    echo json_encode(['ok' => true]);
    exit;
}

// Renova o prazo do cookie a cada uso e libera o arquivo de sessão, para que as
// chamadas paralelas do painel não fiquem esperando uma pela outra.
setcookie(session_name(), session_id(), sessionCookieOptions(time() + SESSION_LIFETIME));
session_write_close();

switch ($action) {

    // ── Carrega todo o estado do app de uma vez ──────────────
    case 'load':
        echo json_encode([
            'ok'                 => true,
            'visits'             => readData('visits.json', []),
            'store_updates'      => readData('store_updates.json', new stdClass()),
            'validated_ruptures' => readData('ruptures.json', []),
            'dismissed'          => readData('dismissed.json', []),
            'resolved_history'   => readData('resolved_history.json', []),
            'photo_map'          => readData('photo_map.json', new stdClass()),
            'pedidos'            => readData('pedidos.json', []),
        ]);
        break;

    // ── Salva visitas ─────────────────────────────────────────
    case 'save_visits':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false]); break; }
        
        $incomingVisits = $body['visits'] ?? [];
        if (!is_array($incomingVisits)) $incomingVisits = [];
        
        // Estratégia de MERGE para evitar perda de dados
        $currentVisits = readData('visits.json', []);
        
        // Mapeia as visitas atuais pelo ID para busca rápida
        $visitsMap = [];
        foreach ($currentVisits as $v) {
            if (isset($v['id'])) {
                $visitsMap[$v['id']] = $v;
            }
        }
        
        // Atualiza ou insere as visitas recebidas
        foreach ($incomingVisits as $v) {
            if (isset($v['id'])) {
                $visitsMap[$v['id']] = $v;
            }
        }
        
        // Transforma de volta num array reindexado
        $mergedVisits = array_values($visitsMap);
        
        $ok = writeData('visits.json', $mergedVisits);
        echo json_encode(['ok' => $ok]);
        break;

    // ── Exclui visitas especificamente ────────────────────────
    case 'delete_visits':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false]); break; }
        
        $idsToDelete = $body['visit_ids'] ?? [];
        if (!is_array($idsToDelete) || empty($idsToDelete)) {
            echo json_encode(['ok' => true]);
            break;
        }
        
        $currentVisits = readData('visits.json', []);
        
        // Filtra mantendo apenas visitas que NÃO estão na lista de exclusão
        $filteredVisits = array_filter($currentVisits, function($v) use ($idsToDelete) {
            return isset($v['id']) && !in_array($v['id'], $idsToDelete);
        });
        
        $mergedVisits = array_values($filteredVisits);
        $ok = writeData('visits.json', $mergedVisits);
        echo json_encode(['ok' => $ok]);
        break;

    // ── Salva pedidos ──────────────────────────────────────────
    case 'save_pedidos':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false]); break; }

        $incomingPedidos = $body['pedidos'] ?? [];
        if (!is_array($incomingPedidos)) $incomingPedidos = [];

        // Estratégia de MERGE (mesmo padrão de save_visits) para evitar perda de dados
        $currentPedidos = readData('pedidos.json', []);

        $pedidosMap = [];
        foreach ($currentPedidos as $p) {
            if (isset($p['id'])) {
                $pedidosMap[$p['id']] = $p;
            }
        }
        foreach ($incomingPedidos as $p) {
            if (isset($p['id'])) {
                $pedidosMap[$p['id']] = $p;
            }
        }

        $mergedPedidos = array_values($pedidosMap);
        $ok = writeData('pedidos.json', $mergedPedidos);
        echo json_encode(['ok' => $ok]);
        break;

    // ── Exclui pedidos especificamente ────────────────────────
    case 'delete_pedidos':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false]); break; }

        $idsToDelete = $body['pedido_ids'] ?? [];
        if (!is_array($idsToDelete) || empty($idsToDelete)) {
            echo json_encode(['ok' => true]);
            break;
        }

        $currentPedidos = readData('pedidos.json', []);
        $filteredPedidos = array_filter($currentPedidos, function($p) use ($idsToDelete) {
            return isset($p['id']) && !in_array($p['id'], $idsToDelete);
        });

        $ok = writeData('pedidos.json', array_values($filteredPedidos));
        echo json_encode(['ok' => $ok]);
        break;

    // ── Salva atualizações leves de lojas ─────────────────────
    case 'save_store_updates':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false]); break; }
        $ok = writeData('store_updates.json', $body['updates'] ?? new stdClass());
        echo json_encode(['ok' => $ok]);
        break;

    // ── Salva rupturas validadas ──────────────────────────────
    case 'save_ruptures':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false]); break; }
        $ok = writeData('ruptures.json', $body['ruptures'] ?? []);
        echo json_encode(['ok' => $ok]);
        break;

    // ── Salva notificações dispensadas ────────────────────────
    case 'save_dismissed':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false]); break; }
        $ok = writeData('dismissed.json', $body['dismissed'] ?? []);
        echo json_encode(['ok' => $ok]);
        break;

    // ── Salva histórico de rupturas resolvidas ───────────────
    case 'save_resolved_history':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false]); break; }
        $ok = writeData('resolved_history.json', $body['resolved_history'] ?? []);
        echo json_encode(['ok' => $ok]);
        break;

    // ── Upload de foto ────────────────────────────────────────
    case 'upload_photo':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false]); break; }

        if (!isset($_FILES['photo'])) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Nenhum arquivo enviado']);
            break;
        }

        $visitId  = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST['visit_id'] ?? 'unknown');
        $file     = $_FILES['photo'];
        $allowed  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        $mime     = mime_content_type($file['tmp_name']);

        if (!in_array($mime, $allowed)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Tipo de arquivo não permitido']);
            break;
        }

        $ext      = ($mime === 'image/jpeg') ? 'jpg' : explode('/', $mime)[1];
        $filename = 'photo_' . $visitId . '_' . time() . '_' . rand(1000, 9999) . '.' . $ext;
        $dest     = $uploadDir . $filename;

        if (move_uploaded_file($file['tmp_name'], $dest)) {
            // Registra no mapa de fotos por visita
            $photoMap = readData('photo_map.json', []);
            if (!isset($photoMap[$visitId])) $photoMap[$visitId] = [];
            $photoMap[$visitId][] = 'uploads/' . $filename;
            writeData('photo_map.json', $photoMap);

            echo json_encode(['ok' => true, 'url' => 'uploads/' . $filename]);
        } else {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Falha ao mover arquivo']);
        }
        break;

    // ── Deleta fotos de uma visita ────────────────────────────
    case 'delete_photos':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false]); break; }
        $visitId  = (string)($body['visit_id'] ?? '');
        $photoMap = readData('photo_map.json', []);

        if (isset($photoMap[$visitId])) {
            foreach ($photoMap[$visitId] as $relPath) {
                $abs = dirname(__DIR__) . '/' . $relPath;
                if (file_exists($abs)) unlink($abs);
            }
            unset($photoMap[$visitId]);
            writeData('photo_map.json', $photoMap);
        }
        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Ação desconhecida: ' . htmlspecialchars($action)]);
        break;
}
