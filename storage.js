// ============================================================
// storage.js — Camada de sincronização com o servidor
// Detecta automaticamente se está rodando no servidor ou local
// ============================================================

const Storage = (function () {

    // --- Configuração ---
    // A API identifica o usuário pelo cookie de sessão criado no login (backend/api.php).
    // Não existe mais token nem senha neste arquivo.
    const API_URL = './backend/api.php';

    // Detecta se está rodando no servidor (http/https) ou local (file://)
    const isServer = window.location.protocol !== 'file:';

    // Ambiente de desenvolvimento: sem backend PHP respondendo, o painel abre só com os dados locais
    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

    // Flag para evitar múltiplos syncs simultâneos
    let _syncing = false;

    // Sessão que expira com o painel aberto: avisa o app uma vez e guarda as gravações
    // recusadas para reenviar logo após o novo login (ver login()). Quem abre a página
    // sem estar logado ('none') não entra nessa fila — o estado local dele pode estar velho.
    const MAX_PENDING_CALLS = 50;
    let _sessionState = 'none'; // 'none' | 'active' | 'expired'
    let _onUnauthorized = null;
    let _pendingCalls = [];

    function onUnauthorized(handler) {
        _onUnauthorized = handler;
    }

    // --- Helper de chamada à API ---
    async function call(action, body = null, isFormData = false) {
        if (!isServer) return null; // Sem servidor, usa só localStorage
        try {
            const opts = {
                method: body ? 'POST' : 'GET',
                credentials: 'same-origin',
                headers: {}
            };
            if (body && !isFormData) {
                opts.headers['Content-Type'] = 'application/json';
                opts.body = JSON.stringify(body);
            } else if (isFormData) {
                opts.body = body; // FormData (para upload de foto)
                // Não definir Content-Type: o browser define automaticamente com boundary
            }
            const res = await fetch(`${API_URL}?action=${action}`, opts);
            if (res.status === 401) {
                if (_sessionState === 'active') {
                    _sessionState = 'expired';
                    if (_onUnauthorized) _onUnauthorized();
                }
                if (_sessionState === 'expired' && body && _pendingCalls.length < MAX_PENDING_CALLS) {
                    _pendingCalls.push([action, body, isFormData]);
                }
                return null;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            _sessionState = 'active';
            return await res.json();
        } catch (err) {
            console.warn(`[Storage] Falha na ação "${action}":`, err.message);
            return null;
        }
    }

    // --- Autenticação ---
    // Chamada sem os tratamentos de call(): aqui o 401 é uma resposta esperada.
    async function authRequest(action, body = null) {
        try {
            const opts = { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: {} };
            if (body) {
                opts.headers['Content-Type'] = 'application/json';
                opts.body = JSON.stringify(body);
            }
            const res = await fetch(`${API_URL}?action=${action}`, opts);
            return await res.json();
        } catch (err) {
            return null; // backend inacessível ou resposta que não é JSON
        }
    }

    // Retorna { logged_in: true|false, error? } ou null se o backend não respondeu.
    // Um erro do backend (ex.: sistema ainda não configurado) conta como "não logado".
    async function checkSession() {
        if (!isServer) return null;
        const data = await authRequest('session');
        if (!data) return null;
        _sessionState = (data.ok && data.logged_in) ? 'active' : 'none';
        return data.ok ? data : { logged_in: false, error: data.error };
    }

    // Retorna { ok: true } | { ok: true, local: true } (sem backend, só em desenvolvimento) | { ok: false, error }
    async function login(username, password) {
        if (!isServer) return { ok: true, local: true };
        const data = await authRequest('login', { username, password });
        if (data && data.ok) {
            const pending = _pendingCalls;
            _pendingCalls = [];
            _sessionState = 'active';
            for (const [action, body, isFormData] of pending) {
                await call(action, body, isFormData);
            }
            return { ok: true };
        }
        if (data && data.error) return { ok: false, error: data.error };
        if (isLocalhost) return { ok: true, local: true };
        return { ok: false, error: 'Não foi possível conectar ao servidor. Tente novamente em instantes.' };
    }

    // Retorna { ok: true } | { ok: false, error }. As outras sessões abertas (outros aparelhos) são encerradas.
    async function changePassword(currentPassword, newPassword) {
        if (!isServer) return { ok: false, error: 'A troca de senha só funciona com o sistema publicado no servidor.' };
        const data = await authRequest('change_password', { current_password: currentPassword, new_password: newPassword });
        if (data && data.ok) return { ok: true };
        return { ok: false, error: (data && data.error) || 'Não foi possível conectar ao servidor. Tente novamente em instantes.' };
    }

    async function logout() {
        if (!isServer) return;
        _pendingCalls = [];
        _sessionState = 'none';
        await authRequest('logout', {});
    }

    // --- Carrega todo o estado do servidor na inicialização ---
    async function loadFromServer() {
        if (!isServer) return null;
        const data = await call('load');
        if (data && data.ok) {
            console.log('[Storage] Dados carregados do servidor com sucesso.');
            return data;
        }
        return null;
    }

    // --- Sincroniza visitas para o servidor (background) ---
    async function syncVisits(visits) {
        return await call('save_visits', { visits });
    }

    // --- Deleta visitas especificamente no servidor ---
    async function deleteVisits(visitIds) {
        return await call('delete_visits', { visit_ids: visitIds });
    }

    // --- Sincroniza pedidos para o servidor ---
    async function syncPedidos(pedidos) {
        return await call('save_pedidos', { pedidos });
    }

    // --- Deleta pedidos especificamente no servidor ---
    async function deletePedidos(pedidoIds) {
        return await call('delete_pedidos', { pedido_ids: pedidoIds });
    }

    // --- Sincroniza atualizações de lojas para o servidor ---
    async function syncStoreUpdates(updatesMap) {
        return await call('save_store_updates', { updates: updatesMap });
    }

    // --- Sincroniza rupturas validadas ---
    async function syncRuptures(ruptures) {
        return await call('save_ruptures', { ruptures });
    }

    // --- Sincroniza notificações dispensadas ---
    async function syncDismissed(dismissed) {
        return await call('save_dismissed', { dismissed });
    }

    // --- Sincroniza histórico de rupturas resolvidas ---
    async function syncResolvedHistory(resolvedHistory) {
        return await call('save_resolved_history', { resolved_history: resolvedHistory });
    }

    // --- Faz sync completo de todos os dados de uma vez ---
    async function syncAll(visits, storeUpdatesMap, ruptures, dismissed, resolvedHistory) {
        if (_syncing) return; // evita sobreposição
        _syncing = true;
        try {
            await Promise.all([
                syncVisits(visits),
                syncStoreUpdates(storeUpdatesMap),
                syncRuptures(ruptures),
                syncDismissed(dismissed),
                syncResolvedHistory(resolvedHistory),
            ]);
        } finally {
            _syncing = false;
        }
    }

    // --- Upload de foto para o servidor ---
    // Retorna a URL pública da foto ou null em caso de erro
    async function uploadPhoto(base64DataUrl, visitId) {
        if (!isServer) return null;
        try {
            // Converte base64 para Blob
            const res = await fetch(base64DataUrl);
            const blob = await res.blob();

            const formData = new FormData();
            formData.append('photo', blob, `photo_${visitId}.jpg`);
            formData.append('visit_id', String(visitId));

            const result = await call('upload_photo', formData, true);
            if (result && result.ok) {
                return result.url; // ex: "uploads/photo_1234_123456789_1234.jpg"
            }
            return null;
        } catch (err) {
            console.warn('[Storage] Falha no upload de foto:', err.message);
            return null;
        }
    }

    // --- Deleta fotos de uma visita no servidor ---
    async function deleteVisitPhotos(visitId) {
        return await call('delete_photos', { visit_id: String(visitId) });
    }

    // --- Expõe informações sobre o ambiente ---
    function getMode() {
        return isServer ? 'server' : 'local';
    }

    // API pública
    return {
        isServer,
        onUnauthorized,
        checkSession,
        login,
        changePassword,
        logout,
        loadFromServer,
        syncVisits,
        deleteVisits,
        syncPedidos,
        deletePedidos,
        syncStoreUpdates,
        syncRuptures,
        syncDismissed,
        syncResolvedHistory,
        syncAll,
        uploadPhoto,
        deleteVisitPhotos,
        getMode,
    };

})();




