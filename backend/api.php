<?php
// ============================================================
// Trade Marketing Hiperroll — Backend API
// Hospedagem: HostGator (PHP 7.4+, sem banco de dados)
// ============================================================

// --- Headers ---
// Sem cabeçalhos de CORS: a API só atende o próprio site (mesma origem).
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Datas gravadas pelo servidor (auditoria, config) no horário de Brasília
date_default_timezone_set('America/Sao_Paulo');

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

// Aplica { upsert: [itens], remove: [itens] } em uma lista. Retorna a lista nova, ou
// null se nada mudou de fato. Itens novos vão para o fim (ou para o início, com $prepend).
// $events recebe o que aconteceu: ['create'|'update'|'delete', chave, itemAntes, itemDepois].
function applyListChanges(string $collection, array $current, $changes, bool $prepend, array &$events): ?array {
    $upserts = (is_array($changes) && isset($changes['upsert']) && is_array($changes['upsert'])) ? $changes['upsert'] : [];
    $removes = (is_array($changes) && isset($changes['remove']) && is_array($changes['remove'])) ? $changes['remove'] : [];

    $map = [];
    foreach ($current as $item) {
        $key = itemKey($collection, $item);
        if ($key !== null) $map['k' . $key] = $item;
    }
    foreach ($removes as $item) {
        $key = itemKey($collection, $item);
        if ($key === null || !isset($map['k' . $key])) continue;
        $events[] = ['delete', $key, $map['k' . $key], null];
        unset($map['k' . $key]);
    }
    $added = [];
    foreach ($upserts as $item) {
        $key = itemKey($collection, $item);
        if ($key === null) continue;
        $item = withAuthorship($collection, $map['k' . $key] ?? null, $item);
        if (isset($map['k' . $key])) {
            if (json_encode($map['k' . $key]) === json_encode($item)) continue;
            $events[] = ['update', $key, $map['k' . $key], $item];
            $map['k' . $key] = $item;
        } else {
            $events[] = ['create', $key, null, $item];
            if ($prepend) $added['k' . $key] = $item;
            else $map['k' . $key] = $item;
        }
    }
    if (count($events) === 0) return null;
    return array_values($prepend ? $added + $map : $map);
}

// Lê, aplica, grava e registra na auditoria as alterações de uma lista.
// Retorna false só se a gravação falhou.
function syncList(string $collection, string $file, $changes): bool {
    // Histórico de resolvidas: os mais novos ficam na frente e a lista é limitada
    $isHistory = $collection === 'resolved_history';
    $events    = [];
    $updated   = applyListChanges($collection, readData($file, []), $changes, $isHistory, $events);
    if ($updated === null) return true;
    if ($isHistory) $updated = array_slice($updated, 0, 500);
    if (!writeData($file, $updated)) return false;
    auditListEvents($collection, $events);
    return true;
}

// --- Auditoria: quem fez o quê e quando ---
// Um arquivo por mês em backend/data (audit_AAAA-MM.json), com um registro JSON por
// linha. Só se acrescenta ao fim: não existe ação para alterar ou apagar registros.
// Campos: t (hora), u/n (login e nome de quem fez), e (o quê), a (ação), id, d (detalhes).
$me = null;

function auditLog(string $entity, string $action, $id, array $details = []): void {
    global $dataDir, $me, $users;
    $entry = ['t' => time(), 'u' => $me, 'n' => $users[$me]['name'] ?? $me,
              'e' => $entity, 'a' => $action, 'id' => $id, 'd' => $details];
    $line = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    if ($line === false) return;
    @file_put_contents($dataDir . 'audit_' . date('Y-m') . '.json', $line . "\n", FILE_APPEND | LOCK_EX);
}

// Campos de cada item que interessam à auditoria (o resto é controle interno do painel).
const AUDIT_FIELDS = [
    'visits'  => ['storeId', 'date', 'ruptures', 'extraPoints', 'isExtra', 'notes'],
    'pedidos' => ['numeroPedido', 'clienteCodigo', 'clienteNome', 'storeId', 'numeroNF', 'dataPedido',
                  'datasAgendamento', 'datasEntrega', 'observacoes', 'itens'],
];

