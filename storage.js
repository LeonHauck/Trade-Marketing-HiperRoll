// ============================================================
// storage.js — Camada de sincronização com o servidor
// Detecta automaticamente se está rodando no servidor ou local
// ============================================================

const Storage = (function () {

    // --- Configuração ---
    // IMPORTANTE: deve ser o mesmo token definido em backend/api.php
    const API_TOKEN = 'hiperroll_trade_2025_secret';
    const API_URL   = './backend/api.php';

    // Detecta se está rodando no servidor (http/https) ou local (file://)
    const isServer = window.location.protocol !== 'file:';

    // Flag para evitar múltiplos syncs simultâneos
    let _syncing = false;

    // --- Helper de chamada à API ---
    async function call(action, body = null, isFormData = false) {
        if (!isServer) return null; // Sem servidor, usa só localStorage
        try {
            const opts = {
                method: body ? 'POST' : 'GET',
                headers: { 'X-API-Token': API_TOKEN }
            };
            if (body && !isFormData) {
                opts.headers['Content-Type'] = 'application/json';
                opts.body = JSON.stringify(body);
            } else if (isFormData) {
                opts.body = body; // FormData (para upload de foto)
                // Não definir Content-Type: o browser define automaticamente com boundary
            }
            const res = await fetch(`${API_URL}?action=${action}`, opts);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            console.warn(`[Storage] Falha na ação "${action}":`, err.message);
            return null;
        }
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

    // --- Faz sync completo de todos os dados de uma vez ---
    async function syncAll(visits, storeUpdatesMap, ruptures, dismissed) {
        if (_syncing) return; // evita sobreposição
        _syncing = true;
        try {
            await Promise.all([
                syncVisits(visits),
                syncStoreUpdates(storeUpdatesMap),
                syncRuptures(ruptures),
                syncDismissed(dismissed),
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
        loadFromServer,
        syncVisits,
        syncStoreUpdates,
        syncRuptures,
        syncDismissed,
        syncAll,
        uploadPhoto,
        deleteVisitPhotos,
        getMode,
    };

})();




