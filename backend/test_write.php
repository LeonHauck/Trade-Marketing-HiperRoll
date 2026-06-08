<?php
header('Content-Type: application/json; charset=utf-8');

$dir = __DIR__ . '/data/';
$fn = $dir . 'test_write.json';

$result = [
    'dir' => str_replace("\\\\", '/', $dir),
    'dir_exists' => is_dir($dir),
    'dir_is_writable' => is_writable($dir),
];

if (!is_dir($dir)) {
    $result['mkdir_attempt'] = @mkdir($dir, 0755, true) ? 'created' : 'failed';
    $result['dir_exists_after'] = is_dir($dir);
    $result['dir_is_writable_after'] = is_writable($dir);
}

if (is_writable($dir)) {
    $ok = @file_put_contents($fn, json_encode(['ok' => true, 'ts' => time()], JSON_UNESCAPED_UNICODE));
    $result['write_ok'] = $ok !== false;
    $result['file'] = 'backend/data/test_write.json';
    $result['file_size'] = $ok !== false ? filesize($fn) : null;
} else {
    $result['write_ok'] = false;
    $result['error'] = 'Diretório não gravável pelo processo PHP';
}

echo json_encode($result);