function auditSnapshot(string $collection, array $item): array {
    // Pedidos antigos guardam uma única data de agendamento/entrega: trata como lista de uma data
    if ($collection === 'pedidos') {
        foreach (['Agendamento', 'Entrega'] as $kind) {
            if (!isset($item['datas' . $kind]) && !empty($item['data' . $kind])) $item['datas' . $kind] = [$item['data' . $kind]];
        }
    }
    $snapshot = [];
    foreach (AUDIT_FIELDS[$collection] as $field) {
        $value = $item[$field] ?? null;
        $snapshot[$field] = ($value === '' || $value === [] || $value === false) ? null : $value;
    }
    return $snapshot;
}

// Autoria de visitas e pedidos, gravada no próprio item: createdBy (quem adicionou e
// quando) e lastChange (quem adicionou ou editou por último). O painel mostra isso ao
// administrador nas listas e nos modais. Quem define é sempre o servidor: o que vier do
// painel nesses campos é descartado, e uma gravação que não muda nenhum campo auditado
// mantém os carimbos que já existiam.
function withAuthorship(string $collection, ?array $old, array $new): array {
    global $me, $users;
    if (!isset(AUDIT_FIELDS[$collection])) {
        // Baixa manual de ruptura: guarda quem resolveu
        if ($collection === 'resolved_history') {
            unset($new['resolvedBy']);
            if ($old !== null && isset($old['resolvedBy'])) $new['resolvedBy'] = $old['resolvedBy'];
            elseif ($old === null && !empty($new['resolvedManually'])) $new['resolvedBy'] = $users[$me]['name'] ?? $me;
        }
        return $new;
    }
    unset($new['createdBy'], $new['lastChange']);
    $stamp = ['t' => time(), 'u' => $me, 'n' => $users[$me]['name'] ?? $me];
    if ($old === null) {
        $new['createdBy']  = $stamp;
        $new['lastChange'] = $stamp + ['a' => 'create'];
        return $new;
    }
    if (isset($old['createdBy'])) $new['createdBy'] = $old['createdBy'];
    $changed = json_encode(auditSnapshot($collection, $old)) !== json_encode(auditSnapshot($collection, $new));
    if ($changed) $new['lastChange'] = $stamp + ['a' => 'update'];
    elseif (isset($old['lastChange'])) $new['lastChange'] = $old['lastChange'];
    return $new;
}

function auditListEvents(string $collection, array $events): void {
    $entities = ['visits' => 'visit', 'pedidos' => 'pedido'];
    foreach ($events as [$type, $key, $old, $new]) {
        if (isset($entities[$collection])) {
            if ($type !== 'update') {
                auditLog($entities[$collection], $type, $key, auditSnapshot($collection, $type === 'delete' ? $old : $new));
                continue;
            }
            $before  = auditSnapshot($collection, $old);
            $after   = auditSnapshot($collection, $new);
            $changes = [];
            foreach ($after as $field => $value) {
                if (json_encode($before[$field]) !== json_encode($value)) $changes[$field] = [$before[$field], $value];
            }
            if (count($changes) === 0) continue;
            $identity = array_intersect_key($after, array_flip(['storeId', 'date', 'numeroPedido', 'clienteNome']));
            auditLog($entities[$collection], 'update', $key, $identity + ['changes' => $changes]);
        } elseif ($collection === 'resolved_history' && $type === 'create' && !empty($new['resolvedManually'])) {
            // Só a baixa feita à mão no painel; a resolução automática já aparece na visita que a causou
            auditLog('rupture', 'resolve', $key, array_intersect_key($new, array_flip(['productId', 'productName', 'storeId', 'storeName', 'visitDate'])));
        }
    }
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
        $me = $username;
        auditLog('session', 'login', $username);
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
    auditLog('user', 'password', $me, ['name' => $users[$me]['name'] ?? $me]);
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

        if ($isNew) {
            auditLog('user', 'create', $username, ['name' => $name, 'role' => $role, 'admin' => $admin]);
        } else {
            $userChanges = [];
            foreach (['name' => $name, 'role' => $role, 'admin' => $admin] as $field => $value) {
                $previous = $field === 'admin' ? !empty($users[$username]['admin']) : ($users[$username][$field] ?? '');
                if ($previous !== $value) $userChanges[$field] = [$previous, $value];
            }
            if (count($userChanges) > 0 || $password !== '') {
                auditLog('user', 'update', $username, ['name' => $name, 'changes' => $userChanges, 'passwordReset' => $password !== '']);
            }
        }
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
    auditLog('user', 'delete', $username, ['name' => $users[$username]['name'] ?? $username, 'role' => $users[$username]['role'] ?? '']);
    $users = $updated;
    echo json_encode(['ok' => true, 'users' => array_map('publicUser', array_keys($users))]);
    exit;
}

