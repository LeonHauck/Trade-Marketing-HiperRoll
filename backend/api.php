<?php
// ============================================================
// Trade Marketing Hiperroll — Backend API
// Hospedagem: HostGator (PHP 7.4+, sem banco de dados)
// ============================================================

// --- Headers ---
// Sem cabeçalhos de CORS: a API só atende o próprio site (mesma origem).
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// --- Segurança: usuários e senhas ---
// Ficam em backend/config.php, criado por backend/setup.php direto no servidor.
// Esse arquivo NÃO vai para o Git (está no .gitignore).
$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    http_response_code(503);
    echo json_encode(['ok' => false, 'error' => 'Sistema ainda não configurado. Acesse backend/setup.php para criar o usuário e a senha.']);
    exit;
}
require __DIR__ . '/auth_config.php';
$users = loadAuthUsers($configFile);

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
function passwordFingerprint(string $hash): string {
    return substr(hash('sha256', $hash), 0, 16);
}

// Usuário da sessão atual (chave em $users) ou null. Deixa de valer se o usuário
// foi removido ou teve a senha trocada.
function currentUsername(): ?string {
    global $users;
    // strtolower: sessões abertas antes do cadastro de vários usuários guardavam o login como foi digitado
    $username = is_string($_SESSION['user'] ?? null) ? strtolower($_SESSION['user']) : null;
    if ($username === null || !isset($users[$username], $_SESSION['pw'])) return null;
    return hash_equals(passwordFingerprint($users[$username]['hash']), $_SESSION['pw']) ? $username : null;
}

// Dados do usuário que podem ir para o navegador (nunca o hash da senha).
function publicUser(string $username): array {
    global $users;
    $u = $users[$username];
    return [
        'username' => $username,
        'name'     => $u['name'] ?? displayNameFromUsername($username),
        'role'     => $u['role'] ?? '',
        'admin'    => !empty($u['admin']),
    ];
}

function respondError(int $status, string $message): void {
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $message]);
    exit;
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
// Arquivos que formam o estado compartilhado entre os usuários. Qualquer gravação
// neles avança a "versão" dos dados, que os painéis consultam para saber se precisam
// buscar novidades.
const STATE_FILES = ['visits.json', 'store_updates.json', 'ruptures.json', 'dismissed.json',
                     'resolved_history.json', 'photo_map.json', 'pedidos.json'];

// Números com casas decimais (ids de ruptura) saem do json_encode sempre na forma mais
// curta que volta ao mesmo valor, independente da configuração da hospedagem.
ini_set('serialize_precision', '-1');

// Com $strict, um arquivo ilegível interrompe a requisição em vez de ser tratado como
// vazio — senão a próxima gravação apagaria todo o conteúdo que estava lá.
function readData(string $file, $default = [], bool $strict = true) {
    global $dataDir;
    $path = $dataDir . $file;
    if (!file_exists($path)) return $default;
    $json = file_get_contents($path);
    if ($json === false || trim($json) === '') return $default;
    $decoded = json_decode($json, true);
    if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
        if (!$strict) return $default;
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Arquivo de dados ilegível no servidor (' . $file . '). Nada foi alterado.']);
        exit;
    }
    return ($decoded !== null) ? $decoded : $default;
}

// Grava em um arquivo temporário e troca de uma vez, para ninguém ler o arquivo pela metade.
function writeData(string $file, $data): bool {
    global $dataDir;
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) return false;
    $path = $dataDir . $file;
    $tmp  = $dataDir . 'tmp_' . $file;
    $ok   = file_put_contents($tmp, $json) !== false && @rename($tmp, $path);
    if (!$ok) {
        @unlink($tmp);
        $ok = file_put_contents($path, $json) !== false;
    }
    if ($ok && in_array($file, STATE_FILES, true)) bumpStateVersion();
    return $ok;
}

function stateVersion(): int {
    $v = readData('version.json', [], false);
    return (int) ($v['v'] ?? 0);
}

// Avança a versão uma única vez por requisição, por mais arquivos que ela grave.
function bumpStateVersion(): void {
    global $dataDir;
    static $bumped = false;
    if ($bumped) return;
    $bumped = true;
    file_put_contents($dataDir . 'version.json', json_encode(['v' => stateVersion() + 1]));
}

