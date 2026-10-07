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
    // retryAfterLogin: se a sessão tiver expirado, guarda a gravação para reenviar no novo login.
    async function call(action, body = null, isFormData = false, retryAfterLogin = true) {
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
                if (_sessionState === 'expired' && body && retryAfterLogin && _pendingCalls.length < MAX_PENDING_CALLS) {
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

    // Retorna { logged_in: true|false, user?, error? } ou null se o backend não respondeu.
    // "user" é { username, name, role, admin } de quem está logado.
    // Um erro do backend (ex.: sistema ainda não configurado) conta como "não logado".
    async function checkSession() {
        if (!isServer) return null;
        const data = await authRequest('session');
        if (!data) return null;
        _sessionState = (data.ok && data.logged_in) ? 'active' : 'none';
        return data.ok ? data : { logged_in: false, error: data.error };
    }

    // Retorna { ok: true, user } | { ok: true, local: true } (sem backend, só em desenvolvimento) | { ok: false, error }
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
            return { ok: true, user: data.user };
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

    // --- Cadastro de usuários (só administradores; o servidor confere) ---
    // Todas retornam { ok: true, users, user? } | { ok: false, error }.
    async function accountRequest(action, body = null) {
        if (!isServer) return { ok: false, error: 'O cadastro de usuários só funciona com o sistema publicado no servidor.' };
        const data = await authRequest(action, body);
        if (data && data.ok) return data;
        return { ok: false, error: (data && data.error) || 'Não foi possível conectar ao servidor. Tente novamente em instantes.' };
    }

    function listUsers() {
        return accountRequest('users_list');
    }

    // Sem "original" cria um usuário novo; com "original" altera o existente (a senha em branco é mantida).
    function saveUser({ original, username, name, role, admin, password }) {
        return accountRequest('user_save', { original, username, name, role, admin, password });
    }

    function deleteUser(username) {
        return accountRequest('user_delete', { username });
    }

    // --- Auditoria ---
    // Registros de um mês ("AAAA-MM"; sem mês, o mais recente). Só administradores.
    // Retorna { ok: true, month, months, entries } | { ok: false, error }.
    function loadAuditLog(month) {
        return accountRequest('audit_log' + (month ? '&month=' + encodeURIComponent(month) : ''));
    }

    // Avisa o servidor de uma ação que só existe neste navegador (plano de rota, importação
    // de CSV), para ela entrar na auditoria. O que é gravado no servidor já é registrado lá.
    function logEvent(type, details) {
        if (!isServer) return Promise.resolve(null);
        return call('audit_event', { type, details }, false, false);
    }

    async function logout() {
        if (!isServer) return;
        _pendingCalls = [];
        _sessionState = 'none';
        _base = null;
        _version = null;
        await authRequest('logout', {});
    }

    // --- Sincronização por diferenças ---
    // O painel guarda uma "foto" do último estado que recebeu do servidor (_base). Para
    // gravar, compara o estado atual com essa foto e envia só o que mudou; o servidor
    // aplica e devolve o estado completo, já com o que os outros usuários gravaram.
    // Assim uma tela desatualizada nunca apaga o que ela ainda não conhecia.

    // Chave que identifica um item em cada lista (as mesmas regras de backend/api.php).
    const LIST_KEYS = {
        visits: v => String(v.id),
        pedidos: p => String(p.id),
        validated_ruptures: r => `${r.productId}:${r.storeId}`,
        resolved_history: h => `${h.visitId || h.id}:${h.productId}:${h.storeId}`
    };
    const OUTBOX_KEY = 'hr_sync_outbox';

    let _base = null;    // foto do último estado recebido do servidor
    let _version = null; // versão dos dados do servidor nesse momento
    let _syncChain = Promise.resolve();

    // "Foto" comparável de um estado: cada item vira texto, indexado pela sua chave.
    function snapshot(state) {
        const snap = { store_updates: new Map(), dismissed: new Set(state.dismissed || []) };
        Object.keys(LIST_KEYS).forEach(name => {
            snap[name] = new Map();
            (state[name] || []).forEach(item => {
                if (item) snap[name].set(LIST_KEYS[name](item), JSON.stringify(item));
            });
        });
        Object.entries(state.store_updates || {}).forEach(([id, value]) => {
            snap.store_updates.set(id, JSON.stringify(value));
        });
        return snap;
    }

    // O que mudou de uma foto para a outra, no formato da ação "sync" — ou null se nada mudou.
    function diff(from, to) {
        const changes = {};
        Object.keys(LIST_KEYS).forEach(name => {
            const upsert = [], remove = [];
            to[name].forEach((json, key) => { if (from[name].get(key) !== json) upsert.push(JSON.parse(json)); });
            from[name].forEach((json, key) => { if (!to[name].has(key)) remove.push(JSON.parse(json)); });
            if (upsert.length > 0 || remove.length > 0) changes[name] = { upsert, remove };
        });

        const set = {}, removeStores = [];
        to.store_updates.forEach((json, id) => { if (from.store_updates.get(id) !== json) set[id] = JSON.parse(json); });
        from.store_updates.forEach((json, id) => { if (!to.store_updates.has(id)) removeStores.push(id); });
        if (Object.keys(set).length > 0 || removeStores.length > 0) changes.store_updates = { set, remove: removeStores };

        const add = [...to.dismissed].filter(x => !from.dismissed.has(x));
        const removeDismissed = [...from.dismissed].filter(x => !to.dismissed.has(x));
        if (add.length > 0 || removeDismissed.length > 0) changes.dismissed = { add, remove: removeDismissed };

        return Object.keys(changes).length > 0 ? changes : null;
    }

    // Aplica um conjunto de alterações sobre um estado (mesma regra do servidor).
    function applyChanges(state, changes) {
        const result = { ...state };
        Object.keys(LIST_KEYS).forEach(name => {
            const c = changes[name];
            if (!c) return;
            const keyOf = LIST_KEYS[name];
            const removed = new Set(c.remove.map(keyOf));
            const upserts = new Map(c.upsert.map(item => [keyOf(item), item]));
            const kept = (state[name] || []).filter(item => !removed.has(keyOf(item))).map(item => {
                const key = keyOf(item);
                if (!upserts.has(key)) return item;
                const replacement = upserts.get(key);
                upserts.delete(key);
                return replacement;
            });
            // Histórico de resolvidas: os mais novos ficam na frente
            result[name] = name === 'resolved_history' ? [...upserts.values(), ...kept] : [...kept, ...upserts.values()];
        });
        if (changes.store_updates) {
            const updates = { ...(state.store_updates || {}) };
            changes.store_updates.remove.forEach(id => { delete updates[id]; });
            Object.assign(updates, changes.store_updates.set);
            result.store_updates = updates;
        }
        if (changes.dismissed) {
            const removed = new Set(changes.dismissed.remove);
            result.dismissed = [...new Set([...(state.dismissed || []).filter(x => !removed.has(x)), ...changes.dismissed.add])];
        }
        return result;
    }

    // Alterações que foram geradas mas ainda não confirmadas pelo servidor. Ficam gravadas
    // no navegador para serem reenviadas se a página for fechada antes da resposta.
    async function readOutbox() {
        try { return (await IndexedDBHelper.get(OUTBOX_KEY)) || null; } catch (e) { return null; }
    }

    async function writeOutbox(changes) {
        try { await IndexedDBHelper.set(OUTBOX_KEY, changes); } catch (e) { /* segue sem a cópia de segurança */ }
    }

    async function doSync(getLocalState) {
        let sent = null;
        let changes;
        if (_base) {
            sent = snapshot(getLocalState());
            changes = diff(_base, sent);
        } else {
            // Primeira sincronização desta página: reenvia o que ficou sem confirmar na vez anterior
            changes = await readOutbox();
        }

        let server;
        if (changes) {
            await writeOutbox(changes);
            server = await call('sync', { changes }, false, false);
        } else {
            if (_base) {
                const check = await call('version');
                if (!check || !check.ok) return null;
                if (check.version === _version) return null; // ninguém gravou nada desde a última vez
            }
            server = await call('load');
        }
        if (!server || !server.ok) return null;
        if (changes) await writeOutbox(null);

        _base = snapshot(server);
        _version = server.version;

        // O que o usuário alterou enquanto a resposta não chegava é reaplicado por cima
        const now = snapshot(getLocalState());
        const inFlight = sent ? diff(sent, now) : null;
        const state = inFlight ? applyChanges(server, inFlight) : server;
        const changed = diff(now, inFlight ? snapshot(state) : _base) !== null;
        return { state, changed, pending: inFlight !== null };
    }

    // Envia as alterações locais e busca as dos outros usuários.
    // getLocalState() devolve { visits, pedidos, validated_ruptures, resolved_history, store_updates, dismissed }.
    // Retorna null se não havia nada a fazer (ou se o servidor não respondeu), ou
    // { state, changed, pending }: o estado a adotar, se ele difere do que está na tela,
    // e se ficou alguma alteração local para a próxima rodada.
    // Uma sincronização por vez: as pedidas no meio do caminho entram em fila.
    function sync(getLocalState) {
        if (!isServer) return Promise.resolve(null);
        const run = _syncChain.then(() => doSync(getLocalState));
        _syncChain = run.catch(() => null);
        return run.catch(err => {
            console.warn('[Storage] Falha na sincronização:', err);
            return null;
        });
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

    // API pública
    return {
        isServer,
        onUnauthorized,
        checkSession,
        login,
        changePassword,
        listUsers,
        saveUser,
        deleteUser,
        loadAuditLog,
        logEvent,
        logout,
        sync,
        uploadPhoto,
        deleteVisitPhotos,
    };

})();




