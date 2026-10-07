<?php
/**
 * MODELO de backend/config.php — o arquivo real NÃO vai para o Git (está no .gitignore).
 *
 * Não copie este arquivo: abra backend/setup.php no navegador para criar o primeiro
 * usuário (administrador). Os demais são cadastrados no painel, na janela "Usuários".
 * O sistema regrava o config.php sozinho sempre que um usuário é criado, alterado
 * ou troca a senha.
 *
 * Formato gravado (o "hash" vem de password_hash(); a senha nunca fica em texto puro):
 */

return [
    'users' => [
        'nome.sobrenome' => [
            'name'  => 'Nome Sobrenome',
            'role'  => 'Trade Marketing',
            'hash'  => 'hash_gerado_pelo_password_hash',
            'admin' => true,
        ],
    ],
];