// Estado completo, como o painel recebe ao abrir e depois de cada sincronização.
function fullState(): array {
    $asObject = function ($value) { return (is_array($value) && count($value) === 0) ? new stdClass() : $value; };
    return [
        'ok'                 => true,
        'version'            => stateVersion(),
        'visits'             => readData('visits.json', []),
        'store_updates'      => $asObject(readData('store_updates.json', [])),
        'validated_ruptures' => readData('ruptures.json', []),
        'dismissed'          => readData('dismissed.json', []),
        'resolved_history'   => readData('resolved_history.json', []),
        'photo_map'          => $asObject(readData('photo_map.json', [])),
        'pedidos'            => readData('pedidos.json', []),
    ];
}

// --- Sincronização por diferenças (ação "sync") ---
// Cada painel envia só o que ele mesmo criou, alterou ou excluiu; o servidor aplica
// isso por cima do que já tem. Assim o que outro usuário gravou nunca é apagado por
// uma tela que ainda não sabia daquela alteração.

// Parte de uma chave: número inteiro e texto com o mesmo valor contam como iguais.
function keyPart($value): string {
    if (is_float($value)) return json_encode($value);
    if (is_bool($value)) return $value ? '1' : '0';
    return is_scalar($value) ? (string) $value : '';
}

// Chave que identifica um item em cada lista (as mesmas regras de storage.js).
function itemKey(string $collection, $item): ?string {
    if (!is_array($item)) return null;
    switch ($collection) {
        case 'visits':
        case 'pedidos':
            return isset($item['id']) ? keyPart($item['id']) : null;
        case 'validated_ruptures':
            return isset($item['productId'], $item['storeId'])
                ? keyPart($item['productId']) . ':' . keyPart($item['storeId']) : null;
        case 'resolved_history':
            if (!isset($item['productId'], $item['storeId'])) return null;
            $origin = !empty($item['visitId']) ? $item['visitId'] : ($item['id'] ?? '');
            return keyPart($origin) . ':' . keyPart($item['productId']) . ':' . keyPart($item['storeId']);
    }
    return null;
}

// Aplica { upsert: [itens], remove: [itens] } em uma lista. Retorna a lista nova,
// ou null se nada mudou. Itens novos vão para o fim (ou para o início, com $prepend).
function applyListChanges(string $collection, array $current, $changes, bool $prepend = false): ?array {
    $upserts = (is_array($changes) && isset($changes['upsert']) && is_array($changes['upsert'])) ? $changes['upsert'] : [];
    $removes = (is_array($changes) && isset($changes['remove']) && is_array($changes['remove'])) ? $changes['remove'] : [];
    if (count($upserts) === 0 && count($removes) === 0) return null;

    $map = [];
    foreach ($current as $item) {
        $key = itemKey($collection, $item);
        if ($key !== null) $map['k' . $key] = $item;
    }
    foreach ($removes as $item) {
        $key = itemKey($collection, $item);
        if ($key !== null) unset($map['k' . $key]);
    }
    $added = [];
    foreach ($upserts as $item) {
        $key = itemKey($collection, $item);
        if ($key === null) continue;
        if (isset($map['k' . $key]) || !$prepend) $map['k' . $key] = $item;
        else $added['k' . $key] = $item;
    }
    return array_values($prepend ? $added + $map : $map);
}