// ── Auditoria: consulta (só administradores) ──
if ($action === 'audit_log') {
    if (empty($users[$me]['admin'])) {
        respondError(403, 'Apenas administradores podem consultar a auditoria.');
    }
    $months = [];
    foreach (glob($dataDir . 'audit_*.json') ?: [] as $file) {
        if (preg_match('/audit_(\d{4}-\d{2})\.json$/', $file, $match)) $months[] = $match[1];
    }
    rsort($months);
    $month = (string) ($_GET['month'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}$/', $month)) $month = $months[0] ?? date('Y-m');

    $entries = [];
    $path = $dataDir . 'audit_' . $month . '.json';
    if (file_exists($path)) {
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $entry = json_decode($line, true);
            if (is_array($entry)) $entries[] = $entry;
        }
    }
    echo json_encode(['ok' => true, 'month' => $month, 'months' => $months, 'entries' => array_reverse($entries)]);
    exit;
}

// ── Auditoria: ações que não passam pelo servidor (planos de rota e importação de CSV
// ficam só no navegador), avisadas pelo próprio painel ──
if ($action === 'audit_event') {
    if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok' => false]); exit; }
    $eventTypes = ['route_create' => ['route', 'create'], 'route_delete' => ['route', 'delete'], 'csv_import' => ['import', 'csv']];
    $type = (string) ($body['type'] ?? '');
    if (!isset($eventTypes[$type])) respondError(400, 'Evento de auditoria desconhecido.');

    $details = [];
    foreach ((isset($body['details']) && is_array($body['details'])) ? $body['details'] : [] as $field => $value) {
        if (count($details) >= 12 || !is_scalar($value)) continue;
        $details[substr((string) $field, 0, 40)] = is_string($value) ? substr($value, 0, 200) : $value;
    }
    auditLog($eventTypes[$type][0], $eventTypes[$type][1], $details['id'] ?? null, $details);
    echo json_encode(['ok' => true]);
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
            if (isset($changes[$collection])) $allSaved = syncList($collection, $file, $changes[$collection]) && $allSaved;
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
                $before    = readData('dismissed.json', []);
                $dismissed = array_values(array_unique(array_merge(array_diff($before, $remove), $add)));
                $allSaved  = writeData('dismissed.json', $dismissed) && $allSaved;
                $newlyDismissed = count(array_diff($dismissed, $before));
                if ($newlyDismissed > 0) auditLog('notifications', 'clear', null, ['count' => $newlyDismissed]);
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

    // ── Salva visitas (junta pelo id; o que chega substitui o que havia) ──
    case 'save_visits':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false]); break; }
        $incoming = (isset($body['visits']) && is_array($body['visits'])) ? $body['visits'] : [];
        echo json_encode(['ok' => syncList('visits', 'visits.json', ['upsert' => $incoming, 'remove' => []])]);
        break;

    // ── Exclui visitas pelos ids ──────────────────────────────
    case 'delete_visits':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false]); break; }
        $ids = (isset($body['visit_ids']) && is_array($body['visit_ids'])) ? $body['visit_ids'] : [];
        $remove = array_map(function ($id) { return ['id' => $id]; }, $ids);
        echo json_encode(['ok' => syncList('visits', 'visits.json', ['upsert' => [], 'remove' => $remove])]);
        break;

    // ── Salva pedidos (mesma regra das visitas) ───────────────
    case 'save_pedidos':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false]); break; }
        $incoming = (isset($body['pedidos']) && is_array($body['pedidos'])) ? $body['pedidos'] : [];
        echo json_encode(['ok' => syncList('pedidos', 'pedidos.json', ['upsert' => $incoming, 'remove' => []])]);
        break;

    // ── Exclui pedidos pelos ids ──────────────────────────────
    case 'delete_pedidos':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false]); break; }
        $ids = (isset($body['pedido_ids']) && is_array($body['pedido_ids'])) ? $body['pedido_ids'] : [];
        $remove = array_map(function ($id) { return ['id' => $id]; }, $ids);
        echo json_encode(['ok' => syncList('pedidos', 'pedidos.json', ['upsert' => [], 'remove' => $remove])]);
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
