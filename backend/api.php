<?php
// ============================================================
// Trade Marketing Hiperroll — Backend API
// Hospedagem: HostGator (PHP 7.4+, sem banco de dados)
// ============================================================

// --- Segurança: token secreto ---
// IMPORTANTE: troque este valor antes de fazer deploy!
define('API_TOKEN', 'hiperroll_trade_2025_secret');

// --- CORS e Headers ---
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// --- Verificar token de autenticação ---
$token = $_SERVER['HTTP_X_API_TOKEN'] ?? $_GET['token'] ?? '';
if ($token !== API_TOKEN) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Não autorizado']);
    exit;
}

// --- Pastas de dados ---
$dataDir   = __DIR__ . '/data/';
$uploadDir = dirname(__DIR__) . '/uploads/';

foreach ([$dataDir, $uploadDir] as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
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

// --- Roteador ---
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$body   = [];
if ($method === 'POST') {
    $rawBody = file_get_contents('php://input');
    $body = json_decode($rawBody, true) ?? [];
}

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
        ]);
        break;

    // ── Salva visitas ─────────────────────────────────────────
    case 'save_visits':
        if ($method !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false]); break; }
        $ok = writeData('visits.json', $body['visits'] ?? []);
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