// --- Limite de senhas erradas por IP (login e troca de senha) ---
function recentPasswordFailures(): array {
    $now = time();
    return array_filter(readData('login_attempts.json', [], false), function ($a) use ($now) {
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

    // ── Informa se a sessão do navegador ainda é válida e de quem ela é ──
    case 'session':
        $me = currentUsername();
        echo json_encode(['ok' => true, 'logged_in' => $me !== null, 'user' => $me !== null ? publicUser($me) : null]);
        exit;

    // ── Login ────────────────────────────────────────────────
    case 'login':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok' => false]); exit; }

        rejectIfTooManyFailures();

        $username = strtolower(trim((string) ($body['username'] ?? '')));
        $password = (string) ($body['password'] ?? '');
        // Mesmo para um usuário inexistente a senha é conferida contra um hash qualquer,
        // para a resposta levar o mesmo tempo e não revelar quais usuários existem.
        $hash   = $users[$username]['hash'] ?? DUMMY_PASSWORD_HASH;
        $passOk = password_verify($password, $hash);

        if (!isset($users[$username]) || !$passOk) {
            registerPasswordFailure();
            respondError(401, 'Usuário ou senha incorretos.');
        }

        clearPasswordFailures();

        session_regenerate_id(true);
        $_SESSION['user'] = $username;
        $_SESSION['pw']   = passwordFingerprint($users[$username]['hash']);
        echo json_encode(['ok' => true, 'user' => publicUser($username)]);
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
$me = currentUsername();
if ($me === null) {
    respondError(401, 'Sessão expirada. Entre novamente.');
}

// As ações de conta abaixo ficam antes do session_write_close() porque podem precisar
// atualizar a sessão atual. Nos erros respondem 400/403 (e não 401): para o painel,
// 401 significa "sessão expirada".

// ── Troca da própria senha (botão "Trocar Senha" do painel) ──
// As outras sessões desse usuário (outros aparelhos) deixam de valer.
if ($action === 'change_password') {
    if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok' => false]); exit; }

    rejectIfTooManyFailures();

    $current = (string) ($body['current_password'] ?? '');
    $new     = (string) ($body['new_password'] ?? '');

    if (!password_verify($current, $users[$me]['hash'])) {
        registerPasswordFailure();
        respondError(400, 'A senha atual está incorreta.');
    }
    if (strlen($new) < MIN_PASSWORD_LENGTH) {
        respondError(400, 'A nova senha deve ter pelo menos ' . MIN_PASSWORD_LENGTH . ' caracteres.');
    }
    if ($new === $current) {
        respondError(400, 'A nova senha deve ser diferente da atual.');
    }

    $users[$me]['hash'] = hashPassword($new);
    if (!writeAuthUsers($configFile, $users)) {
        respondError(500, 'Não foi possível gravar a nova senha no servidor.');
    }

    clearPasswordFailures();
    session_regenerate_id(true);
    $_SESSION['pw'] = passwordFingerprint($users[$me]['hash']);
    echo json_encode(['ok' => true]);
    exit;
}

// ── Cadastro de usuários (janela "Usuários", só para administradores) ──
if (in_array($action, ['users_list', 'user_save', 'user_delete'], true)) {
    if (empty($users[$me]['admin'])) {
        respondError(403, 'Apenas administradores podem gerenciar usuários.');
    }
    $countAdmins = function (array $list): int {
        return count(array_filter($list, function ($u) { return !empty($u['admin']); }));
    };

    if ($action === 'users_list') {
        echo json_encode(['ok' => true, 'users' => array_map('publicUser', array_keys($users))]);
        exit;
    }

    if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok' => false]); exit; }

    if ($action === 'user_save') {
        // "original" vem preenchido ao editar; vazio ao criar. O login (usuário) não muda depois de criado.
        $original = strtolower(trim((string) ($body['original'] ?? '')));
        $username = $original !== '' ? $original : strtolower(trim((string) ($body['username'] ?? '')));
        $name     = trim((string) ($body['name'] ?? ''));
        $role     = trim((string) ($body['role'] ?? ''));
        $admin    = !empty($body['admin']);
        $password = (string) ($body['password'] ?? '');
        $isNew    = $original === '';

        if ($isNew) {
            if (!preg_match(USERNAME_PATTERN, $username)) {
                respondError(400, 'O usuário deve ter de 3 a 40 caracteres, usando apenas letras, números, ponto, hífen ou sublinhado.');
            }
            if (isset($users[$username])) respondError(400, 'Já existe um usuário com esse login.');
            if ($password === '') respondError(400, 'Informe a senha inicial do novo usuário.');
        } elseif (!isset($users[$username])) {
            respondError(400, 'Usuário não encontrado.');
        }
        if ($name === '' || strlen($name) > 120) respondError(400, 'Informe o nome completo.');
        if (strlen($role) > 120) respondError(400, 'O cargo informado é longo demais.');
        if ($password !== '' && strlen($password) < MIN_PASSWORD_LENGTH) {
            respondError(400, 'A senha deve ter pelo menos ' . MIN_PASSWORD_LENGTH . ' caracteres.');
        }

        $updated = $users;
        $updated[$username] = [
            'name'  => $name,
            'role'  => $role,
            'hash'  => $password !== '' ? hashPassword($password) : $users[$username]['hash'],
            'admin' => $admin,
        ];
        if ($countAdmins($updated) === 0) respondError(400, 'O sistema precisa de pelo menos um administrador.');
        if (!writeAuthUsers($configFile, $updated)) respondError(500, 'Não foi possível gravar o usuário no servidor.');
        $users = $updated;

        // Administrador redefinindo a própria senha por aqui: mantém a sessão dele válida.
        if ($username === $me && $password !== '') {
            session_regenerate_id(true);
            $_SESSION['pw'] = passwordFingerprint($users[$me]['hash']);
        }
        echo json_encode(['ok' => true, 'users' => array_map('publicUser', array_keys($users)), 'user' => publicUser($me)]);
        exit;
    }

    // user_delete
    $username = strtolower(trim((string) ($body['username'] ?? '')));
    if (!isset($users[$username])) respondError(400, 'Usuário não encontrado.');
    if ($username === $me) respondError(400, 'Você não pode excluir o próprio usuário.');
    $updated = $users;
    unset($updated[$username]);
    if ($countAdmins($updated) === 0) respondError(400, 'O sistema precisa de pelo menos um administrador.');
    if (!writeAuthUsers($configFile, $updated)) respondError(500, 'Não foi possível remover o usuário no servidor.');
    $users = $updated;
    echo json_encode(['ok' => true, 'users' => array_map('publicUser', array_keys($users))]);
    exit;
}

// Renova o prazo do cookie a cada uso e libera o arquivo de sessão, para que as
// chamadas paralelas do painel não fiquem esperando uma pela outra.
setcookie(session_name(), session_id(), sessionCookieOptions(time() + SESSION_LIFETIME));
session_write_close();

// Uma gravação por vez: duas pessoas salvando no mesmo instante entram em fila, e
// quem lê espera a gravação em andamento terminar. A trava é liberada sozinha ao fim.
$lockHandle = fopen($dataDir . '.lock', 'c');
if ($lockHandle) flock($lockHandle, $method === 'POST' ? LOCK_EX : LOCK_SH);

switch ($action) {

    // ── Carrega todo o estado do app de uma vez ──────────────
    case 'load':
        echo json_encode(fullState());
        break;

    // ── Versão dos dados: consulta leve para saber se alguém gravou algo ──
    case 'version':
        echo json_encode(['ok' => true, 'version' => stateVersion()]);
        break;

    // ── Aplica as alterações deste painel e devolve o estado atualizado ──
    case 'sync':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false]); break; }
        $changes = (isset($body['changes']) && is_array($body['changes'])) ? $body['changes'] : [];

        $lists = ['visits' => 'visits.json', 'pedidos' => 'pedidos.json',
                  'validated_ruptures' => 'ruptures.json', 'resolved_history' => 'resolved_history.json'];
        $allSaved = true;
        foreach ($lists as $collection => $file) {
            if (!isset($changes[$collection])) continue;
            // Histórico de resolvidas: os mais novos ficam na frente e a lista é limitada
            $isHistory = $collection === 'resolved_history';
            $updated = applyListChanges($collection, readData($file, []), $changes[$collection], $isHistory);
            if ($updated === null) continue;
            if ($isHistory) $updated = array_slice($updated, 0, 500);
            $allSaved = writeData($file, $updated) && $allSaved;
        }

        // Status das lojas: { set: { idDaLoja: {...} }, remove: [idDaLoja] }
        if (isset($changes['store_updates']) && is_array($changes['store_updates'])) {
            $set    = (isset($changes['store_updates']['set']) && is_array($changes['store_updates']['set'])) ? $changes['store_updates']['set'] : [];
            $remove = (isset($changes['store_updates']['remove']) && is_array($changes['store_updates']['remove'])) ? $changes['store_updates']['remove'] : [];
            if (count($set) > 0 || count($remove) > 0) {
                $updates = readData('store_updates.json', []);
                foreach ($remove as $storeId) unset($updates[(string) $storeId]);
                foreach ($set as $storeId => $value) $updates[(string) $storeId] = $value;
                $allSaved = writeData('store_updates.json', count($updates) > 0 ? $updates : new stdClass()) && $allSaved;
            }
        }

        // Notificações dispensadas: { add: [...], remove: [...] }
        if (isset($changes['dismissed']) && is_array($changes['dismissed'])) {
            $add    = (isset($changes['dismissed']['add']) && is_array($changes['dismissed']['add'])) ? $changes['dismissed']['add'] : [];
            $remove = (isset($changes['dismissed']['remove']) && is_array($changes['dismissed']['remove'])) ? $changes['dismissed']['remove'] : [];
            if (count($add) > 0 || count($remove) > 0) {
                $dismissed = array_diff(readData('dismissed.json', []), $remove);
                $dismissed = array_values(array_unique(array_merge($dismissed, $add)));
                $allSaved = writeData('dismissed.json', $dismissed) && $allSaved;
            }
        }

        if (!$allSaved) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Não foi possível gravar os dados no servidor.']);
            break;
        }
        echo json_encode(fullState());
        break;

    // As ações save_* e delete_* abaixo são da versão anterior do painel. Continuam
    // aqui só para abas que ficaram abertas com o código antigo; o painel atual usa "sync".

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
