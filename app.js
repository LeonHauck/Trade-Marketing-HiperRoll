
// App State â€” STORES_DATA sempre vem do data.js (nunca salvo completo no localStorage)
// Apenas atualizações leves (lastVisit, currentStatus) são persistidas em hr_store_updates
// Fallbacks seguros caso o data.js falhe ao carregar
if (typeof PRODUCTS_DATA === 'undefined') {
    window.PRODUCTS_DATA = [];
    console.warn("PRODUCTS_DATA não encontrado. data.js falhou ao carregar?");
}
if (typeof STORES_DATA === 'undefined') {
    window.STORES_DATA = [];
    console.warn("STORES_DATA não encontrado. data.js falhou ao carregar?");
}

// Debounce utils
let debounceTimeout_renderReportsTable;
window.debouncedRenderReportsTable = function() {
    clearTimeout(debounceTimeout_renderReportsTable);
    debounceTimeout_renderReportsTable = setTimeout(renderReportsTable, 300);
};

let debounceTimeout_renderHistoryViewData;
window.debouncedRenderHistoryViewData = function() {
    clearTimeout(debounceTimeout_renderHistoryViewData);
    debounceTimeout_renderHistoryViewData = setTimeout(renderHistoryViewData, 300);
};

let debounceTimeout_filterRupturesByStore;
window.debouncedFilterRupturesByStore = function() {
    clearTimeout(debounceTimeout_filterRupturesByStore);
    debounceTimeout_filterRupturesByStore = setTimeout(filterRupturesByStore, 300);
};

function generateStableId(network, name) {
    const raw = (network || 'Geral') + '-' + (name || '');
    return String(raw)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function loadDataOverrides() {
    try {
        return JSON.parse(localStorage.getItem('hr_data_overrides') || 'null');
    } catch (e) {
        return null;
    }
}

function persistDataOverrides(mergedStores, mergedProducts) {
    try {
        IndexedDBHelper.set('hr_data_overrides', {
            stores: mergedStores,
            products: mergedProducts
        });
    } catch (e) {
        console.warn('Falha ao salvar overrides de dados:', e);
    }
}

function mergeDataCollections(baseProducts, baseStores, incomingProducts, incomingStores) {
    const mergedProducts = Array.isArray(baseProducts) ? [...baseProducts] : [];
    const mergedStores = Array.isArray(baseStores)
        ? baseStores.map(s => ({ ...s, productIds: Array.isArray(s.productIds) ? [...s.productIds] : [] }))
        : [];

    const productIndex = new Map();
    mergedProducts.forEach(product => {
        if (product && product.name) {
            productIndex.set(normalizeText(product.name), product);
        }
    });

    (incomingProducts || []).forEach(product => {
        const key = normalizeText(product.name);
        const existingProduct = productIndex.get(key);

        if (existingProduct) {
            if (product.network && !existingProduct.network) existingProduct.network = product.network;
            if (product.status && !existingProduct.status) existingProduct.status = product.status;
            return;
        }

        const nextId = generateStableId('', product.name);
        const newProduct = {
            id: nextId,
            name: product.name,
            network: product.network || 'Geral',
            status: product.status || 'Ativo'
        };
        mergedProducts.push(newProduct);
        productIndex.set(key, newProduct);
    });

    const storeIndex = new Map();
    mergedStores.forEach(store => {
        if (store && store.name) {
            storeIndex.set(normalizeText(store.name), store);
        }
    });

    (incomingStores || []).forEach(importedStore => {
        const key = normalizeText(importedStore.name);
        let store = storeIndex.get(key);

        if (!store) {
            const nextId = generateStableId(importedStore.network || 'Geral', importedStore.name);
            store = {
                id: nextId,
                name: importedStore.name,
                network: importedStore.network || 'Geral',
                lastVisit: null,
                status: 'pending',
                productIds: []
            };
            mergedStores.push(store);
            storeIndex.set(key, store);
        }

        if (importedStore.network && !store.network) {
            store.network = importedStore.network;
        }

        const productNames = Array.isArray(importedStore.productNames) ? importedStore.productNames : [];
        const productIds = Array.isArray(importedStore.productIds) ? importedStore.productIds : [];

        [...productIds, ...productNames].forEach(item => {
            if (typeof item === 'number') {
                if (!store.productIds.includes(item)) store.productIds.push(item);
                return;
            }

            const product = productIndex.get(normalizeText(item));
            if (product && !store.productIds.includes(product.id)) {
                store.productIds.push(product.id);
            }
        });
    });

    return { products: mergedProducts, stores: mergedStores };
}

const persistedDataOverrides = loadDataOverrides();
const initialData = persistedDataOverrides
    ? mergeDataCollections(PRODUCTS_DATA, STORES_DATA, persistedDataOverrides.products || [], persistedDataOverrides.stores || [])
    : { products: PRODUCTS_DATA, stores: STORES_DATA };

let products = initialData.products;

// Cache de fotos em memória (não persiste no localStorage e evita estouro)
// Mapa: { [visitId]: [base64, base64, ...] }
const photoCache = {};

let visits = [];
let dbLoaded = false;

// Índice loja -> suas visitas (ordenadas da mais recente para a mais antiga).
// Construído sob demanda e reaproveitado entre telas: evita varrer o array
// inteiro de visitas para cada uma das lojas toda vez que uma tela é (re)desenhada.
let _visitsByStoreIndex = null;

function invalidateVisitsIndex() {
    _visitsByStoreIndex = null;
}

function getVisitsByStoreIndex() {
    if (_visitsByStoreIndex) return _visitsByStoreIndex;
    const map = new Map();
    for (const v of visits) {
        let arr = map.get(v.storeId);
        if (!arr) { arr = []; map.set(v.storeId, arr); }
        arr.push(v);
    }
    for (const arr of map.values()) {
        arr.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    _visitsByStoreIndex = map;
    return map;
}

// Visitas de uma loja, já ordenadas da mais recente para a mais antiga.
function getStoreVisitsIndexed(storeId) {
    return getVisitsByStoreIndex().get(storeId) || [];
}

let validatedRuptures = [];
let dismissedNotifications = [];
let resolvedRupturesHistory = [];
let historyBackfillNotice = '';
let routePlans = []; // planos de rota semanal (aba "Rotas") — persistência local, sem sync com servidor

// Funções auxiliares para o padrão de atualizações leves de lojas
async function loadStoreUpdates() {
    return (await IndexedDBHelper.get('hr_store_updates')) || {};
}

async function saveStoreUpdates() {
    const updates = {};
    stores.forEach(s => {
        if (s.lastVisit || s.currentStatus) {
            updates[s.id] = { lastVisit: s.lastVisit || null, currentStatus: s.currentStatus || 'pending' };
        }
    });
    try {
        await IndexedDBHelper.set('hr_store_updates', updates);
    } catch(e) {
        console.warn('Falha ao salvar atualizações de lojas:', e);
    }
}

// Aplica as coordenadas geocodificadas (store-geo.js) sobre um registro de loja,
// seguindo o mesmo padrão de "overlay" já usado para lastVisit/currentStatus.
function applyStoreGeo(store) {
    const geo = (typeof STORE_GEO_DATA !== 'undefined') ? STORE_GEO_DATA[store.id] : null;
    return geo ? { ...store, address: geo.address, lat: geo.lat, lng: geo.lng } : store;
}

async function saveAppStateLocally() {
    await saveStoreUpdates();
    try {
        await IndexedDBHelper.set('hr_visits', visits);
        await IndexedDBHelper.set('hr_validated_ruptures', validatedRuptures);
        await IndexedDBHelper.set('hr_dismissed', dismissedNotifications);
        await IndexedDBHelper.set('hr_resolved_ruptures_history', resolvedRupturesHistory);
        await IndexedDBHelper.set('hr_route_plans', routePlans);
    } catch (e) {
        console.warn('Falha ao salvar estado local:', e);
    }
}

async function syncAppStateServer() {
    if (typeof Storage === 'undefined' || !Storage.isServer) return;
    const updatesMap = {};
    stores.forEach(s => {
        if (s.lastVisit || s.currentStatus) {
            updatesMap[s.id] = { lastVisit: s.lastVisit, currentStatus: s.currentStatus };
        }
    });

    try {
        await Storage.syncAll(visits, updatesMap, validatedRuptures, dismissedNotifications, resolvedRupturesHistory);
    } catch (err) {
        console.warn('[Storage] Falha ao sincronizar com servidor:', err);
    }
}

async function persistAppState() {
    saveAppStateLocally(); // fire and forget
    await syncAppStateServer();
}

let stores = [];

async function persistLocalStorageJson(key, value) {
    try {
        await IndexedDBHelper.set(key, value);
        return true;
    } catch (e) {
        return false;
    }
}

async function cleanPersistedDataForRemovedStores() {
    const existingStoreIds = new Set(stores.map(s => s.id));

    // SEGURANÇA: NÃO deletar visitas de lojas removidas para evitar perda de dados.
    // Apenas logar um aviso para auditoria.
    const orphanedVisits = visits.filter(v => !existingStoreIds.has(v.storeId));
    if (orphanedVisits.length > 0) {
        console.warn(`[SEGURANÇA] ${orphanedVisits.length} visitas pertencem a lojas não encontradas no data.js. Os dados foram PRESERVADOS.`);
        console.warn('[SEGURANÇA] IDs de lojas órfãs:', [...new Set(orphanedVisits.map(v => v.storeId))]);
    }

    // Limpar apenas rupturas validadas e resolvidas (dados menos críticos)
    const cleanedValidatedRuptures = validatedRuptures.filter(r => existingStoreIds.has(r.storeId));
    if (cleanedValidatedRuptures.length !== validatedRuptures.length) {
        validatedRuptures = cleanedValidatedRuptures;
        await persistLocalStorageJson('hr_validated_ruptures', validatedRuptures);
    }

    const storeUpdates = await loadStoreUpdates();
    const cleanedUpdates = Object.entries(storeUpdates).reduce((acc, [storeId, value]) => {
        if (existingStoreIds.has(storeId) || existingStoreIds.has(Number(storeId))) {
            acc[storeId] = value;
        }
        return acc;
    }, {});

    if (Object.keys(cleanedUpdates).length !== Object.keys(storeUpdates).length) {
        await persistLocalStorageJson('hr_store_updates', cleanedUpdates);
    }
}

async function initializeAppDatabase() {
    await IndexedDBHelper.init();
    await IndexedDBHelper.migrateFromLocalStorage();
    
    const rawVisits = (await IndexedDBHelper.get('hr_visits')) || [];
    let dirty = false;
    visits = rawVisits.map(v => {
        if (v.photos && v.photos.length > 0) {
            photoCache[v.id] = v.photos;
            dirty = true;
            return { ...v, photos: [] };
        }
        return v;
    });
    invalidateVisitsIndex();
    if (dirty) await persistLocalStorageJson('hr_visits', visits);

    validatedRuptures = (await IndexedDBHelper.get('hr_validated_ruptures')) || [];
    dismissedNotifications = (await IndexedDBHelper.get('hr_dismissed')) || [];
    resolvedRupturesHistory = (await IndexedDBHelper.get('hr_resolved_ruptures_history')) || [];
    routePlans = (await IndexedDBHelper.get('hr_route_plans')) || [];

    const _storeUpdates = await loadStoreUpdates();
    stores = (initialData.stores || []).map(s => applyStoreGeo(
        _storeUpdates[s.id]
            ? { ...s, lastVisit: _storeUpdates[s.id].lastVisit, currentStatus: _storeUpdates[s.id].currentStatus }
            : { ...s }
    ));

    await cleanPersistedDataForRemovedStores();
    dbLoaded = true;
}

function safeGetItem(key, def = null) {
    try { return localStorage.getItem(key) || def; } 
    catch(e) { return def; }
}

function safeSetItem(key, value) {
    try { localStorage.setItem(key, value); return true; } 
    catch(e) { return false; }
}

function safeRemoveItem(key) {
    try { localStorage.removeItem(key); } 
    catch(e) {}
}

// Limpa chave legada hr_stores se existir (libera espaço imediatamente)
if (safeGetItem('hr_stores')) {
    safeRemoveItem('hr_stores');
}
if (safeGetItem('hr_products')) {
    safeRemoveItem('hr_products');
}

// DOM Elements
const dashboardStoreList = document.getElementById('dashboardStoreList');
const activeRupturesCount = document.getElementById('activeRupturesCount');
const contentArea = document.getElementById('content-area');
const navItems = document.querySelectorAll('.nav-item');
const storeSelect = document.getElementById('storeSelect');
const productListChecklist = document.getElementById('productListChecklist');
const visitModal = document.getElementById('visitModal');
const addVisitBtn = document.getElementById('addVisitBtn');
const importBtn = document.getElementById('importBtn');
const spreadsheetInput = document.getElementById('spreadsheetInput');
const productSearch = document.getElementById('productSearch');
const visitForm = document.getElementById('visitForm');
const closeModal = document.querySelector('#visitModal .close-modal');
const globalSearch = document.getElementById('globalSearch');
const filterOverdueBtn = document.getElementById('filterOverdueBtn');
const globalStartDate = document.getElementById('globalStartDate');
const globalEndDate = document.getElementById('globalEndDate');
const globalNetworkSelect = document.getElementById('globalNetworkSelect');

// Funï¿½ï¿½o de Notificaï¿½ï¿½o Visual (Toast)
function showToast(message, type = 'success') {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            background: #27ae60;
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
            transform: translateY(100px);
            opacity: 0;
        `;
        document.body.appendChild(toast);
    }
    
    toast.style.background = type === 'success' ? '#27ae60' : '#e74c3c';
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i> ${message}`;
    
    // Mostrar
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    }, 10);
    
    // Esconder
    setTimeout(() => {
        toast.style.transform = 'translateY(100px)';
        toast.style.opacity = '0';
    }, 3000);
}


window.fixEncoding = function(str) {
    if (!str) return str;
    if (str !== '-' && str.length > 0) { var codes = []; for(var i=0;i<str.length;i++) codes.push(str.charCodeAt(i).toString(16)); console.log('fixEncoding input:', str, 'codes:', codes.join(',')); }
    var r = str;
    // Double-encoded UTF-8: prefix is char(0xC3)+char(0x192)+char(0xC2) then last byte
    var dblPfx = String.fromCharCode(0xC3,0x192,0xC2);
    var map = [[0xA3,0xE3],[0xA1,0xE1],[0xA9,0xE9],[0xAD,0xED],[0xB3,0xF3],[0xBA,0xFA],[0xA7,0xE7],[0xB5,0xF5],[0xA2,0xE2],[0xAA,0xEA],[0xB4,0xF4],[0xA0,0xE0]];
    map.forEach(function(m){var s=dblPfx+String.fromCharCode(m[0]);while(r.indexOf(s)!==-1)r=r.replace(s,String.fromCharCode(m[1]));});
    // Single-encoded UTF-8: prefix is char(0xC3) then second byte
    var sglPfx = String.fromCharCode(0xC3);
    map.forEach(function(m){var s=sglPfx+String.fromCharCode(m[0]);while(r.indexOf(s)!==-1)r=r.replace(s,String.fromCharCode(m[1]));});
    return r;
};
let currentGlobalFilter = '';
let showingOnlyOverdue = false;
let globalFilterDateStart = '';
let globalFilterDateEnd = '';
let globalFilterNetworks = []; // Vazio = Todas as Redes
// Redes a excluir da UI (por exemplo lojas removidas do cadastro mestre)
const EXCLUDED_NETWORKS = new Set(['ATACADAO SP']);
let currentPage = 'dashboard';
let reportFilterOnlyRuptures = false; // Filtro "Em Ruptura" na aba de Relatórios
let reportFilterOnlyObservation = false; // Filtro de visitas com observações na aba de Relatórios
let reportFilterOnlyExtraPoints = false; // Filtro de visitas com pontos extras na aba de Relatórios
let reportFilterOnlyExtraVisits = false; // Filtro de Visita Extra na aba de Relatórios
let historyFilterOnlyObservation = false; // Filtro de visitas com observações
let historyFilterOnlyExtraPoints = false; // Filtro de visitas com pontos extras
let historyFilterOnlyExtraVisits = false; // Filtro de Visita Extra
let editingVisitId = null; // null = nova visita | number = ID da visita sendo editada


window.populateGlobalNetworkFilter = function() {
    const container = document.getElementById('globalNetworkOptions');
    const textSpan = document.getElementById('globalSelectedNetworksText');
    if (!container) return;

    const nets = new Set(stores.map(s => s.network).filter(Boolean).filter(net => !EXCLUDED_NETWORKS.has(net)));
    container.innerHTML = '';
    
    Array.from(nets).sort().forEach(net => {
        const isChecked = globalFilterNetworks.includes(net) ? 'checked' : '';
        container.innerHTML += `
            <label style="display: flex; align-items: center; justify-content: flex-start; padding: 6px 4px; cursor: pointer; border-radius: 4px; width: 100%;">
                <input type="checkbox" value="${net}" ${isChecked} onchange="toggleGlobalNetwork('${net}')" style="margin-right: 8px; width: 15px; height: 15px; cursor: pointer; flex-shrink: 0;">
                <span style="text-align: left; color: var(--text-dark); font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${net}</span>
            </label>
        `;
    });
    
    updateGlobalNetworkText(textSpan);
};

window.toggleDropdown = function(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = (el.style.display === 'none' || !el.style.display) ? 'block' : 'none';
    }
};

window.toggleGlobalNetwork = function(net) {
    const idx = globalFilterNetworks.indexOf(net);
    if (idx > -1) {
        globalFilterNetworks.splice(idx, 1);
    } else {
        globalFilterNetworks.push(net);
    }
    
    const textSpan = document.getElementById('globalSelectedNetworksText');
    updateGlobalNetworkText(textSpan);
    refreshGlobalDashboard();
};

function updateGlobalNetworkText(spanEl) {
    if (!spanEl) return;
    if (globalFilterNetworks.length === 0) {
        spanEl.textContent = "Todas as Redes";
    } else if (globalFilterNetworks.length === 1) {
        spanEl.textContent = globalFilterNetworks[0];
    } else {
        spanEl.textContent = globalFilterNetworks.length + " Redes";
    }
}

async function hydrateResolvedHistoryFromVisits() {
    if (!Array.isArray(visits) || visits.length === 0) return false;

    // Rebuild the active rupture map from the latest visits.
    const latestVisitByStore = visits.reduce((acc, visit) => {
        if (!visit || !visit.storeId || !visit.date) return acc;
        const current = acc[visit.storeId];
        if (!current || new Date(visit.date) > new Date(current.date)) {
            acc[visit.storeId] = visit;
        }
        return acc;
    }, {});

    const activeKeys = new Set();
    Object.values(latestVisitByStore).forEach(visit => {
        (visit.ruptures || []).forEach(productId => {
            activeKeys.add(`${productId}:${visit.storeId}`);
        });
    });

    const sortedVisits = [...visits]
        .filter(v => Array.isArray(v.ruptures) && v.ruptures.length > 0)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    let addedToResolved = 0;
    let addedToActive = 0;
    let didCleanup = false;

    // Clean stale validated ruptures that no longer appear in the latest visit
    const validValidatedRuptures = validatedRuptures.filter(r => {
        const key = `${r.productId}:${r.storeId}`;
        const isValid = activeKeys.has(key);
        if (!isValid) didCleanup = true;
        return isValid;
    });
    if (didCleanup) {
        validatedRuptures = validValidatedRuptures;
    }

    sortedVisits.forEach(visit => {
        const store = stores.find(s => s.id === visit.storeId);
        (visit.ruptures || []).forEach(productId => {
            const key = `${productId}:${visit.storeId}`;
            const latestVisit = latestVisitByStore[visit.storeId];
            const latestVisitDate = latestVisit && latestVisit.date ? new Date(latestVisit.date) : null;
            const visitDateObj = visit.date ? new Date(visit.date) : null;
            const latestHasProduct = latestVisit && Array.isArray(latestVisit.ruptures)
                ? latestVisit.ruptures.includes(productId)
                : false;

            if (latestVisitDate && visitDateObj && latestVisitDate.getTime() > visitDateObj.getTime() && !latestHasProduct) {
                const alreadyExists = resolvedRupturesHistory.some(item =>
                    item.visitId === visit.id && item.productId === productId && item.storeId === visit.storeId
                );
                if (alreadyExists) return;

                const product = products.find(p => p.id === productId);
                const resolvedAt = latestVisit.date;
                const resolvedAtTime = new Date(`${resolvedAt}T12:00:00`).toLocaleString('pt-BR');

                resolvedRupturesHistory.unshift({
                    id: `backfill-${visit.id}-${productId}`,
                    productId,
                    productName: product ? product.name : 'Produto',
                    storeId: visit.storeId,
                    storeName: store ? store.name : 'Loja',
                    network: store ? store.network : '',
                    visitId: visit.id,
                    visitDate: visit.date,
                    resolvedAt,
                    resolvedAtTime,
                    timestamp: new Date(`${resolvedAt}T12:00:00`).getTime()
                });
                addedToResolved += 1;
                didCleanup = true;
                return;
            }

            if (!latestVisit || (latestVisitDate && visitDateObj && latestVisitDate.getTime() === visitDateObj.getTime())) {
                // If this is the latest visit, and the rupture is active, ensure it exists.
                if (!activeKeys.has(key)) {
                    const product = products.find(p => p.id === productId);
                    validatedRuptures.push({
                        id: Date.now() + Math.random(),
                        productId,
                        productName: product ? product.name : 'Produto',
                        storeId: visit.storeId,
                        storeName: store ? store.name : 'Loja',
                        network: store ? store.network : '',
                        visitId: visit.id,
                        visitDate: visit.date,
                        timestamp: new Date().getTime()
                    });
                    activeKeys.add(key);
                    addedToActive += 1;
                    didCleanup = true;
                }
            }
        });
    });

    if (addedToResolved > 0 || addedToActive > 0 || didCleanup) {
        if (addedToActive > 0 || didCleanup) {
            saveAppStateLocally(); // fire and forget // Save the updated validated ruptures
        }
        if (addedToResolved > 0) {
            resolvedRupturesHistory = resolvedRupturesHistory.slice(0, 500);
            historyBackfillNotice = `Histórico antigo carregado: ${addedToResolved} rupturas enviadas para histórico resolvido.`;
        }
        persistAppState().then(() => {
            if (typeof renderHistoryViewData === 'function') {
                try { renderHistoryViewData(); } catch(e) {}
            }
        }).catch(err => {
            console.warn('[hydrateResolvedHistoryFromVisits] Falha ao persistir estado:', err);
        });
        return true;
    }
    return false;
}

// Initialize App
async function init() {
    await initializeAppDatabase();
    setupEventListeners();
    checkLoginStatus();
    populateGlobalNetworkFilter();
    checkLoginStatus();
    
    // Sincronizacao com o Servidor HostGator (se disponível)
    if (typeof Storage !== 'undefined' && Storage.isServer) {
        console.log("[Storage] Sincronizando com Servidor...");
        const serverData = await Storage.loadFromServer();
        if (serverData) {
            // Merge server state with local state to avoid overwriting local resolutions.
            if (serverData.visits) { visits = serverData.visits; invalidateVisitsIndex(); }

            // Build resolved keys from server and local resolved history
            const serverResolved = Array.isArray(serverData.resolved_history) ? serverData.resolved_history : [];
            const localResolved = Array.isArray(resolvedRupturesHistory) ? resolvedRupturesHistory : [];
            const resolvedKeys = new Set();
            serverResolved.concat(localResolved).forEach(item => {
                if (item && item.productId && item.storeId) resolvedKeys.add(`${item.productId}:${item.storeId}`);
            });

            // Merge validated ruptures but exclude those already resolved
            const serverValidated = Array.isArray(serverData.validated_ruptures) ? serverData.validated_ruptures : [];
            const localValidated = Array.isArray(validatedRuptures) ? validatedRuptures : [];
            const mergedMap = new Map();

            serverValidated.concat(localValidated).forEach(r => {
                if (!r || typeof r.productId === 'undefined' || typeof r.storeId === 'undefined') return;
                const key = `${r.productId}:${r.storeId}`;
                if (resolvedKeys.has(key)) return; // skip resolved
                if (!mergedMap.has(key)) mergedMap.set(key, r);
            });

            validatedRuptures = Array.from(mergedMap.values());

            // Merge resolved history preferring server then local (unique by visitId+productId+storeId)
            const histMap = new Map();
            serverResolved.concat(localResolved).forEach(h => {
                const k = `${h.visitId || h.id}:${h.productId}:${h.storeId}`;
                if (!histMap.has(k)) histMap.set(k, h);
            });
            resolvedRupturesHistory = Array.from(histMap.values()).slice(0, 500);

            if (serverData.dismissed) dismissedNotifications = serverData.dismissed;

            const sUpdates = serverData.store_updates || {};
            stores = STORES_DATA.map(s => {
                const upd = sUpdates[s.id];
                return applyStoreGeo(upd ? { ...s, lastVisit: upd.lastVisit, currentStatus: upd.currentStatus } : { ...s });
            });
            
            if (serverData.photo_map) {
                Object.keys(serverData.photo_map).forEach(vId => {
                    photoCache[vId] = serverData.photo_map[vId];
                });
            }

            // Persist merged local state so reloads use the merged result
            await persistLocalStorageJson('hr_validated_ruptures', validatedRuptures);
            await persistLocalStorageJson('hr_resolved_ruptures_history', resolvedRupturesHistory);
            await persistLocalStorageJson('hr_visits', visits);
        }
    }

    cleanPersistedDataForRemovedStores();
    hydrateResolvedHistoryFromVisits();

    checkOverdueStores();
    renderPage('dashboard');
    populateSelects();
    renderChecklist();
    updateStats();
    renderValidatedRuptures();
}

function checkLoginStatus() {
    const isLoggedIn = safeGetItem('hr_logged_in') === 'true';
    if (isLoggedIn) {
        document.body.classList.add('logged-in');
        document.body.classList.remove('not-logged-in');
    } else {
        document.body.classList.add('not-logged-in');
        document.body.classList.remove('logged-in');
    }
}

function checkOverdueStores() {
    const now = new Date();
    
    // Usar janela de 7 dias corridos (rolling window) ao invés de semana calendário
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    const visitsByStore = getVisitsByStoreIndex();

    stores.forEach(store => {
        if (!store.lastVisit) {
            store.currentStatus = 'pending';
            return;
        }

        const freq = store.frequency || 1; // visitas esperadas por semana

        // Contar quantas visitas essa loja teve nos últimos 7 dias
        // (usa o índice pré-agrupado por loja em vez de varrer todas as visitas do sistema)
        const storeVisits = visitsByStore.get(store.id) || [];
        const visitsLast7Days = storeVisits.filter(v => {
            const vDate = new Date(v.date + 'T12:00:00');
            return vDate >= sevenDaysAgo && vDate <= now;
        }).length;

        // Se a loja teve visitas suficientes nos últimos 7 dias → visitada
        if (visitsLast7Days >= freq) {
            store.currentStatus = 'visited';
        } else {
            store.currentStatus = 'overdue';
        }
    });
}

// ===================================================================
// ROTAS — priorização, geometria e montagem de rota (aba "Rotas")
// ===================================================================

const ROUTE_OVERDUE_WEIGHT = 0.6;
const ROUTE_RUPTURE_WEIGHT = 0.4;
const ROUTE_RUPTURE_SATURATION = 5; // a partir daqui o "peso" de ruptura satura em 1.0

const AVG_URBAN_SPEED_KMH = 28;  // velocidade média assumida para estimar deslocamento
const VISIT_BASE_MIN = 30;       // tempo fixo por visita: chegada, cumprimento, conferência inicial
const VISIT_PER_ITEM_MIN = 5;    // tempo adicional por item cadastrado na loja (conferência/reposição)
const DAILY_BUDGET_MIN = 8 * 60; // jornada de trabalho considerada (8h)
const ROUTE_DAY_START_MIN = 8 * 60; // rota do dia começa às 08:00
const ROUTE_SCHEDULING_THRESHOLD = 0.35; // score mínimo pra loja entrar na sugestão automática
const ROUTE_PLAN_LENGTH_DAYS = 6; // quantos dias corridos o plano cobre, a partir da data escolhida

// Nomes dos dias da semana em pt-BR, indexados por Date#getDay() (0=domingo).
// O plano de rota não é mais fixo em "sempre começa numa segunda": os dias são
// calculados a partir da data que o usuário escolher, então o rótulo de cada
// dia precisa ser derivado da data real, não de uma chave fixa mon/tue/wed.
const PT_WEEKDAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const PT_WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function weekdayLabelPtBR(dateStr) {
    return PT_WEEKDAY_NAMES[new Date(dateStr + 'T12:00:00').getDay()];
}

function weekdayShortLabelPtBR(dateStr) {
    return PT_WEEKDAY_SHORT[new Date(dateStr + 'T12:00:00').getDay()];
}

// Contagem de rupturas ativas por loja, pré-computada em uma única passada
// (mesmo espírito do índice de visitas: evita filtrar validatedRuptures inteiro por loja).
function countActiveRupturesByStore() {
    const map = new Map();
    for (const r of validatedRuptures) {
        map.set(r.storeId, (map.get(r.storeId) || 0) + 1);
    }
    return map;
}

/**
 * Score de prioridade de visita (0..1): combina atraso relativo à frequência
 * esperada com a pressão de rupturas ativas. Quanto maior, mais a loja precisa
 * de uma visita.
 */
function computeStorePriorityScore(store, activeRuptureCount, referenceDate) {
    const freq = store.frequency || 1;
    const idealIntervalDays = 7 / freq;
    const daysSinceLastVisit = store.lastVisit
        ? (referenceDate - new Date(store.lastVisit + 'T12:00:00')) / 86400000
        : idealIntervalDays * 3; // nunca visitada → trata como bem atrasada
    const overdueRatio = Math.min(3, Math.max(0, daysSinceLastVisit / idealIntervalDays)) / 3;
    const rupturePressure = Math.min(1, activeRuptureCount / ROUTE_RUPTURE_SATURATION);
    return ROUTE_OVERDUE_WEIGHT * overdueRatio + ROUTE_RUPTURE_WEIGHT * rupturePressure;
}

// Distância em linha reta entre duas coordenadas (km) — fórmula de Haversine.
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Tempo estimado de permanência na loja, em minutos: base fixa + tempo por item
// cadastrado (quanto mais itens a conferir/repor, mais tempo o promotor leva).
function estimateVisitDurationMin(store) {
    const itemCount = (store && Array.isArray(store.productIds)) ? store.productIds.length : 0;
    return VISIT_BASE_MIN + itemCount * VISIT_PER_ITEM_MIN;
}

// Tempo estimado de deslocamento entre duas lojas, em minutos (null se alguma não tem coordenada).
function travelTimeMin(storeA, storeB) {
    if (!storeA || !storeB || !storeA.lat || !storeA.lng || !storeB.lat || !storeB.lng) return null;
    const km = haversineKm(storeA.lat, storeA.lng, storeB.lat, storeB.lng);
    return (km / AVG_URBAN_SPEED_KMH) * 60;
}

// Duração total estimada de uma rota já ordenada (minutos): visitas + deslocamentos.
function routeTotalMinutes(orderedStores) {
    let total = orderedStores.reduce((sum, s) => sum + estimateVisitDurationMin(s), 0);
    for (let i = 1; i < orderedStores.length; i++) {
        total += travelTimeMin(orderedStores[i - 1], orderedStores[i]) || 0;
    }
    return total;
}

function routeDistanceKm(orderedStores) {
    let total = 0;
    for (let i = 1; i < orderedStores.length; i++) {
        const a = orderedStores[i - 1], b = orderedStores[i];
        if (a.lat && b.lat) total += haversineKm(a.lat, a.lng, b.lat, b.lng);
    }
    return total;
}

/**
 * Ordena um conjunto de lojas (todas precisam ter lat/lng) pela melhor rota
 * possível sem depender de API externa: constrói uma rota inicial pelo vizinho
 * mais próximo e refina com 2-opt (inverte trechos enquanto encurtar a distância).
 * Heurística — não é ótimo global, mas é suficiente para rotas de 10-20 lojas/dia.
 */
function buildOptimalRoute(storesToVisit, startingPoint = null) {
    const usable = storesToVisit.filter(s => s && s.lat && s.lng);
    if (usable.length <= 2) return usable;

    // 1. Construção inicial: vizinho mais próximo
    const unvisited = new Set(usable);
    let current = startingPoint && startingPoint.lat ? startingPoint : usable[0];
    if (unvisited.has(current)) unvisited.delete(current);
    const route = [current];
    while (unvisited.size > 0) {
        let nearest = null, nearestDist = Infinity;
        for (const s of unvisited) {
            const d = haversineKm(current.lat, current.lng, s.lat, s.lng);
            if (d < nearestDist) { nearestDist = d; nearest = s; }
        }
        route.push(nearest);
        unvisited.delete(nearest);
        current = nearest;
    }

    // 2. Melhoria local 2-opt
    const segDist = (i, j) => haversineKm(route[i].lat, route[i].lng, route[j].lat, route[j].lng);
    let improved = true;
    let iterations = 0;
    while (improved && iterations < 200) {
        improved = false;
        iterations++;
        for (let i = 1; i < route.length - 1; i++) {
            for (let j = i + 1; j < route.length; j++) {
                const before = segDist(i - 1, i) + (j + 1 < route.length ? segDist(j, j + 1) : 0);
                const after = segDist(i - 1, j) + (j + 1 < route.length ? segDist(i, j + 1) : 0);
                if (after < before - 1e-6) {
                    // inverte o trecho [i..j]
                    let lo = i, hi = j;
                    while (lo < hi) { [route[lo], route[hi]] = [route[hi], route[lo]]; lo++; hi--; }
                    improved = true;
                }
            }
        }
    }
    return route;
}

// Monta os "stops" de um dia (com horário estimado de chegada) a partir de uma
// rota já ordenada. scoreByStoreId é opcional (Map storeId -> score, usado no modo automático).
function buildDayStops(orderedStores, scoreByStoreId) {
    let clockMin = ROUTE_DAY_START_MIN;
    return orderedStores.map((store, idx) => {
        const travelFromPrevMin = idx === 0 ? 0 : Math.round(travelTimeMin(orderedStores[idx - 1], store) || 0);
        clockMin += travelFromPrevMin;
        const arrivalEstimateMin = clockMin;
        clockMin += estimateVisitDurationMin(store);
        return {
            storeId: store.id,
            order: idx,
            arrivalEstimateMin,
            travelFromPrevMin,
            priorityScore: scoreByStoreId ? (scoreByStoreId.get(store.id) ?? null) : null
        };
    });
}

function buildDayFromStores(orderedStores, dateStr, scoreByStoreId) {
    const stops = buildDayStops(orderedStores, scoreByStoreId);
    const totalDurationMin = Math.round(routeTotalMinutes(orderedStores));
    return { date: dateStr, stops, totalDurationMin, withinBudget: totalDurationMin <= DAILY_BUDGET_MIN };
}

function formatISODate(d) {
    return d.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return d;
}

/**
 * Gera uma sugestão automática de plano de rota cobrindo ROUTE_PLAN_LENGTH_DAYS
 * dias corridos a partir da data escolhida (qualquer dia da semana), priorizando
 * lojas atrasadas/com ruptura e agrupando geograficamente por dia, respeitando
 * o orçamento diário de tempo. Heurística gulosa — não é um otimizador global.
 */
function generateAutoWeekPlan(weekStartStr, promoterName, eligibleStores) {
    const referenceDate = new Date(weekStartStr + 'T12:00:00');
    const ruptureCounts = countActiveRupturesByStore();

    const scoreByStoreId = new Map();
    eligibleStores.forEach(s => {
        scoreByStoreId.set(s.id, computeStorePriorityScore(s, ruptureCounts.get(s.id) || 0, referenceDate));
    });

    // Quantas vezes cada loja "precisa" ser visitada nessa semana, conforme sua frequência,
    // mas só entra no plano se estiver de fato atrasada/com ruptura (score acima do piso)
    // ou se a frequência exigir mais de uma visita por semana.
    let pool = [];
    eligibleStores.forEach(store => {
        const score = scoreByStoreId.get(store.id);
        const freq = store.frequency || 1;
        if (score >= ROUTE_SCHEDULING_THRESHOLD || freq > 1) {
            const timesThisWeek = Math.max(1, Math.round(freq));
            for (let i = 0; i < timesThisWeek; i++) pool.push(store);
        }
    });
    pool.sort((a, b) => scoreByStoreId.get(b.id) - scoreByStoreId.get(a.id));

    const dayBuckets = Array.from({ length: ROUTE_PLAN_LENGTH_DAYS }, () => []);
    const unscheduled = [];

    pool.forEach(store => {
        let bestDayIdx = -1, bestProximity = Infinity;
        for (let i = 0; i < ROUTE_PLAN_LENGTH_DAYS; i++) {
            const bucket = dayBuckets[i];
            const currentTotal = routeTotalMinutes(bucket);
            const lastStop = bucket[bucket.length - 1];
            const projectedAdd = estimateVisitDurationMin(store) + (lastStop ? (travelTimeMin(lastStop, store) || 0) : 0);
            if (currentTotal + projectedAdd > DAILY_BUDGET_MIN) continue; // sem orçamento sobrando nesse dia
            const proximity = bucket.length
                ? Math.min(...bucket.map(s => haversineKm(s.lat, s.lng, store.lat, store.lng)))
                : 0; // dia vazio: custo zero pra "semear"
            if (proximity < bestProximity) { bestProximity = proximity; bestDayIdx = i; }
        }
        if (bestDayIdx > -1) dayBuckets[bestDayIdx].push(store);
        else unscheduled.push(store);
    });

    const days = dayBuckets.map((bucket, idx) => {
        const ordered = buildOptimalRoute(bucket);
        return buildDayFromStores(ordered, formatISODate(addDays(weekStartStr, idx)), scoreByStoreId);
    });

    return {
        id: 'route-' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        weekStart: weekStartStr,
        promoterName: promoterName || '',
        mode: 'auto',
        days,
        unscheduledStoreIds: unscheduled.map(s => s.id)
    };
}

// URL de rota multi-parada do Google Maps (sem chave de API).
function buildGoogleMapsUrl(orderedStops) {
    const usable = orderedStops.filter(s => s && s.lat && s.lng);
    if (usable.length === 0) return null;
    const coord = s => `${s.lat},${s.lng}`;
    const params = new URLSearchParams({
        api: '1',
        origin: coord(usable[0]),
        destination: coord(usable[usable.length - 1]),
        travelmode: 'driving'
    });
    const waypoints = usable.slice(1, -1).map(coord).join('|');
    if (waypoints) params.set('waypoints', waypoints);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
}

window.openRouteInGoogleMaps = function(planId, dayIndex) {
    const plan = routePlans.find(p => p.id === planId);
    const day = plan && plan.days ? plan.days[dayIndex] : null;
    if (!day || !day.stops || day.stops.length === 0) { alert('Nenhuma parada neste dia.'); return; }
    const orderedStores = [...day.stops]
        .sort((a, b) => a.order - b.order)
        .map(stop => stores.find(st => st.id === stop.storeId))
        .filter(s => s && s.lat && s.lng);
    const url = buildGoogleMapsUrl(orderedStores);
    if (!url) { alert('Nenhuma loja com coordenadas cadastradas neste dia ainda.'); return; }
    window.open(url, '_blank');
};

let selectedPhotos = [];

function setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    const visitPhotosInput = document.getElementById('visitPhotos');
    const photoPreviewContainer = document.getElementById('photoPreviewContainer');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (visitPhotosInput) {
        visitPhotosInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                try {
                    // Tenta comprimir a imagem para otimizar espaço no localStorage
                    const base64 = await compressImage(file);
                    selectedPhotos.push(base64);
                    
                    const preview = document.createElement('div');
                    preview.className = 'preview-item';
                    preview.innerHTML = `<img src="${base64}">`;
                    photoPreviewContainer.appendChild(preview);
                } catch (err) {
                    console.error("Erro ao comprimir imagem, usando original:", err);
                    const base64 = await convertToBase64(file);
                    selectedPhotos.push(base64);
                    
                    const preview = document.createElement('div');
                    preview.className = 'preview-item';
                    preview.innerHTML = `<img src="${base64}">`;
                    photoPreviewContainer.appendChild(preview);
                }
            }
        });
    }

    function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Mantém proporï¿½ï¿½o da imagem ao redimensionar
                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Converte para jpeg comprimido
                    const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedBase64);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    }

    function convertToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    addVisitBtn.addEventListener('click', () => visitModal.style.display = 'flex');
    importBtn.addEventListener('click', () => spreadsheetInput.click());

    // Garante reset do modo ediï¿½ï¿½o ao fechar o modal pelo "X"
    closeModal.addEventListener('click', () => {
        visitModal.style.display = 'none';
        productSearch.value = '';
        renderChecklist();
        _resetEditMode();
    });

    spreadsheetInput.addEventListener('change', handleImport);

    productSearch.addEventListener('input', (e) => {
        const selectedStoreId = storeSelect.value;
        const store = stores.find(s => s.id === selectedStoreId);
        renderChecklist(e.target.value, store ? store.productIds : null);
    });

    storeSelect.addEventListener('change', (e) => {
        const selectedStoreId = e.target.value;
        if (selectedStoreId) {
            const store = stores.find(s => s.id === selectedStoreId);
            renderChecklist(productSearch.value, store.productIds);
        } else {
            renderChecklist(productSearch.value);
        }
    });

    addVisitBtn.addEventListener('click', () => {
        _resetEditMode();
        visitModal.style.display = 'flex';
        document.getElementById('visitDate').valueAsDate = new Date();
    });

    globalSearch.addEventListener('input', (e) => {
        currentGlobalFilter = e.target.value.toLowerCase();
        refreshGlobalDashboard();
    });

    globalStartDate?.addEventListener('change', (e) => {
        globalFilterDateStart = e.target.value;
        refreshGlobalDashboard();
    });

    globalEndDate?.addEventListener('change', (e) => {
        globalFilterDateEnd = e.target.value;
        refreshGlobalDashboard();
    });

    window.refreshGlobalDashboard = function() {
        renderDashboard();
        updateStats();
        renderAttentionRanking();
        renderCriticalDelays();
        renderValidatedRuptures();
    };

    window.getGlobalFilteredRuptures = function() {
        // Começa excluindo rupturas de redes que não devem aparecer
        let filtered = validatedRuptures.filter(r => {
            const s = stores.find(s => s.id === r.storeId);
            return s && !EXCLUDED_NETWORKS.has(s.network);
        });

        // Filtra por data: usa a data da última visita é loja como referência
        if (globalFilterDateStart || globalFilterDateEnd) {
            filtered = filtered.filter(r => {
                const store = stores.find(s => s.id === r.storeId);
                const visitDate = store && store.lastVisit ? store.lastVisit : null;
                if (!visitDate) return false; // sem visita registrada ? não exibe
                if (globalFilterDateStart && visitDate < globalFilterDateStart) return false;
                if (globalFilterDateEnd && visitDate > globalFilterDateEnd) return false;
                return true;
            });
        }

        // Filtra por rede
        if (globalFilterNetworks.length > 0) {
            filtered = filtered.filter(r => {
                const s = stores.find(store => store.id === r.storeId);
                return s && globalFilterNetworks.includes(s.network);
            });
        }
        return filtered;
    };

    window.getGlobalFilteredVisits = function() {
        let filtered = visits;
        if (globalFilterDateStart) {
            filtered = filtered.filter(v => v.date >= globalFilterDateStart);
        }
        if (globalFilterDateEnd) {
            filtered = filtered.filter(v => v.date <= globalFilterDateEnd);
        }
        if (globalFilterNetworks.length > 0) {
            filtered = filtered.filter(v => {
                const s = stores.find(store => store.id === v.storeId);
                return s && globalFilterNetworks.includes(s.network);
            });
        }
        // Excluir visitas de redes removidas
        filtered = filtered.filter(v => {
            const s = stores.find(store => store.id === v.storeId);
            return s && !EXCLUDED_NETWORKS.has(s.network);
        });
        return filtered;
    };

    window.getGlobalFilteredStores = function() {
        // Começa excluindo redes que não devem aparecer na UI
        let filtered = stores.filter(s => !EXCLUDED_NETWORKS.has(s.network));
        if (globalFilterNetworks.length > 0) {
            filtered = filtered.filter(s => globalFilterNetworks.includes(s.network));
        }
        if (showingOnlyOverdue) {
            filtered = filtered.filter(s => s.currentStatus === 'overdue');
        }
        if (currentGlobalFilter) {
            filtered = filtered.filter(store => {
                const searchTerm = currentGlobalFilter.toLowerCase();
                const matchesStore = (store.name || '').toLowerCase().includes(searchTerm);
                const matchesNetwork = (store.network || '').toLowerCase().includes(searchTerm);
                const matchesProduct = store.productIds?.some(pId => {
                    const product = products.find(p => p.id === pId);
                    return product && (product.name || '').toLowerCase().includes(searchTerm);
                });
                return matchesStore || matchesNetwork || matchesProduct;
            });
        }
        return filtered;
    };

    filterOverdueBtn.addEventListener('click', () => {
        showingOnlyOverdue = !showingOnlyOverdue;
        filterOverdueBtn.classList.toggle('active');
        filterOverdueBtn.style.backgroundColor = showingOnlyOverdue ? 'var(--primary-red)' : '';
        filterOverdueBtn.style.color = showingOnlyOverdue ? 'white' : '';
        renderDashboard();
    });

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            renderPage(page);
        });
    });

    const notificationBtn = document.getElementById('notificationBtn');
    const notificationDropdown = document.getElementById('notificationDropdown');
    
    notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notificationDropdown.classList.toggle('active');
        updateNotifications();
    });

    window.addEventListener('click', () => {
        notificationDropdown.classList.remove('active');
    });

    notificationDropdown.addEventListener('click', (e) => e.stopPropagation());

    window.addEventListener('click', (e) => {
        if (e.target === visitModal) {
            visitModal.style.display = 'none';
            _resetEditMode();
        }
        if (e.target === document.getElementById('productDetailModal')) document.getElementById('productDetailModal').style.display = 'none';
        if (e.target === document.getElementById('reportsModal')) document.getElementById('reportsModal').style.display = 'none';
        if (e.target === document.getElementById('imageModal')) closeImageModal();
        if (e.target === document.getElementById('syncModal')) closeSyncModal();
        
        // Fechar dropdowns de rede se clicar fora
        const networkDropdown = document.getElementById('networkDropdown');
        if (networkDropdown && !networkDropdown.contains(e.target)) {
            const opts = document.getElementById('networkOptions');
            if (opts) opts.style.display = 'none';
        }
        
        const globalDropdown = document.getElementById('globalNetworkDropdown');
        if (globalDropdown && !globalDropdown.contains(e.target)) {
            const opts = document.getElementById('globalNetworkOptions');
            if (opts) opts.style.display = 'none';
        }
        
        // Fechar dropdowns da Gestão de Lojas
        const storeNetworkDropdown = document.getElementById('storeNetworkDropdownContainer');
        if (storeNetworkDropdown && !storeNetworkDropdown.contains(e.target)) {
            const opts = document.getElementById('storeNetworkOptions');
            if (opts) opts.style.display = 'none';
        }
        
        const storeStatusDropdown = document.getElementById('storeStatusDropdownContainer');
        if (storeStatusDropdown && !storeStatusDropdown.contains(e.target)) {
            const opts = document.getElementById('storeStatusOptions');
            if (opts) opts.style.display = 'none';
        }
    });

    visitForm.addEventListener('submit', handleVisitSubmit);

    // Sidebar navigation is fully handled by the navItems click listener above calling renderPage()
}

function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const text = event.target.result;
        processCSV(text);
    };
    reader.readAsText(file);
}

function processCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return;

    // Detectar delimitador (vírgula ou ponto e vírgula)
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';
    
    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase());
    
    // Identificar colunas (usando indexof e removendo possíveis acentos/espaços)
    const findCol = (names) => headers.findIndex(h => names.some(n => h.includes(n)));

    const colLoja = findCol(['loja', 'unidade', 'ponto']);
    const colItem = findCol(['item', 'produto', 'descri']);
    const colRede = findCol(['rede', 'bandeira', 'grupo']);
    const colStatus = findCol(['status', 'situa']);

    if (colLoja === -1 || colItem === -1) {
        alert('Não consegui identificar as colunas de "Loja" e "Item". Verifique o cabeçalho do arquivo.');
        return;
    }

    const newStores = [];
    const newProducts = [];
    const storeMap = new Map();
    const productMap = new Map();

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delimiter);
        
        const storeName = cols[colLoja]?.trim();
        const productName = cols[colItem]?.trim();
        const networkName = colRede !== -1 ? cols[colRede]?.trim() : 'Geral';
        const productStatus = colStatus !== -1 ? cols[colStatus]?.trim() : 'Ativo';
        const storeKey = normalizeText(storeName);
        const productKey = normalizeText(productName);

        if (storeName && !storeMap.has(storeKey)) {
            const id = generateStableId(networkName, storeName);
            const storeObj = { id, name: storeName, network: networkName, lastVisit: null, status: 'pending', productNames: [] };
            newStores.push(storeObj);
            storeMap.set(storeKey, storeObj);
        }

        if (productName && !productMap.has(productKey)) {
            const id = generateStableId('', productName);
            const prodObj = { id, name: productName, network: networkName, status: productStatus };
            newProducts.push(prodObj);
            productMap.set(productKey, prodObj);
        }
        
        // Link product to store (case insensitive)
        if (storeName && productName) {
            const sObj = storeMap.get(storeKey);
            const pObj = productMap.get(productKey);
            if (sObj && pObj && !sObj.productNames.includes(productName)) {
                sObj.productNames.push(productName);
            }
        }
    }

    if (newStores.length > 0 || newProducts.length > 0) {
        const mergedData = mergeDataCollections(products, stores, newProducts, newStores);
        products = mergedData.products;
        stores = mergedData.stores.map(s => {
            const updates = loadStoreUpdates();
            const upd = updates[s.id];
            return applyStoreGeo(upd ? { ...s, lastVisit: upd.lastVisit, currentStatus: upd.currentStatus } : { ...s });
        });

        persistDataOverrides(stores, products);
        saveStoreUpdates();
        IndexedDBHelper.set('hr_visits', visits);
        
        
        init();
        showToast(`Importação concluída. ${newStores.length} lojas e ${newProducts.length} produtos adicionados sem apagar o cadastro atual.`, 'success');
    }
}

function renderPage(page) {
    currentPage = page;
    
    window.reportsTableLimit = 50;
    window.historyVisitsLimit = 50;
    window.historyResolvedLimit = 50;
    
    // Reseta o filtro de ruptura ao sair dos relat\u00f3rios
    if (page !== 'reports' && reportFilterOnlyRuptures) {
        reportFilterOnlyRuptures = false;
    }

    // Update Sidebar UI
    navItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-page') === page);
    });

    if (page === 'dashboard') {
        renderDashboardView();
    } else if (page === 'reports') {
        renderReportsView();
    } else if (page === 'history') {
        renderHistoryView();
    } else if (page === 'stores') {
        checkOverdueStores();
        renderStoresListView();
    } else if (page === 'products') {
        renderProductsListView();
    } else if (page === 'routes') {
        checkOverdueStores();
        renderRoutesView();
    }
}

function renderDashboard() {
    const list = document.getElementById('dashboardStoreList');
    if (!list) return;
    list.innerHTML = '';
    
    const filteredStores = getGlobalFilteredStores();

    filteredStores.forEach(store => {
        const card = document.createElement('div');
        const eps = typeof getStoreLatestExtraPoints === 'function' ? getStoreLatestExtraPoints(store.id) : [];
        card.className = 'store-card' + (eps.length > 0 ? ' has-extra-point' : '');
        card.innerHTML = `
            <div class="status-indicator ${store.currentStatus || store.status}"></div>
            <div class="store-info">
                <p class="store-name">${store.name} <span class="network-tag">${store.network}</span></p>
                <p class="store-date">${store.lastVisit ? 'última visita: ' + formatDate(store.lastVisit) : 'Nunca visitada'}</p>
                ${eps.length > 0 ? `<div style="margin-top: 6px;">${eps.map(ep => `<span class="badge-extra-point">${ep}</span>`).join('')}</div>` : ''}
            </div>
            <div class="store-badge">
                ${renderStatusBadge(store)}
            </div>
            <button class="btn-icon" onclick="openVisitForStore('${store.id}')"><i class="fa-solid fa-chevron-right"></i></button>
        `;
        list.appendChild(card);
    });
}

function renderHistoryView() {
    contentArea.innerHTML = `
        <div class="panel">
            <div class="panel-header" style="display: block; margin-bottom: 20px;">
                <h2 style="margin-bottom: 8px;">Histórico Completo</h2>
                <p style="margin: 0 0 12px; color: var(--text-light);">Visitas registradas e rupturas já resolvidas para acompanhamento e compra futura.</p>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; flex-wrap: wrap;">
                    <div class="header-filters" style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap; flex: 1; min-width: 0;">
                        <div class="search-bar" style="width: 220px;">
                            <i class="fa-solid fa-magnifying-glass"></i>
                            <input type="text" id="historySearch" placeholder="Buscar loja ou item..." oninput="debouncedRenderHistoryViewData()">
                        </div>
                        <div class="filter-select" style="display: flex; gap: 8px; align-items: center; padding: 0 15px; height: 42px; background: white; border: 1px solid #eee; border-radius: 12px;">
                            <i class="fa-regular fa-calendar" style="color: var(--text-light); font-size: 0.9rem;"></i>
                            <input type="date" id="historyStartDate" class="hide-calendar-icon" onchange="renderHistoryViewData()" title="Data Inicial" style="border: none; padding: 0; outline: none; background: transparent; cursor: pointer; color: var(--text-dark); font-family: 'Outfit', sans-serif; font-size: 0.9rem;" onclick="this.showPicker()">
                            <span style="color: var(--text-light); font-size: 0.85rem;">até</span>
                            <input type="date" id="historyEndDate" class="hide-calendar-icon" onchange="renderHistoryViewData()" title="Data Final" style="border: none; padding: 0; outline: none; background: transparent; cursor: pointer; color: var(--text-dark); font-family: 'Outfit', sans-serif; font-size: 0.9rem;" onclick="this.showPicker()">
                        </div>
                        <div class="custom-multiselect" style="position: relative; min-width: 220px;">
                            <button id="historyNetworkFilterBtn" class="filter-select" onclick="toggleDropdown('historyNetworkDropdown')" style="width: 100%; text-align: left; display: flex; justify-content: space-between; align-items: center; background: white; cursor: pointer; height: 42px; padding: 0 15px;">
                                <span id="historyNetworkFilterLabel" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Todas as Redes</span>
                                <i class="fa-solid fa-chevron-down" style="font-size: 0.8rem; color: var(--text-light); margin-left: 10px;"></i>
                            </button>
                            <div id="historyNetworkDropdown" style="display: none; position: absolute; top: calc(100% + 5px); left: 0; right: 0; background: white; border: 1px solid var(--border); border-radius: 6px; z-index: 100; max-height: 280px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 8px;">
                                <label style="display: flex; align-items: center; padding: 6px 4px; cursor: pointer; border-bottom: 1px solid #eee; margin-bottom: 4px;">
                                    <input type="checkbox" id="historySelectAllNetworks" checked onchange="toggleAllHistoryNetworks(this);" style="margin-right: 8px; width: 16px; height: 16px; cursor: pointer;">
                                    <strong style="color: var(--text-dark);">Todas as Redes</strong>
                                </label>
                                ${[...new Set(stores.map(s => s.network).filter(Boolean).filter(net => !EXCLUDED_NETWORKS.has(net)))].sort().map(net => `
                                    <label style="display: flex; align-items: center; padding: 6px 4px; cursor: pointer; border-radius: 4px;">
                                        <input type="checkbox" class="history-network-checkbox" value="${net}" checked onchange="toggleHistoryNetworkSelection('${net}'); renderHistoryViewData();" style="margin-right: 8px; width: 15px; height: 15px; cursor: pointer;">
                                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-dark); font-size: 0.9rem;">${net}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        <div class="custom-multiselect" style="position: relative; min-width: 220px;">
                            <button id="historyProductFilterBtn" class="filter-select" onclick="toggleDropdown('historyProductDropdown')" style="width: 100%; text-align: left; display: flex; justify-content: space-between; align-items: center; background: white; cursor: pointer; height: 42px; padding: 0 15px;">
                                <span id="historyProductFilterLabel" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Todos os Produtos</span>
                                <i class="fa-solid fa-chevron-down" style="font-size: 0.8rem; color: var(--text-light); margin-left: 10px;"></i>
                            </button>
                            <div id="historyProductDropdown" style="display: none; position: absolute; top: calc(100% + 5px); left: 0; right: 0; background: white; border: 1px solid var(--border); border-radius: 6px; z-index: 100; max-height: 280px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 8px;">
                                <label style="display: flex; align-items: center; padding: 6px 4px; cursor: pointer; border-bottom: 1px solid #eee; margin-bottom: 4px;">
                                    <input type="checkbox" id="historySelectAllProducts" checked onchange="toggleAllHistoryProducts(this);" style="margin-right: 8px; width: 16px; height: 16px; cursor: pointer;">
                                    <strong style="color: var(--text-dark);">Todos os Produtos</strong>
                                </label>
                                ${products.map(prod => `
                                    <label style="display: flex; align-items: center; padding: 6px 4px; cursor: pointer; border-radius: 4px;">
                                        <input type="checkbox" class="history-product-checkbox" value="${prod.id}" checked onchange="toggleHistoryProductSelection('${prod.id}'); renderHistoryViewData();" style="margin-right: 8px; width: 15px; height: 15px; cursor: pointer;">
                                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-dark); font-size: 0.9rem;">${prod.name}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        <button id="historyExtraPointsFilterBtn" onclick="toggleHistoryExtraPointsFilter()" class="filter-select" title="Mostrar apenas visitas com pontos extras" style="height: 42px; padding: 0 15px; display: flex; align-items: center; gap: 8px; cursor: pointer; background: white; border: 1px solid #eee; border-radius: 12px; font-family: 'Outfit', sans-serif; font-size: 0.9rem; color: var(--text-dark); transition: background 0.2s, color 0.2s, border-color 0.2s; white-space: nowrap;">
                            <i class="fa-solid fa-star"></i>
                            <span>Com ponto extra</span>
                        </button>
                        <button id="historyObservationFilterBtn" onclick="toggleHistoryObservationFilter()" class="filter-select" title="Mostrar apenas visitas com observações" style="height: 42px; padding: 0 15px; display: flex; align-items: center; gap: 8px; cursor: pointer; background: white; border: 1px solid #eee; border-radius: 12px; font-family: 'Outfit', sans-serif; font-size: 0.9rem; color: var(--text-dark); transition: background 0.2s, color 0.2s, border-color 0.2s; white-space: nowrap;">
                            <i class="fa-solid fa-comment-dots"></i>
                            <span>Com observação</span>
                        </button>
                        <button id="historyExtraVisitsFilterBtn" onclick="toggleHistoryExtraVisitsFilter()" class="filter-select" title="Mostrar apenas Visitas Extras" style="height: 42px; padding: 0 15px; display: flex; align-items: center; gap: 8px; cursor: pointer; background: white; border: 1px solid #eee; border-radius: 12px; font-family: 'Outfit', sans-serif; font-size: 0.9rem; color: var(--text-dark); transition: background 0.2s, color 0.2s, border-color 0.2s; white-space: nowrap;">
                            <i class="fa-solid fa-award"></i>
                            <span>Somente Visitas Extras</span>
                        </button>
                        <div class="filter-select" style="padding: 0 15px; height: 42px; background: white; border: 1px solid #eee; border-radius: 12px; display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-filter"></i>
                            <select id="historyStatusFilter" onchange="renderHistoryViewData()" style="border: none; background: transparent; outline: none; cursor: pointer;">
                                <option value="all">Todos</option>
                                <option value="resolved">Só resolvidos</option>
                                <option value="active">Não resolvidos</option>
                            </select>
                        </div>
                    </div>
                    <div class="header-actions" style="display: flex; gap: 15px; align-items: center; flex-shrink: 0; justify-content: flex-end;">
                        <button class="btn btn-secondary" onclick="exportHistoryCSV()"><i class="fa-solid fa-file-csv"></i> Exportar CSV</button>
                        <button class="btn btn-primary" onclick="exportHistoryPDF()"><i class="fa-solid fa-file-pdf"></i> Exportar PDF</button>
                    </div>
                </div>
            </div>
            <div class="reports-container" style="display: grid; gap: 24px;">
                <div id="historyBackfillNotice" style="display: none; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px; background: #eefbf2; color: #1f6f3f; border: 1px solid #c8e6c9; font-size: 0.9rem;"></div>
                <div>
                    <h3 style="margin-bottom: 10px;">Histórico de Visitas</h3>
                    <table class="reports-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Loja</th>
                                <th>Rede</th>
                                <th>Rupturas</th>
                                <th>Status da visita</th>
                                <th>Pontos Extras</th>
                                <th>Observações</th>
                            </tr>
                        </thead>
                        <tbody id="historyVisitsTableBody"></tbody>
                    </table>
                </div>
                <div>
                    <h3 style="margin-bottom: 10px;">Rupturas Resolvidas</h3>
                    <table class="reports-table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Loja</th>
                                <th>Visita</th>
                                <th>Resolvido em</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="historyResolvedTableBody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    updateHistoryFilterLabels();
    renderHistoryViewData();
}

function renderReportsView() {
    contentArea.innerHTML = `
        <div class="panel">
            <div class="panel-header" style="display: block; margin-bottom: 20px;">
                <h2 style="margin-bottom: 15px;">Histórico de Visitas (Relatórios)</h2>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; flex-wrap: wrap;">
                    <div class="header-filters" style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap; flex: 1; min-width: 0;">
                        <div class="search-bar" style="width: 200px;">
                            <i class="fa-solid fa-magnifying-glass"></i>
                            <input type="text" id="reportSearch" placeholder="Buscar loja ou item..." oninput="debouncedRenderReportsTable()">
                        </div>
                        <div class="filter-select" style="display: flex; gap: 8px; align-items: center; padding: 0 15px; height: 42px; background: white; border: 1px solid #eee; border-radius: 12px; font-family: 'Outfit', sans-serif;">
                            <i class="fa-regular fa-calendar" style="color: var(--text-light); font-size: 0.9rem;"></i>
                            <input type="date" id="reportStartDate" class="hide-calendar-icon" onchange="renderReportsTable()" title="Data Inicial" style="border: none; padding: 0; outline: none; background: transparent; cursor: pointer; color: var(--text-dark); font-family: 'Outfit', sans-serif; font-size: 0.9rem;" onclick="this.showPicker()">
                            <span style="color: var(--text-light); font-size: 0.85rem;">até</span>
                            <input type="date" id="reportEndDate" class="hide-calendar-icon" onchange="renderReportsTable()" title="Data Final" style="border: none; padding: 0; outline: none; background: transparent; cursor: pointer; color: var(--text-dark); font-family: 'Outfit', sans-serif; font-size: 0.9rem;" onclick="this.showPicker()">
                        </div>
                        <div class="custom-multiselect" style="position: relative; width: 220px;">
                            <button id="networkFilterBtn" class="filter-select" onclick="toggleNetworkDropdown()" style="width: 100%; text-align: left; display: flex; justify-content: space-between; align-items: center; background: white; cursor: pointer; height: 42px; padding: 0 15px;">
                                <span id="networkFilterLabel" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Todas as Redes</span>
                                <i class="fa-solid fa-chevron-down" style="font-size: 0.8rem; color: var(--text-light); margin-left: 10px;"></i>
                            </button>
                            <div id="networkDropdown" style="display: none; position: absolute; top: calc(100% + 5px); left: 0; right: 0; background: white; border: 1px solid var(--border); border-radius: 6px; z-index: 100; max-height: 280px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 8px;">
                                <label style="display: flex; align-items: center; padding: 6px 4px; cursor: pointer; border-bottom: 1px solid #eee; margin-bottom: 4px;">
                                    <input type="checkbox" id="selectAllNetworks" checked onchange="toggleAllNetworks(this)" style="margin-right: 8px; width: 16px; height: 16px; cursor: pointer;">
                                    <strong style="color: var(--text-dark);">Todas as Redes</strong>
                                </label>
                                ${[...new Set(stores.map(s => s.network).filter(Boolean).filter(net => !EXCLUDED_NETWORKS.has(net)))].sort().map(net => `
                                    <label style="display: flex; align-items: center; padding: 6px 4px; cursor: pointer; border-radius: 4px;">
                                        <input type="checkbox" class="network-checkbox" value="${net}" checked onchange="updateNetworkFilterLabel()" style="margin-right: 8px; width: 15px; height: 15px; cursor: pointer;">
                                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-dark); font-size: 0.9rem;">${net}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        <button id="reportExtraPointsFilterBtn" onclick="toggleReportExtraPointsFilter()" class="filter-select" title="Mostrar apenas visitas com pontos extras" style="height: 42px; padding: 0 15px; display: flex; align-items: center; gap: 8px; cursor: pointer; background: white; border: 1px solid #eee; border-radius: 12px; font-family: 'Outfit', sans-serif; font-size: 0.9rem; color: var(--text-dark); transition: background 0.2s, color 0.2s, border-color 0.2s; white-space: nowrap;">
                            <i class="fa-solid fa-star"></i>
                            <span>Com ponto extra</span>
                        </button>
                        <button id="reportObservationFilterBtn" onclick="toggleReportObservationFilter()" class="filter-select" title="Mostrar apenas visitas com observações" style="height: 42px; padding: 0 15px; display: flex; align-items: center; gap: 8px; cursor: pointer; background: white; border: 1px solid #eee; border-radius: 12px; font-family: 'Outfit', sans-serif; font-size: 0.9rem; color: var(--text-dark); transition: background 0.2s, color 0.2s, border-color 0.2s; white-space: nowrap;">
                            <i class="fa-solid fa-comment-dots"></i>
                            <span>Com observação</span>
                        </button>
                        <button id="reportExtraVisitsFilterBtn" onclick="toggleReportExtraVisitsFilter()" class="filter-select" title="Mostrar apenas Visitas Extras" style="height: 42px; padding: 0 15px; display: flex; align-items: center; gap: 8px; cursor: pointer; background: white; border: 1px solid #eee; border-radius: 12px; font-family: 'Outfit', sans-serif; font-size: 0.9rem; color: var(--text-dark); transition: background 0.2s, color 0.2s, border-color 0.2s; white-space: nowrap;">
                            <i class="fa-solid fa-award"></i>
                            <span>Somente Visitas Extras</span>
                        </button>
                        <button
                            id="reportRuptureFilterBtn"
                            onclick="toggleRuptureFilter()"
                            class="filter-select"
                            title="Mostrar apenas lojas com ruptura nesta visita"
                            style="height: 42px; padding: 0 15px; display: flex; align-items: center; gap: 8px; cursor: pointer; background: white; border: 1px solid #eee; border-radius: 12px; font-family: 'Outfit', sans-serif; font-size: 0.9rem; color: var(--text-dark); transition: background 0.2s, color 0.2s, border-color 0.2s; white-space: nowrap;"
                        >
                            <i class="fa-solid fa-triangle-exclamation" style="font-size: 0.85rem;"></i>
                            Em Ruptura
                        </button>
                    </div>
                    <div class="header-actions" style="display: flex; gap: 15px; align-items: center; flex-shrink: 0; justify-content: flex-end;">
                        <button class="btn btn-secondary" onclick="exportVisitsCSV()">
                            <i class="fa-solid fa-file-csv"></i> Exportar CSV
                        </button>
                        <button class="btn btn-primary" onclick="exportVisitsPDF()">
                            <i class="fa-solid fa-file-pdf"></i> Exportar PDF
                        </button>
                        <button id="bulkDeleteBtn" class="btn btn-danger" style="display: none;" onclick="deleteSelectedVisits()">
                            <i class="fa-solid fa-trash"></i> Excluir Selecionados
                        </button>
                    </div>
                </div>
            </div>
            <div class="reports-container">
                <table class="reports-table">
                    <thead>
                        <tr>
                            <th><input type="checkbox" id="selectAllVisits" onclick="toggleSelectAll(this)"></th>
                            <th>Data</th>
                            <th>Loja</th>
                            <th>Rede</th>
                            <th>Rupturas</th>
                            <th>Fotos</th>
                            <th>Pontos Extras</th>
                            <th>Observações</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="reportsTableBody">
                        <!-- Visitas aqui -->
                    </tbody>
                </table>
            </div>
        </div>
    `;
    renderReportsTable();
}

function renderDashboardView() {
    contentArea.innerHTML = `
        <div class="dashboard-stats">
            <div class="stat-card">
                <div class="stat-icon red"><i class="fa-solid fa-store"></i></div>
                <div class="stat-details">
                    <h3>Lojas Totais</h3>
                    <p id="totalStores">${stores.length}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon blue"><i class="fa-solid fa-calendar-check"></i></div>
                <div class="stat-details">
                    <h3>Visitas no Período</h3>
                    <p id="totalVisits">${typeof getGlobalFilteredVisits === 'function' ? getGlobalFilteredVisits().length : visits.length}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <div class="stat-details">
                    <h3>Taxa de Ruptura</h3>
                    <p id="ruptureRate">${calculateRuptureRate()}%</p>
                </div>
            </div>
        </div>

        <div class="dashboard-grid">
            <!-- Linha 1: Operacional -->
            <div class="panel store-status">
                <div class="panel-header">
                    <h2>Status das Lojas</h2>
                </div>
                <div class="store-list" id="dashboardStoreList">
                    <!-- Injected by JS -->
                </div>
            </div>

            <div class="panel rupture-trends">
                <div class="panel-header">
                    <h2>Alerta de Produtos em Ruptura</h2>
                    <span class="badge-count" id="activeRupturesCount">${validatedRuptures.length}</span>
                </div>
                <div class="rupture-search-bar">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <input type="text" id="ruptureStoreSearch" placeholder="Pesquisar por loja..." oninput="debouncedFilterRupturesByStore()">
                </div>
                <div class="rupture-management-list" id="dashboardProductAlerts">
                    <!-- Injected by JS -->
                </div>
            </div>

            <!-- Linha 2: Estratégico (Compacto) -->
            <div class="panel ranking-panel" style="max-height: 300px; overflow-y: auto;">
                <div class="panel-header">
                    <h2>TOP 5: Atenção</h2>
                    <i class="fa-solid fa-ranking-star" style="color: var(--primary-red);"></i>
                </div>
                <div class="ranking-list" id="attentionRanking">
                    <!-- Injected by JS -->
                </div>
            </div>

            <div class="panel critical-delay-panel" style="max-height: 300px; overflow-y: auto;">
                <div class="panel-header">
                    <h2>Atraso Crítico (+14 dias)</h2>
                    <i class="fa-solid fa-triangle-exclamation" style="color: orange;"></i>
                </div>
                <div class="critical-list" id="criticalDelayList">
                    <!-- Injected by JS -->
                </div>
            </div>
        </div>
    `;
    
    // Re-link dynamic elements
    renderDashboard(); 
    renderValidatedRuptures();
    renderAttentionRanking();
    renderCriticalDelays();
}

function renderAttentionRanking() {
    const container = document.getElementById('attentionRanking');
    if (!container) return;
    container.innerHTML = '';

    const fVisits = typeof getGlobalFilteredVisits === 'function' ? getGlobalFilteredVisits() : visits;
    const fRuptures = typeof getGlobalFilteredRuptures === 'function' ? getGlobalFilteredRuptures() : validatedRuptures;

    // Se não houver visitas E não houver rupturas validadas no filtro, não mostra ranking
    if (fVisits.length === 0 && fRuptures.length === 0) {
        container.innerHTML = '<p class="empty-state" style="padding: 10px;">Aguardando dados para gerar ranking...</p>';
        return;
    }

    const now = new Date();
    const fStores = typeof getGlobalFilteredStores === 'function' ? getGlobalFilteredStores() : stores;
    const ranked = fStores.map(store => {
        const lastVisitDate = store.lastVisit ? new Date(store.lastVisit) : null;
        const daysSince = lastVisitDate ? Math.floor((now - lastVisitDate) / (1000 * 60 * 60 * 24)) : 0;
        const ruptureCount = fRuptures.filter(r => r.storeId === store.id).length;
        
        // Só gera score se tiver pelo menos um motivo de atenï¿½ï¿½o
        return {
            ...store,
            score: (ruptureCount * 5) + daysSince
        };
    }).filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);

    if (ranked.length === 0) {
        container.innerHTML = '<p class="empty-state" style="padding: 10px;">Nenhuma loja requer atenï¿½ï¿½o imediata.</p>';
        return;
    }

    ranked.forEach((store, index) => {
        const item = document.createElement('div');
        item.className = 'ranking-item';
        item.innerHTML = `
            <div class="rank-number">${index + 1}</div>
            <div class="rank-info">
                <strong>${store.name}</strong>
                <span>Score de Risco: ${store.score}</span>
            </div>
            <button class="btn-icon" onclick="openVisitForStore('${store.id}')"><i class="fa-solid fa-location-arrow"></i></button>
        `;
        container.appendChild(item);
    });
}

function renderCriticalDelays() {
    const container = document.getElementById('criticalDelayList');
    if (!container) return;
    container.innerHTML = '';

    const now = new Date();
    const fStores = typeof getGlobalFilteredStores === 'function' ? getGlobalFilteredStores() : stores;
    // Só entra no atraso crítico se já tiver sido visitada alguma vez (para ter um parâmetro)
    const critical = fStores.filter(store => {
        if (!store.lastVisit) return false; 
        const lastVisitDate = new Date(store.lastVisit);
        const daysSince = Math.floor((now - lastVisitDate) / (1000 * 60 * 60 * 24));
        return daysSince >= 14;
    }).sort((a, b) => {
        const dateA = new Date(a.lastVisit);
        const dateB = new Date(b.lastVisit);
        return dateA - dateB;
    });

    if (critical.length === 0) {
        container.innerHTML = '<p class="empty-state" style="padding: 10px;">Aguardando histórico de visitas...</p>';
        return;
    }

    critical.forEach(store => {
        const days = store.lastVisit ? Math.floor((now - new Date(store.lastVisit)) / (1000 * 60 * 60 * 24)) : '8';
        const item = document.createElement('div');
        item.className = 'critical-item';
        item.innerHTML = `
            <div class="critical-info">
                <strong>${store.name}</strong>
                <span>Sem visita há ${days} dias</span>
            </div>
            <i class="fa-solid fa-circle-exclamation" style="color: var(--primary-red);"></i>
        `;
        container.appendChild(item);
    });
}

function renderStoresListView() {
    const uniqueNetworks = [...new Set(stores.map(s => s.network))].filter(n => n).sort();
    let networkOptionsHtml = `
        <label style="display: flex; align-items: center; padding: 6px 4px; cursor: pointer; border-bottom: 1px solid #eee; margin-bottom: 4px;">
            <input type="checkbox" id="storeSelectAllNetworks" checked onchange="toggleAllStoreNetworks(this)" style="margin-right: 8px; width: 16px; height: 16px;"> 
            <span style="font-family: 'Outfit', sans-serif; font-size: 0.85rem;">Todas as Redes</span>
        </label>
    `;
    uniqueNetworks.forEach(net => {
        networkOptionsHtml += `
            <label style="display: flex; align-items: center; padding: 6px 4px; cursor: pointer;">
                <input type="checkbox" class="store-network-checkbox" value="${net}" checked onchange="updateStoreFilters()" style="margin-right: 8px; width: 16px; height: 16px;">
                <span style="font-family: 'Outfit', sans-serif; font-size: 0.85rem; color: var(--text-dark);">${net}</span>
            </label>
        `;
    });

    contentArea.innerHTML = `
        <div class="panel">
            <div class="panel-header" style="flex-direction: column; align-items: flex-start; gap: 15px;">
                <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <h2>Gestão de Lojas (<span id="storePageCount">${stores.length}</span>)</h2>
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <button class="btn btn-secondary btn-small" onclick="exportStoresCSV()"><i class="fa-solid fa-file-csv"></i> Exportar CSV</button>
                        <button class="btn btn-primary btn-small" onclick="exportStoresPDF()"><i class="fa-solid fa-file-pdf"></i> Exportar PDF</button>
                        <div class="search-bar" style="width: 250px;">
                            <i class="fa-solid fa-magnifying-glass"></i>
                            <input type="text" id="storePageSearch" placeholder="Buscar loja ou produto..." oninput="updateStoreFilters()">
                        </div>
                    </div>
                </div>
                
                <div class="store-filters" style="display: flex; gap: 15px; width: 100%; align-items: center; background: #f9f9f9; padding: 10px 15px; border-radius: 12px; border: 1px solid #eee; flex-wrap: wrap;">
                    
                    <!-- Network Filter -->
                    <div class="checkbox-dropdown filter-select" id="storeNetworkDropdownContainer" style="height: 40px; background: white; border: 1px solid #eee; border-radius: 8px; min-width: 180px; position: relative;">
                        <div class="dropdown-header" onclick="toggleDropdown('storeNetworkOptions')" style="height: 100%; display: flex; align-items: center; padding: 0 15px; cursor: pointer; justify-content: space-between;">
                            <span id="storeSelectedNetworksText" style="font-family: 'Outfit', sans-serif; font-size: 0.85rem; color: var(--text-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;">Todas as Redes</span>
                            <i class="fa-solid fa-chevron-down" style="color: var(--text-light); font-size: 0.8rem;"></i>
                        </div>
                        <div class="dropdown-options" id="storeNetworkOptions" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #eee; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); z-index: 1000; max-height: 250px; overflow-y: auto; padding: 10px;">
                            ${networkOptionsHtml}
                        </div>
                    </div>

                    <!-- Status Filter -->
                    <div class="checkbox-dropdown filter-select" id="storeStatusDropdownContainer" style="height: 40px; background: white; border: 1px solid #eee; border-radius: 8px; min-width: 180px; position: relative;">
                         <div class="dropdown-header" onclick="toggleDropdown('storeStatusOptions')" style="height: 100%; display: flex; align-items: center; padding: 0 15px; cursor: pointer; justify-content: space-between;">
                            <span id="storeSelectedStatusText" style="font-family: 'Outfit', sans-serif; font-size: 0.85rem; color: var(--text-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;">Todos os Status</span>
                            <i class="fa-solid fa-chevron-down" style="color: var(--text-light); font-size: 0.8rem;"></i>
                        </div>
                        <div class="dropdown-options" id="storeStatusOptions" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #eee; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); z-index: 1000; padding: 10px;">
                            <label style="display: flex; align-items: center; padding: 6px 4px; cursor: pointer; border-bottom: 1px solid #eee; margin-bottom: 4px;">
                                <input type="checkbox" id="storeSelectAllStatus" checked onchange="toggleAllStoreStatus(this)" style="margin-right: 8px; width: 16px; height: 16px;"> 
                                <span style="font-family: 'Outfit', sans-serif; font-size: 0.85rem;">Todos</span>
                            </label>
                            <label style="display: flex; align-items: center; padding: 6px 4px; cursor: pointer;">
                                <input type="checkbox" class="store-status-checkbox" value="visited" checked onchange="updateStoreFilters()" style="margin-right: 8px; width: 16px; height: 16px;"> 
                                <span class="status-indicator visited" style="margin-right: 5px; position: static;"></span> 
                                <span style="font-family: 'Outfit', sans-serif; font-size: 0.85rem; color: var(--text-dark);">Visitada</span>
                            </label>
                            <label style="display: flex; align-items: center; padding: 6px 4px; cursor: pointer;">
                                <input type="checkbox" class="store-status-checkbox" value="overdue" checked onchange="updateStoreFilters()" style="margin-right: 8px; width: 16px; height: 16px;"> 
                                <span class="status-indicator overdue" style="margin-right: 5px; position: static;"></span> 
                                <span style="font-family: 'Outfit', sans-serif; font-size: 0.85rem; color: var(--text-dark);">Em Atraso</span>
                            </label>
                            <label style="display: flex; align-items: center; padding: 6px 4px; cursor: pointer;">
                                <input type="checkbox" class="store-status-checkbox" value="pending" checked onchange="updateStoreFilters()" style="margin-right: 8px; width: 16px; height: 16px;"> 
                                <span class="status-indicator pending" style="margin-right: 5px; position: static;"></span> 
                                <span style="font-family: 'Outfit', sans-serif; font-size: 0.85rem; color: var(--text-dark);">Sem Visita/Nunca</span>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Date Filter -->
                    <div style="display: flex; align-items: center; gap: 8px; background: white; border: 1px solid #eee; border-radius: 8px; padding: 0 10px; height: 40px;">
                        <i class="fa-regular fa-calendar" style="color: var(--text-light); font-size: 0.85rem;"></i>
                        <input type="date" id="storeFilterStartDate" onchange="updateStoreFilters()" style="border: none; outline: none; font-family: 'Outfit', sans-serif; font-size: 0.85rem; color: var(--text-dark); background: transparent;">
                        <span style="color: var(--text-light); font-size: 0.85rem;">até</span>
                        <input type="date" id="storeFilterEndDate" onchange="updateStoreFilters()" style="border: none; outline: none; font-family: 'Outfit', sans-serif; font-size: 0.85rem; color: var(--text-dark); background: transparent;">
                    </div>
                    
                </div>
            </div>
            <div class="store-grid-full" id="storePageList">
                <!-- Injected by JS -->
            </div>
        </div>
    `;
    
    updateStoreFilters();
}

window.toggleAllStoreNetworks = function(master) {
    document.querySelectorAll('.store-network-checkbox').forEach(cb => cb.checked = master.checked);
    updateStoreFilters();
};

window.toggleAllStoreStatus = function(master) {
    document.querySelectorAll('.store-status-checkbox').forEach(cb => cb.checked = master.checked);
    updateStoreFilters();
};

window.updateStoreFilters = function() {
    // 1. Update Labels
    const netBoxes = document.querySelectorAll('.store-network-checkbox');
    const checkedNets = Array.from(netBoxes).filter(cb => cb.checked);
    const netLabel = document.getElementById('storeSelectedNetworksText');
    if (netLabel) {
        if (checkedNets.length === 0) netLabel.textContent = 'Nenhuma rede';
        else if (checkedNets.length === netBoxes.length) netLabel.textContent = 'Todas as Redes';
        else if (checkedNets.length === 1) netLabel.textContent = checkedNets[0].value;
        else netLabel.textContent = `${checkedNets.length} selecionadas`;
        
        const allNetBtn = document.getElementById('storeSelectAllNetworks');
        if (allNetBtn) allNetBtn.checked = (checkedNets.length === netBoxes.length);
    }

    const statusBoxes = document.querySelectorAll('.store-status-checkbox');
    const checkedStatus = Array.from(statusBoxes).filter(cb => cb.checked);
    const statusLabel = document.getElementById('storeSelectedStatusText');
    if (statusLabel) {
        if (checkedStatus.length === 0) statusLabel.textContent = 'Nenhum status';
        else if (checkedStatus.length === statusBoxes.length) statusLabel.textContent = 'Todos os Status';
        else if (checkedStatus.length === 1) statusLabel.textContent = checkedStatus[0].nextElementSibling.nextElementSibling.textContent.trim();
        else statusLabel.textContent = `${checkedStatus.length} selecionados`;

        const allStatusBtn = document.getElementById('storeSelectAllStatus');
        if (allStatusBtn) allStatusBtn.checked = (checkedStatus.length === statusBoxes.length);
    }

    renderStorePageItems();
};

function getStoreLatestExtraPoints(storeId) {
    const storeVisits = getStoreVisitsIndexed(storeId); // já ordenadas: mais recente primeiro
    if (storeVisits.length > 0) {
        return storeVisits[0].extraPoints || [];
    }
    return [];
}

// Período usado para calcular o status das lojas na tela "Gestão de Lojas": se o
// usuário não escolheu datas, usa os últimos 7 dias corridos até hoje (mesma janela
// rolante que checkOverdueStores() já usa pra definir o status "atual" das lojas —
// então sem filtro de data o resultado é idêntico ao status global de sempre). Se só
// uma ponta foi preenchida, a outra usa esse mesmo padrão de 7 dias / hoje.
function getStoreListPeriod() {
    const startDateVal = document.getElementById('storeFilterStartDate')?.value;
    const endDateVal = document.getElementById('storeFilterEndDate')?.value;

    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const periodEnd = endDateVal ? new Date(endDateVal + 'T23:59:59') : now;

    let periodStart;
    if (startDateVal) {
        periodStart = new Date(startDateVal + 'T00:00:00');
    } else {
        periodStart = new Date(periodEnd);
        periodStart.setDate(periodStart.getDate() - 7);
        periodStart.setHours(0, 0, 0, 0);
    }

    return { periodStart, periodEnd };
}

// Status da loja dentro de um período específico (em vez do status global "de hoje"):
// nunca visitada = pending; teve visitas suficientes (>= frequência) dentro do
// período = visited; teve histórico mas não o suficiente nesse período = overdue.
// Mesma lógica de checkOverdueStores(), só que parametrizada pelo período em vez de
// fixa nos últimos 7 dias a partir de agora.
function computeStorePeriodStatus(store, periodStart, periodEnd) {
    if (!store.lastVisit) return 'pending';
    const freq = store.frequency || 1;
    const visitsInPeriod = getStoreVisitsIndexed(store.id).filter(v => {
        const vDate = new Date(v.date + 'T12:00:00');
        return vDate >= periodStart && vDate <= periodEnd;
    }).length;
    return visitsInPeriod >= freq ? 'visited' : 'overdue';
}

function getFilteredStoresList() {
    const searchInput = document.getElementById('storePageSearch');
    const filterText = searchInput ? searchInput.value.toLowerCase() : '';

    const netCheckboxes = document.querySelectorAll('.store-network-checkbox:checked');
    const checkedNets = Array.from(netCheckboxes).map(cb => cb.value);
    const statusCheckboxes = document.querySelectorAll('.store-status-checkbox:checked');
    const checkedStatus = Array.from(statusCheckboxes).map(cb => cb.value);

    const { periodStart, periodEnd } = getStoreListPeriod();

    return stores.filter(s => {
        // Search Filter
        const matchesSearch = (s.name || '').toLowerCase().includes(filterText) || (s.network || '').toLowerCase().includes(filterText);
        if (!matchesSearch) return false;

        // Network Filter
        if (checkedNets.length > 0 && !checkedNets.includes(s.network)) return false;
        if (checkedNets.length === 0) return false;

        // Status Filter — calculado dentro do período selecionado (ou dos últimos
        // 7 dias, se nenhuma data foi escolhida), não mais o status global da loja.
        const sStatus = computeStorePeriodStatus(s, periodStart, periodEnd);
        if (checkedStatus.length > 0 && !checkedStatus.includes(sStatus)) return false;
        if (checkedStatus.length === 0) return false;

        return true;
    });
}

function renderStorePageItems() {
    const container = document.getElementById('storePageList');
    if (!container) return;

    container.innerHTML = '';

    const filtered = getFilteredStoresList();
    const { periodStart, periodEnd } = getStoreListPeriod();

    const storePageCount = document.getElementById('storePageCount');
    if (storePageCount) storePageCount.textContent = filtered.length;

    filtered.forEach(store => {
        const item = document.createElement('div');
        const eps = getStoreLatestExtraPoints(store.id);
        const periodStatus = computeStorePeriodStatus(store, periodStart, periodEnd);
        item.className = 'store-card-full' + (eps.length > 0 ? ' has-extra-point' : '');
        item.innerHTML = `
            <div class="store-main-info">
                <span class="status-indicator ${periodStatus}"></span>
                <strong>${store.name}</strong>
                <span class="network-tag">${store.network}</span>
                ${eps.map(ep => `<span class="badge-extra-point">${ep}</span>`).join('')}
            </div>
            <div class="store-meta">
                <span>Frequência: ${store.frequency || 1}x/sem</span>
                <button class="btn btn-secondary btn-small" onclick="openVisitForStore('${store.id}')">Visitar</button>
            </div>
        `;
        container.appendChild(item);
    });
}

// ===================================================================
// ROTAS — view principal, montagem manual/automática, exportação
// ===================================================================

function formatMinutesAsClock(totalMin) {
    const h = Math.floor(totalMin / 60) % 24;
    const m = Math.round(totalMin % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDurationHuman(totalMin) {
    const h = Math.floor(totalMin / 60);
    const m = Math.round(totalMin % 60);
    return h > 0 ? `${h}h${m > 0 ? ' ' + m + 'min' : ''}` : `${m}min`;
}

function renderRoutesView() {
    const geoCount = stores.filter(s => s.lat && s.lng).length;

    contentArea.innerHTML = `
        <div class="panel">
            <div class="panel-header" style="flex-wrap: wrap; gap: 12px;">
                <h2>Planejamento de Rotas</h2>
                <div style="display:flex; align-items:center; gap:12px; flex-wrap: wrap;">
                    <span class="route-geo-coverage"><i class="fa-solid fa-location-dot"></i> ${geoCount} de ${stores.length} lojas com coordenadas</span>
                    <button class="btn btn-primary" onclick="openRouteBuilder('auto')"><i class="fa-solid fa-plus"></i> Novo Plano Semanal</button>
                </div>
            </div>
            <div id="routePlanListArea" class="route-plan-list"></div>
        </div>
        <div id="routeWeekViewArea"></div>
    `;

    renderRoutePlanList();
}

function renderRoutePlanList() {
    const area = document.getElementById('routePlanListArea');
    if (!area) return;

    if (!routePlans || routePlans.length === 0) {
        area.innerHTML = `<p class="empty-state">Nenhum plano de rota criado ainda. Clique em "Novo Plano Semanal" para começar.</p>`;
        return;
    }

    const sorted = [...routePlans].sort((a, b) => (b.weekStart || '').localeCompare(a.weekStart || ''));
    area.innerHTML = sorted.map(plan => {
        const storeCount = (plan.days || []).reduce((acc, day) => acc + (day && day.stops ? day.stops.length : 0), 0);
        return `
            <div class="route-plan-card">
                <div>
                    <strong>Semana de ${formatDate(plan.weekStart)}</strong>
                    <div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 2px;">
                        ${plan.promoterName ? `Promotor: ${plan.promoterName} · ` : ''}${storeCount} paradas · ${plan.mode === 'auto' ? 'Sugestão automática' : 'Montagem manual'}
                    </div>
                </div>
                <div style="display:flex; gap:8px; flex-wrap: wrap;">
                    <button class="btn btn-secondary btn-small" onclick="openRoutePlan('${plan.id}')"><i class="fa-solid fa-eye"></i> Abrir</button>
                    <button class="btn btn-secondary btn-small" onclick="exportWeeklyRoutePDF('${plan.id}')"><i class="fa-solid fa-file-pdf"></i> Exportar PDF</button>
                    <button class="btn-icon text-red" title="Excluir plano" onclick="deleteRoutePlan('${plan.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

window.deleteRoutePlan = function(planId) {
    if (!confirm('Excluir este plano de rota permanentemente?')) return;
    routePlans = routePlans.filter(p => p.id !== planId);
    saveAppStateLocally();
    const weekArea = document.getElementById('routeWeekViewArea');
    if (weekArea) weekArea.innerHTML = '';
    renderRoutePlanList();
};

window.openRoutePlan = function(planId) {
    const plan = routePlans.find(p => p.id === planId);
    if (!plan) return;
    const area = document.getElementById('routeWeekViewArea');
    if (!area) return;
    area.innerHTML = renderRouteWeekGridHtml(plan);
};

function renderRouteWeekGridHtml(plan) {
    const unscheduledNote = (plan.unscheduledStoreIds && plan.unscheduledStoreIds.length > 0)
        ? `<p style="color: var(--primary-red); font-size: 0.85rem; margin-top: 10px;"><i class="fa-solid fa-triangle-exclamation"></i> ${plan.unscheduledStoreIds.length} loja(s) não couberam no orçamento de tempo desta semana.</p>`
        : '';

    const dayCards = (plan.days || []).map((day, idx) => {
        if (!day) return '';
        const overBudget = !day.withinBudget;
        const stopsHtml = day.stops.length === 0
            ? `<p style="color: var(--text-muted); font-size: 0.8rem;">Sem paradas.</p>`
            : day.stops.map(stop => {
                const store = stores.find(s => s.id === stop.storeId);
                return `
                    <div class="route-stop">
                        <span class="route-stop-time">${formatMinutesAsClock(stop.arrivalEstimateMin)}</span>
                        <div class="route-stop-name">${store ? store.name : 'Loja removida'}</div>
                        <span class="route-stop-network">${store ? store.network : ''}</span>
                    </div>
                `;
            }).join('');

        return `
            <div class="route-day-card ${overBudget ? 'over-budget' : ''}">
                <div class="route-day-header">
                    <strong>${weekdayLabelPtBR(day.date)}</strong>
                    <span>${formatDate(day.date)}</span>
                </div>
                <div class="route-day-duration">${formatDurationHuman(day.totalDurationMin)} ${overBudget ? '· acima do orçamento' : ''}</div>
                <div>${stopsHtml}</div>
                ${day.stops.length > 0 ? `<button class="btn btn-secondary btn-small" onclick="openRouteInGoogleMaps('${plan.id}', ${idx})"><i class="fa-solid fa-map-location-dot"></i> Abrir no Google Maps</button>` : ''}
            </div>
        `;
    }).join('');

    return `
        <div class="panel" style="margin-top: 20px;">
            <div class="panel-header">
                <h2>Semana de ${formatDate(plan.weekStart)}${plan.promoterName ? ' — ' + plan.promoterName : ''}</h2>
                <button class="btn btn-secondary btn-small" onclick="document.getElementById('routeWeekViewArea').innerHTML=''">Fechar</button>
            </div>
            ${unscheduledNote}
            <div class="route-week-grid">${dayCards}</div>
        </div>
    `;
}

// ---------- Modal: novo plano (automático / manual) ----------

window.openRouteBuilder = function(mode) {
    window._routeManualDraftPlan = window._routeManualDraftPlan || null;
    window._routeManualOrder = [];
    const modal = document.getElementById('routeBuilderModal');
    if (!modal) return;
    modal.style.display = 'flex';
    switchRouteBuilderMode(mode || 'auto');
};

window.switchRouteBuilderMode = function(mode) {
    const body = document.getElementById('routeBuilderBody');
    if (!body) return;
    const toggle = `
        <div class="route-mode-toggle">
            <button class="btn ${mode === 'auto' ? 'btn-primary' : 'btn-secondary'}" onclick="switchRouteBuilderMode('auto')">Sugestão Automática</button>
            <button class="btn ${mode === 'manual' ? 'btn-primary' : 'btn-secondary'}" onclick="switchRouteBuilderMode('manual')">Montagem Manual</button>
        </div>
    `;
    body.innerHTML = toggle + (mode === 'auto' ? renderRouteBuilderAutoHtml() : renderRouteBuilderManualHtml());
};

function nextMondayISO() {
    const d = new Date();
    const day = d.getDay(); // 0=domingo
    const diff = (day === 0) ? 1 : (day === 1 ? 0 : 8 - day);
    d.setDate(d.getDate() + diff);
    return formatISODate(d);
}

function renderRouteBuilderAutoHtml() {
    const geoCount = stores.filter(s => s.lat && s.lng).length;
    const defaultStart = nextMondayISO();
    return `
        <div class="form-group">
            <label>Data de início do plano</label>
            <input type="date" id="routeAutoWeekStart" value="${defaultStart}" oninput="updateRouteAutoWeekdayHint()">
            <p id="routeAutoWeekdayHint" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">${weekdayLabelPtBR(defaultStart)} — o plano cobre ${ROUTE_PLAN_LENGTH_DAYS} dias corridos a partir desta data.</p>
        </div>
        <div class="form-group">
            <label>Promotor (opcional)</label>
            <input type="text" id="routeAutoPromoterName" placeholder="Nome do promotor">
        </div>
        ${geoCount === 0 ? `<p style="color: var(--primary-red); font-size: 0.85rem;">Nenhuma loja tem coordenadas cadastradas ainda — não é possível gerar sugestões.</p>` : ''}
        <div class="form-actions">
            <button class="btn btn-success" ${geoCount === 0 ? 'disabled' : ''} onclick="generateAndSaveAutoPlan()">Gerar e Salvar Plano</button>
        </div>
    `;
}

window.updateRouteAutoWeekdayHint = function() {
    const input = document.getElementById('routeAutoWeekStart');
    const hint = document.getElementById('routeAutoWeekdayHint');
    if (!input || !hint) return;
    if (!input.value) { hint.textContent = ''; return; }
    hint.textContent = `${weekdayLabelPtBR(input.value)} — o plano cobre ${ROUTE_PLAN_LENGTH_DAYS} dias corridos a partir desta data.`;
};

window.updateRouteManualWeekdayHint = function() {
    const input = document.getElementById('routeManualWeekStart');
    const hint = document.getElementById('routeManualWeekdayHint');
    if (!input || !hint) return;
    if (!input.value) { hint.textContent = ''; return; }
    hint.textContent = `${weekdayLabelPtBR(input.value)} — o plano cobre ${ROUTE_PLAN_LENGTH_DAYS} dias corridos a partir desta data.`;
};

window.generateAndSaveAutoPlan = function() {
    const weekStart = document.getElementById('routeAutoWeekStart').value;
    const promoterName = document.getElementById('routeAutoPromoterName').value.trim();
    if (!weekStart) { alert('Selecione a data de início do plano.'); return; }

    const eligibleStores = stores.filter(s => s.lat && s.lng);
    if (eligibleStores.length === 0) { alert('Nenhuma loja com coordenadas cadastradas ainda.'); return; }

    const plan = generateAutoWeekPlan(weekStart, promoterName, eligibleStores);
    routePlans.push(plan);
    saveAppStateLocally();

    document.getElementById('routeBuilderModal').style.display = 'none';
    renderRoutePlanList();
    window.openRoutePlan(plan.id);
};

function renderRouteBuilderManualHtml() {
    const uniqueNetworks = [...new Set(stores.map(s => s.network))].filter(n => n).sort();
    const networkOptions = `
        <label style="display: flex; align-items: center; padding: 6px 4px; cursor: pointer; border-bottom: 1px solid var(--border-color); margin-bottom: 4px;">
            <input type="checkbox" id="routeSelectAllNetworks" checked onchange="toggleAllRouteNetworks(this)" style="margin-right: 8px; width: 16px; height: 16px;">
            <strong style="font-family: 'Outfit', sans-serif; font-size: 0.85rem;">Todas as Redes</strong>
        </label>
    ` + uniqueNetworks.map(net => `
        <label style="display: flex; align-items: center; padding: 6px 4px; cursor: pointer;">
            <input type="checkbox" class="route-network-checkbox" value="${net}" checked onchange="updateRouteStoreChecklist()" style="margin-right: 8px; width: 16px; height: 16px;">
            <span style="font-family: 'Outfit', sans-serif; font-size: 0.85rem;">${net}</span>
        </label>
    `).join('');

    const storeRows = [...stores].sort((a, b) => a.name.localeCompare(b.name)).map(s => {
        const hasCoords = !!(s.lat && s.lng);
        return `
            <div class="route-store-checklist-row checklist-item ${hasCoords ? '' : 'no-coords'}" data-network="${s.network || ''}" data-name="${normalizeText(s.name)}">
                <input type="checkbox" id="routeStoreCb-${s.id}" class="route-store-checkbox" value="${s.id}" ${hasCoords ? '' : 'disabled'}>
                <label for="routeStoreCb-${s.id}">${s.name} <span style="color: var(--text-muted); font-size: 0.75rem;">(${s.network || ''})</span></label>
                ${hasCoords ? '' : '<span style="font-size: 0.7rem; color: var(--text-muted); flex-shrink: 0;" title="Sem coordenadas ainda">sem endereço</span>'}
            </div>
        `;
    }).join('');

    const manualDefaultStart = (window._routeManualDraftPlan && window._routeManualDraftPlan.weekStart) || nextMondayISO();
    const manualStartLocked = !!(window._routeManualDraftPlan && window._routeManualDraftPlan.weekStart);

    return `
        <div class="form-group">
            <label>Data de início do plano</label>
            <input type="date" id="routeManualWeekStart" value="${manualDefaultStart}" oninput="updateRouteManualWeekdayHint()" ${manualStartLocked ? 'disabled' : ''}>
            <p id="routeManualWeekdayHint" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">${weekdayLabelPtBR(manualDefaultStart)}${manualStartLocked ? ' — já travada, pois este plano já tem dias atribuídos' : ` — o plano cobre ${ROUTE_PLAN_LENGTH_DAYS} dias corridos a partir desta data`}.</p>
        </div>
        <div class="checkbox-dropdown filter-select" id="routeNetworkDropdownContainer" style="height: 40px; background: white; border: 1px solid var(--border-color); border-radius: 8px; min-width: 200px; position: relative; margin-bottom: 10px;">
            <div class="dropdown-header" onclick="toggleDropdown('routeNetworkOptions')" style="height: 100%; display: flex; align-items: center; padding: 0 15px; cursor: pointer; justify-content: space-between;">
                <span id="routeNetworkFilterLabel" style="font-family: 'Outfit', sans-serif; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;">Todas as Redes</span>
                <i class="fa-solid fa-chevron-down" style="font-size: 0.8rem;"></i>
            </div>
            <div class="dropdown-options" id="routeNetworkOptions" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid var(--border-color); border-radius: 8px; box-shadow: var(--shadow-lg); z-index: 1000; max-height: 220px; overflow-y: auto; padding: 10px;">
                ${networkOptions}
            </div>
        </div>
        <div class="search-bar" style="margin-bottom: 10px;">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="routeStoreSearch" placeholder="Buscar loja..." oninput="updateRouteStoreChecklist()">
        </div>
        <div class="product-checklist" id="routeStoreChecklist" style="height: 220px;">
            ${storeRows}
            <p id="routeStoreChecklistEmpty" class="empty-state" style="display:none; padding: 1.5rem 0;">Nenhuma loja encontrada para os filtros atuais.</p>
        </div>
        <div class="form-actions" style="display:flex; gap:10px; margin-top: 10px;">
            <button class="btn btn-secondary" style="flex:1;" onclick="clearRouteStoreSelection()"><i class="fa-solid fa-eraser"></i> Limpar Seleção</button>
            <button class="btn btn-secondary" style="flex:1;" onclick="optimizeManualRoute()"><i class="fa-solid fa-route"></i> Otimizar Ordem</button>
        </div>
        <div id="routeManualResult"></div>
        <div id="routeManualDraftSummary"></div>
    `;
}

window.toggleAllRouteNetworks = function(master) {
    document.querySelectorAll('.route-network-checkbox').forEach(cb => cb.checked = master.checked);
    updateRouteStoreChecklist();
};

window.updateRouteStoreChecklist = function() {
    const netBoxes = document.querySelectorAll('.route-network-checkbox');
    const checkedBoxes = Array.from(netBoxes).filter(cb => cb.checked);
    const checkedNets = checkedBoxes.map(cb => cb.value);
    const search = normalizeText(document.getElementById('routeStoreSearch')?.value || '');

    const label = document.getElementById('routeNetworkFilterLabel');
    if (label) {
        if (checkedBoxes.length === 0) label.textContent = 'Nenhuma rede';
        else if (checkedBoxes.length === netBoxes.length) label.textContent = 'Todas as Redes';
        else if (checkedBoxes.length === 1) label.textContent = checkedNets[0];
        else label.textContent = `${checkedBoxes.length} redes selecionadas`;
    }
    const allBtn = document.getElementById('routeSelectAllNetworks');
    if (allBtn) allBtn.checked = (checkedBoxes.length === netBoxes.length);

    let visibleCount = 0;
    document.querySelectorAll('.route-store-checklist-row').forEach(row => {
        const matchesNet = checkedNets.includes(row.getAttribute('data-network'));
        const matchesSearch = !search || row.getAttribute('data-name').includes(search);
        const visible = matchesNet && matchesSearch;
        row.style.display = visible ? 'flex' : 'none';
        if (visible) visibleCount++;
    });

    const emptyMsg = document.getElementById('routeStoreChecklistEmpty');
    if (emptyMsg) emptyMsg.style.display = visibleCount === 0 ? 'block' : 'none';
};

window.clearRouteStoreSelection = function() {
    document.querySelectorAll('.route-store-checkbox').forEach(cb => { cb.checked = false; });
    window._routeManualOrder = [];
    const resultArea = document.getElementById('routeManualResult');
    if (resultArea) resultArea.innerHTML = '';
};

window.optimizeManualRoute = function() {
    const checkedIds = Array.from(document.querySelectorAll('.route-store-checkbox:checked')).map(cb => cb.value);
    if (checkedIds.length < 1) { alert('Selecione ao menos uma loja.'); return; }
    const selectedStores = checkedIds.map(id => stores.find(s => s.id === id)).filter(Boolean);
    const ordered = buildOptimalRoute(selectedStores);
    window._routeManualOrder = ordered.map(s => s.id);
    renderManualRouteResult();
};

function renderManualRouteResult() {
    const resultArea = document.getElementById('routeManualResult');
    if (!resultArea) return;
    const orderedStores = window._routeManualOrder.map(id => stores.find(s => s.id === id)).filter(Boolean);
    if (orderedStores.length === 0) { resultArea.innerHTML = ''; return; }

    const totalMin = Math.round(routeTotalMinutes(orderedStores));
    const stops = buildDayStops(orderedStores, null);

    const rowsHtml = orderedStores.map((s, idx) => `
        <div class="route-manual-row">
            <div class="route-order-btns">
                <button onclick="moveManualRouteStop(${idx}, -1)" ${idx === 0 ? 'disabled' : ''}><i class="fa-solid fa-caret-up"></i></button>
                <button onclick="moveManualRouteStop(${idx}, 1)" ${idx === orderedStores.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-caret-down"></i></button>
            </div>
            <span class="route-stop-time">${formatMinutesAsClock(stops[idx].arrivalEstimateMin)}</span>
            <div style="flex:1;">
                <div class="route-stop-name">${s.name}</div>
                <div class="route-stop-network">${s.network}</div>
            </div>
        </div>
    `).join('');

    // A data de início pode estar travada (plano já tem dias atribuídos) ou ainda editável;
    // em ambos os casos lemos do campo pra montar as opções de dia com o rótulo real do dia da semana.
    const startInput = document.getElementById('routeManualWeekStart');
    const startDate = (window._routeManualDraftPlan && window._routeManualDraftPlan.weekStart) || (startInput ? startInput.value : nextMondayISO());
    const dayOptions = Array.from({ length: ROUTE_PLAN_LENGTH_DAYS }, (_, i) => {
        const d = formatISODate(addDays(startDate, i));
        return `<option value="${i}">${weekdayLabelPtBR(d)} — ${formatDate(d)}</option>`;
    }).join('');

    const overBudget = totalMin > DAILY_BUDGET_MIN;

    resultArea.innerHTML = `
        <p style="margin-top: 14px; font-weight: 700; color: var(--navy-deep);">Duração total estimada: ${formatDurationHuman(totalMin)} ${overBudget ? '<span style="color: var(--primary-red);">(acima do orçamento diário de 8h)</span>' : ''}</p>
        <div class="route-manual-list">${rowsHtml}</div>
        ${overBudget ? `
        <div style="margin-top: 14px; padding: 12px; background: #fff3f2; border: 1px solid #ffd6d3; border-radius: var(--radius-sm);">
            <p style="font-size: 0.82rem; color: var(--navy-deep); margin: 0 0 8px;">Essa seleção não cabe em um único dia. Em vez de atribuir tudo a um dia só, o sistema pode dividir automaticamente pelos dias seguintes, respeitando o orçamento de 8h/dia e mantendo a ordem já otimizada.</p>
            <button id="splitAcrossDaysBtn" class="btn btn-outline-danger" style="width:100%;" onclick="splitManualRouteAcrossDays()"><i class="fa-solid fa-calendar-week"></i> Dividir Automaticamente pelos Dias</button>
        </div>
        ` : ''}
        <div class="form-group" style="margin-top: 14px;">
            <label>Ou atribuir a rota inteira a um único dia</label>
            <select id="routeManualDaySelect">
                ${dayOptions}
            </select>
        </div>
        <button class="btn btn-secondary" style="width:100%;" onclick="assignManualRouteToDay()"><i class="fa-solid fa-calendar-plus"></i> Adicionar a este dia</button>
    `;
}

// Divide a rota já otimizada (window._routeManualOrder) em blocos que cabem no
// orçamento diário de 8h, sem reordenar nada — só corta a sequência já otimizada
// em pontos de tempo acumulado, preenchendo os dias a partir da data de início do
// plano. Sobras que não couberem nos dias do plano ficam de fora, com aviso.
window.splitManualRouteAcrossDays = function() {
    const orderedStores = window._routeManualOrder.map(id => stores.find(s => s.id === id)).filter(Boolean);
    if (orderedStores.length === 0) return;

    const weekStart = (window._routeManualDraftPlan && window._routeManualDraftPlan.weekStart)
        || document.getElementById('routeManualWeekStart')?.value
        || nextMondayISO();

    const dayBuckets = [];
    let current = [];
    let currentMin = 0;
    orderedStores.forEach(store => {
        const lastStore = current[current.length - 1];
        const addMin = estimateVisitDurationMin(store) + (lastStore ? (travelTimeMin(lastStore, store) || 0) : 0);
        if (current.length > 0 && currentMin + addMin > DAILY_BUDGET_MIN) {
            dayBuckets.push(current);
            current = [store];
            currentMin = estimateVisitDurationMin(store);
        } else {
            current.push(store);
            currentMin += addMin;
        }
    });
    if (current.length > 0) dayBuckets.push(current);

    const usableBuckets = dayBuckets.slice(0, ROUTE_PLAN_LENGTH_DAYS);
    const unscheduledCount = dayBuckets.slice(ROUTE_PLAN_LENGTH_DAYS).reduce((sum, b) => sum + b.length, 0);

    if (!window._routeManualDraftPlan) {
        window._routeManualDraftPlan = {
            id: 'route-' + Date.now(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            weekStart,
            promoterName: '',
            mode: 'manual',
            days: new Array(ROUTE_PLAN_LENGTH_DAYS).fill(null)
        };
    }

    usableBuckets.forEach((bucketStores, idx) => {
        const dateStr = formatISODate(addDays(window._routeManualDraftPlan.weekStart, idx));
        window._routeManualDraftPlan.days[idx] = buildDayFromStores(bucketStores, dateStr, null);
    });

    renderManualDraftSummary();
    renderRouteBuilderManualFormOnly();

    // Feedback visual: o botão sai do estilo "contorno" e vira sólido, deixando
    // claro que o clique já surtiu efeito (some quando a rota é reotimizada).
    const splitBtn = document.getElementById('splitAcrossDaysBtn');
    if (splitBtn) {
        splitBtn.classList.remove('btn-outline-danger');
        splitBtn.classList.add('btn-danger');
        splitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Dividido pelos Dias';
    }

    if (unscheduledCount > 0) {
        alert(`${unscheduledCount} loja(s) não couberam nos ${ROUTE_PLAN_LENGTH_DAYS} dias deste plano, mesmo dividindo pelo orçamento diário de 8h. Elas ficaram de fora — considere criar um novo plano pra elas a partir da próxima semana.`);
    }
};

window.moveManualRouteStop = function(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= window._routeManualOrder.length) return;
    const arr = window._routeManualOrder;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    renderManualRouteResult();
};

window.assignManualRouteToDay = function() {
    const dayIndex = parseInt(document.getElementById('routeManualDaySelect').value, 10);
    const orderedStores = window._routeManualOrder.map(id => stores.find(s => s.id === id)).filter(Boolean);
    if (orderedStores.length === 0) return;

    if (!window._routeManualDraftPlan) {
        const weekStart = document.getElementById('routeManualWeekStart')?.value || nextMondayISO();
        window._routeManualDraftPlan = {
            id: 'route-' + Date.now(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            weekStart,
            promoterName: '',
            mode: 'manual',
            days: new Array(ROUTE_PLAN_LENGTH_DAYS).fill(null)
        };
    }
    const dateStr = formatISODate(addDays(window._routeManualDraftPlan.weekStart, dayIndex));
    window._routeManualDraftPlan.days[dayIndex] = buildDayFromStores(orderedStores, dateStr, null);

    renderManualDraftSummary();
    // A data de início trava assim que o primeiro dia é atribuído — reabre o formulário
    // já refletindo isso (campo desabilitado) pra não desalinhar dias já salvos.
    renderRouteBuilderManualFormOnly();
};

// Reaplica só a parte de filtro/checklist do modo manual, preservando o resultado já otimizado
// (evita perder a rota calculada ao travar o campo de data após o primeiro dia ser atribuído).
function renderRouteBuilderManualFormOnly() {
    const startGroup = document.getElementById('routeManualWeekStart')?.closest('.form-group');
    if (!startGroup || !window._routeManualDraftPlan) return;
    const d = window._routeManualDraftPlan.weekStart;
    startGroup.innerHTML = `
        <label>Data de início do plano</label>
        <input type="date" id="routeManualWeekStart" value="${d}" disabled>
        <p id="routeManualWeekdayHint" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">${weekdayLabelPtBR(d)} — já travada, pois este plano já tem dias atribuídos.</p>
    `;
}

function renderManualDraftSummary() {
    const area = document.getElementById('routeManualDraftSummary');
    if (!area || !window._routeManualDraftPlan) return;
    const plan = window._routeManualDraftPlan;
    const assignedLabels = plan.days
        .map((day, idx) => day ? weekdayLabelPtBR(formatISODate(addDays(plan.weekStart, idx))) : null)
        .filter(Boolean);

    area.innerHTML = `
        <div style="margin-top: 16px; padding: 12px; background: var(--bg-light); border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <strong style="font-size: 0.85rem;">Dias já atribuídos neste plano:</strong>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin: 4px 0 10px;">${assignedLabels.join(', ') || 'nenhum ainda'}</p>
            <div class="form-group">
                <label>Nome do promotor (opcional)</label>
                <input type="text" id="routeManualPromoterName" value="${plan.promoterName || ''}" placeholder="Nome do promotor" oninput="window._routeManualDraftPlan.promoterName = this.value">
            </div>
            <button class="btn btn-success" style="width:100%;" onclick="saveManualRoutePlan()">Salvar Plano</button>
        </div>
    `;
}

window.saveManualRoutePlan = function() {
    const plan = window._routeManualDraftPlan;
    if (!plan) return;
    // Preenche dias sem rota atribuída como vazios, pra manter o formato consistente
    for (let idx = 0; idx < ROUTE_PLAN_LENGTH_DAYS; idx++) {
        if (!plan.days[idx]) {
            plan.days[idx] = { date: formatISODate(addDays(plan.weekStart, idx)), stops: [], totalDurationMin: 0, withinBudget: true };
        }
    }
    plan.updatedAt = new Date().toISOString();
    routePlans.push(plan);
    saveAppStateLocally();

    window._routeManualDraftPlan = null;
    window._routeManualOrder = [];
    document.getElementById('routeBuilderModal').style.display = 'none';
    renderRoutePlanList();
    window.openRoutePlan(plan.id);
};

// ---------- Exportação em PDF do plano semanal ----------

window.exportWeeklyRoutePDF = function(planId) {
    const plan = routePlans.find(p => p.id === planId);
    if (!plan) return;

    const opt = {
        margin: [10, 10],
        filename: `Rota_Semana_${plan.weekStart}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const header = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; font-family: 'Outfit', sans-serif; border-bottom: 2px solid #E31E24; padding-bottom: 12px;">
            <div>
                <h1 style="color: #E31E24; margin: 0; font-size: 22px; font-weight: 700;">Hiperroll — Plano de Rota Semanal</h1>
                <h3 style="color: #333; margin: 5px 0 0; font-size: 14px; font-weight: 600;">Semana de ${formatDate(plan.weekStart)}${plan.promoterName ? ' — ' + plan.promoterName : ''}</h3>
            </div>
        </div>
    `;

    const daysHtml = (plan.days || []).map(day => {
        if (!day || day.stops.length === 0) return '';
        const rows = day.stops.map(stop => {
            const store = stores.find(s => s.id === stop.storeId);
            return `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 8px; font-size: 12px; color: #333;">${formatMinutesAsClock(stop.arrivalEstimateMin)}</td>
                    <td style="padding: 6px 8px; font-size: 12px; color: #333;">${store ? store.name : 'Loja removida'}</td>
                    <td style="padding: 6px 8px; font-size: 11px; color: #666;">${store ? store.network : ''}</td>
                </tr>
            `;
        }).join('');
        return `
            <div style="margin-bottom: 18px; page-break-inside: avoid;">
                <h3 style="color: #0054A6; font-size: 14px; margin: 0 0 6px;">${weekdayLabelPtBR(day.date)} — ${formatDate(day.date)} · ${formatDurationHuman(day.totalDurationMin)}</h3>
                <table style="width:100%; border-collapse: collapse;">
                    <thead><tr style="background:#f4f6f9;"><th style="padding:6px 8px; text-align:left; font-size:11px;">Horário</th><th style="padding:6px 8px; text-align:left; font-size:11px;">Loja</th><th style="padding:6px 8px; text-align:left; font-size:11px;">Rede</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }).join('');

    const container = document.createElement('div');
    container.innerHTML = header + (daysHtml || '<p>Nenhuma parada neste plano.</p>');
    container.style.padding = '20px';
    container.style.background = 'white';
    container.style.color = 'black';
    container.style.width = '210mm';
    container.style.boxSizing = 'border-box';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    exportHtmlToPdf(container, opt);
};

function renderProductsListView() {
    contentArea.innerHTML = `
        <div class="panel">
            <div class="panel-header">
                <h2>Análise de Produtos e Rupturas</h2>
            </div>
            <div class="reports-container">
                <table class="reports-table">
                    <thead>
                        <tr>
                            <th>Produto</th>
                            <th>Total Rupturas</th>
                            <th>Lojas Afetadas</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="productsTableBody">
                        <!-- Injected by JS -->
                    </tbody>
                </table>
            </div>
        </div>
        <div id="productDetailModal" class="modal-detail" style="display:none">
            <!-- Modal dinâmico -->
        </div>
    `;
    renderProductsTable();
}

function renderProductsTable() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    const fRuptures = typeof getGlobalFilteredRuptures === 'function' ? getGlobalFilteredRuptures() : validatedRuptures;

    products.forEach(product => {
        // Calcular rupturas para este produto
        const productRuptures = fRuptures.filter(r => r.productId === product.id);
        const storesAffected = [...new Set(productRuptures.map(r => r.storeId))].length;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${product.name}</strong></td>
            <td><span class="badge-rupture">${productRuptures.length}</span></td>
            <td>${storesAffected} lojas</td>
            <td><span class="status-tag ${productRuptures.length > 0 ? 'warning' : 'ok'}">${productRuptures.length > 0 ? 'Com Ruptura' : 'Normal'}</span></td>
            <td>
                <button class="btn btn-secondary btn-small" onclick="showProductDetails('${product.id}')">
                    <i class="fa-solid fa-eye"></i> Detalhes
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

window.showProductDetails = function(productId) {
    const product = products.find(p => p.id === productId);
    const fRuptures = typeof getGlobalFilteredRuptures === 'function' ? getGlobalFilteredRuptures() : validatedRuptures;
    const productRuptures = fRuptures.filter(r => r.productId === productId);
    
    const modal = document.getElementById('productDetailModal');
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content small">
            <div class="modal-header">
                <h2>Lojas em Ruptura: ${product.name}</h2>
                <span class="close-modal" onclick="document.getElementById('productDetailModal').style.display='none'">&times;</span>
            </div>
            <div class="modal-body">
                <ul class="detail-list">
                    ${productRuptures.length === 0 ? '<li>Nenhuma ruptura ativa.</li>' : 
                      productRuptures.map(r => `
                        <li>
                            <div class="detail-item">
                                <strong>${r.storeName}</strong>
                                <span class="rupture-time">${getTimeDiff(r.timestamp)}</span>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
};

function getHistoryFilterState() {
    const searchTerm = document.getElementById('historySearch')?.value.toLowerCase() || '';
    const startDate = document.getElementById('historyStartDate')?.value || '';
    const endDate = document.getElementById('historyEndDate')?.value || '';
    const statusFilter = document.getElementById('historyStatusFilter')?.value || 'all';
    const selectedNetworks = Array.from(document.querySelectorAll('#historyNetworkDropdown .history-network-checkbox:checked')).map(cb => cb.value);
    const selectedProductIds = Array.from(document.querySelectorAll('#historyProductDropdown .history-product-checkbox:checked')).map(cb => cb.value);
    const onlyWithObservation = historyFilterOnlyObservation;

    return {
        searchTerm,
        startDate,
        endDate,
        statusFilter,
        selectedNetworks,
        selectedProductIds,
        onlyWithObservation,
        onlyWithExtraPoints: historyFilterOnlyExtraPoints,
        onlyExtraVisits: historyFilterOnlyExtraVisits
    };
}

function updateHistoryFilterLabels() {
    const networkLabel = document.getElementById('historyNetworkFilterLabel');
    if (networkLabel) {
        const selectedNetworks = Array.from(document.querySelectorAll('#historyNetworkDropdown .history-network-checkbox:checked')).map(cb => cb.value);
        if (selectedNetworks.length === 0) {
            networkLabel.textContent = 'Nenhuma rede';
        } else if (selectedNetworks.length === 1) {
            networkLabel.textContent = selectedNetworks[0];
        } else {
            networkLabel.textContent = `${selectedNetworks.length} redes`;
        }
    }

    const productLabel = document.getElementById('historyProductFilterLabel');
    if (productLabel) {
        const selectedProducts = Array.from(document.querySelectorAll('#historyProductDropdown .history-product-checkbox:checked')).map(cb => cb.value);
        if (selectedProducts.length === 0) {
            productLabel.textContent = 'Nenhum produto';
        } else if (selectedProducts.length === 1) {
            const product = products.find(p => String(p.id) === selectedProducts[0]);
            productLabel.textContent = product ? product.name : '1 produto';
        } else {
            productLabel.textContent = `${selectedProducts.length} produtos`;
        }
    }
}

window.toggleAllHistoryNetworks = function(master) {
    document.querySelectorAll('#historyNetworkDropdown .history-network-checkbox').forEach(cb => cb.checked = master.checked);
    document.getElementById('historySelectAllNetworks').checked = master.checked;
    updateHistoryFilterLabels();
    renderHistoryViewData();
};

window.toggleHistoryExtraVisitsFilter = function() {
    historyFilterOnlyExtraVisits = !historyFilterOnlyExtraVisits;
    const btn = document.getElementById('historyExtraVisitsFilterBtn');
    if (btn) {
        btn.style.background = historyFilterOnlyExtraVisits ? 'var(--primary-red)' : 'white';
        btn.style.color = historyFilterOnlyExtraVisits ? 'white' : 'var(--text-dark)';
        btn.style.borderColor = historyFilterOnlyExtraVisits ? 'var(--primary-red)' : '#eee';
    }
    renderHistoryViewData();
};

window.toggleHistoryNetworkSelection = function(net) {
    const allBoxes = document.querySelectorAll('#historyNetworkDropdown .history-network-checkbox');
    const checkedBoxes = Array.from(allBoxes).filter(cb => cb.checked);
    document.getElementById('historySelectAllNetworks').checked = checkedBoxes.length === allBoxes.length;
    updateHistoryFilterLabels();
    renderHistoryViewData();
};

window.toggleAllHistoryProducts = function(master) {
    document.querySelectorAll('#historyProductDropdown .history-product-checkbox').forEach(cb => cb.checked = master.checked);
    document.getElementById('historySelectAllProducts').checked = master.checked;
    updateHistoryFilterLabels();
    renderHistoryViewData();
};

window.toggleHistoryObservationFilter = function() {
    historyFilterOnlyObservation = !historyFilterOnlyObservation;
    const btn = document.getElementById('historyObservationFilterBtn');
    if (btn) {
        btn.style.background = historyFilterOnlyObservation ? 'var(--primary-red)' : 'white';
        btn.style.color = historyFilterOnlyObservation ? 'white' : 'var(--text-dark)';
        btn.style.borderColor = historyFilterOnlyObservation ? 'var(--primary-red)' : '#eee';
    }
    renderHistoryViewData();
};

window.toggleHistoryExtraPointsFilter = function() {
    historyFilterOnlyExtraPoints = !historyFilterOnlyExtraPoints;
    const btn = document.getElementById('historyExtraPointsFilterBtn');
    if (btn) {
        btn.style.background = historyFilterOnlyExtraPoints ? 'var(--primary-red)' : 'white';
        btn.style.color = historyFilterOnlyExtraPoints ? 'white' : 'var(--text-dark)';
        btn.style.borderColor = historyFilterOnlyExtraPoints ? 'var(--primary-red)' : '#eee';
    }
    renderHistoryViewData();
};

window.toggleHistoryProductSelection = function(productId) {
    const allBoxes = document.querySelectorAll('#historyProductDropdown .history-product-checkbox');
    const checkedBoxes = Array.from(allBoxes).filter(cb => cb.checked);
    document.getElementById('historySelectAllProducts').checked = checkedBoxes.length === allBoxes.length;
    updateHistoryFilterLabels();
    renderHistoryViewData();
};

function getFilteredHistoryData() {
    const filters = getHistoryFilterState();
    const statusFilter = filters.statusFilter;

    const filteredVisits = [...visits].filter(v => {
        const store = stores.find(s => s.id === v.storeId);
        if (!store) return false;

        const matchesText = !filters.searchTerm || (store?.name || '').toLowerCase().includes(filters.searchTerm) || (store?.network || '').toLowerCase().includes(filters.searchTerm) || (v.notes || '').toLowerCase().includes(filters.searchTerm) || (v.ruptures || []).some(r => {
            const p = products.find(prod => prod.id === r);
            return (p?.name || '').toLowerCase().includes(filters.searchTerm);
        });
        const matchesDate = (!filters.startDate || v.date >= filters.startDate) && (!filters.endDate || v.date <= filters.endDate);
        const matchesNetwork = filters.selectedNetworks.length === 0 ? false : filters.selectedNetworks.includes(store.network);
        const matchesProduct = filters.selectedProductIds.length === 0 ? true : (v.ruptures || []).some(r => filters.selectedProductIds.includes(r));
        const matchesObservation = !filters.onlyWithObservation || (v.notes || '').trim().length > 0;
        const matchesExtraPoints = !filters.onlyWithExtraPoints || (v.extraPoints && v.extraPoints.length > 0);
        const matchesExtraVisits = !filters.onlyExtraVisits || !!v.isExtra;
        let includeVisit = statusFilter !== 'resolved';
        if (statusFilter === 'active') {
            const summary = getVisitResolutionSummary(v);
            includeVisit = summary.totalItems > summary.resolvedCount;
        }
        return matchesText && matchesDate && matchesNetwork && matchesProduct && matchesObservation && matchesExtraPoints && matchesExtraVisits && includeVisit;
    });
    filteredVisits.sort((a, b) => b.date.localeCompare(a.date));

    const filteredResolved = statusFilter === 'active' ? [] : [...resolvedRupturesHistory].filter(item => {
        const matchesText = !filters.searchTerm || (item.storeName || '').toLowerCase().includes(filters.searchTerm) || (item.productName || '').toLowerCase().includes(filters.searchTerm);
        const matchesDate = (!filters.startDate || item.resolvedAt >= filters.startDate) && (!filters.endDate || item.resolvedAt <= filters.endDate);
        const matchesProduct = filters.selectedProductIds.length === 0 || filters.selectedProductIds.includes(String(item.productId));
        return matchesText && matchesDate && matchesProduct;
    });

    return { filteredVisits, filteredResolved };
}

// Monta o texto da tooltip do badge de rupturas (nomes dos itens, um por linha),
// já escapado para uso seguro dentro do atributo HTML data-tooltip.
function getRuptureTooltipAttr(ruptures) {
    if (!ruptures || ruptures.length === 0) return '';
    const names = ruptures.map(pId => {
        const prod = products.find(p => p.id === pId);
        return prod ? prod.name : 'Produto Desconhecido';
    });
    return names.join('\n')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function renderHistoryViewData() {
    const { filteredVisits, filteredResolved } = getFilteredHistoryData();

    const noticeEl = document.getElementById('historyBackfillNotice');
    if (noticeEl) {
        noticeEl.style.display = historyBackfillNotice ? 'flex' : 'none';
        noticeEl.innerHTML = `<i class="fa-solid fa-circle-info"></i> <span>${historyBackfillNotice}</span>`;
    }

    const tbodyVisits = document.getElementById('historyVisitsTableBody');
    if (tbodyVisits) {
        if (filteredVisits.length === 0) {
            tbodyVisits.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhuma visita encontrada para os filtros aplicados.</td></tr>';
        } else {
            tbodyVisits.innerHTML = '';
            
            // FILTRO DE UI: Mostrar apenas a visita mais recente por loja na tela
            const seenStores = new Set();
            const uiVisits = filteredVisits.filter(visit => {
                if (seenStores.has(visit.storeId)) return false;
                seenStores.add(visit.storeId);
                return true;
            });

            const limit = window.historyVisitsLimit || 50;
            uiVisits.slice(0, limit).forEach(visit => {
                const store = stores.find(s => s.id === visit.storeId);
                const summary = getVisitResolutionSummary(visit);
                const row = document.createElement('tr');
                row.style.background = summary.totalItems > 0 && summary.resolvedCount === summary.totalItems ? '#f4fff5' : '';
                row.innerHTML = `
                    <td>${formatDate(visit.date)}</td>
                    <td><strong>${store ? store.name : 'Loja Removida'}${visit.isExtra ? ' <span class="badge-visit-extra">⭐ Visita Extra</span>' : ''}</strong></td>
                    <td>${store ? store.network : '-'}</td>
                    <td><span class="badge-rupture"${(visit.ruptures || []).length > 0 ? ` data-tooltip="${getRuptureTooltipAttr(visit.ruptures)}"` : ''}>${(visit.ruptures || []).length} Itens</span></td>
                    <td>${getVisitResolutionBadge(visit)}</td>
                    <td>${(visit.extraPoints || []).map(ep => `<span class="badge-extra-point">${ep}</span>`).join('') || '-'}</td>
                    <td>${window.fixEncoding(visit.notes) || '-'}</td>
                `;
                tbodyVisits.appendChild(row);
            });
            
            if (uiVisits.length > limit) {
                const loadMore = document.createElement('tr');
                loadMore.innerHTML = `<td colspan="7" style="text-align:center; padding:15px;"><button class="btn btn-secondary" onclick="window.historyVisitsLimit += 50; renderHistoryViewData();">Carregar mais ${Math.min(50, uiVisits.length - limit)} (Restam ${uiVisits.length - limit})</button></td>`;
                tbodyVisits.appendChild(loadMore);
            }
        }
    }

    const tbodyResolved = document.getElementById('historyResolvedTableBody');
    if (tbodyResolved) {
        if (filteredResolved.length === 0) {
            tbodyResolved.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhuma ruptura resolvida encontrada para os filtros aplicados.</td></tr>';
        } else {
            tbodyResolved.innerHTML = '';
            const limitResolved = window.historyResolvedLimit || 50;
            filteredResolved.slice(0, limitResolved).forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${item.productName || 'Produto'}</strong></td>
                    <td>${item.storeName || 'Loja'}</td>
                    <td>${item.visitDate ? formatDate(item.visitDate) : '-'}</td>
                    <td>${item.resolvedAt ? formatDate(item.resolvedAt) : '-'}</td>
                    <td><span class="status-tag ok">Resolvido</span></td>
                `;
                tbodyResolved.appendChild(row);
            });
            if (filteredResolved.length > limitResolved) {
                const loadMore = document.createElement('tr');
                loadMore.innerHTML = `<td colspan="5" style="text-align:center; padding:15px;"><button class="btn btn-secondary" onclick="window.historyResolvedLimit = (window.historyResolvedLimit || 50) + 50; renderHistoryViewData();">Carregar mais ${Math.min(50, filteredResolved.length - limitResolved)} (Restam ${filteredResolved.length - limitResolved})</button></td>`;
                tbodyResolved.appendChild(loadMore);
            }
        }
    }

    updateHistoryFilterLabels();
}

function renderReportsTable() {
    const tbody = document.getElementById('reportsTableBody');
    const searchTerm = document.getElementById('reportSearch')?.value.toLowerCase() || '';
    const startDate = document.getElementById('reportStartDate')?.value || '';
    const endDate = document.getElementById('reportEndDate')?.value || '';
    const checkboxes = document.querySelectorAll('.network-checkbox');
    const selectedNetworks = checkboxes.length > 0 ? Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value) : ['all'];
    const isAllSelected = document.getElementById('selectAllNetworks')?.checked ?? true;
    
    if (!tbody) return;

    if (visits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Nenhuma visita registrada ainda.</td></tr>';
        return;
    }

    const filteredVisits = getFilteredReportVisits();

    if (filteredVisits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Nenhum resultado para os filtros aplicados.</td></tr>';
        return;
    }

    // Ordenar por data (mais recente primeiro)
    const sortedVisits = [...filteredVisits].sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = '';
    const limit = window.reportsTableLimit || 50;
    
    sortedVisits.slice(0, limit).forEach(visit => {
        const store = stores.find(s => s.id === visit.storeId);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" class="visit-checkbox" value="${visit.id}" onchange="updateBulkDeleteButton()"></td>
            <td>
                <div class="editable-date">
                    <span>${formatDate(visit.date)}</span>
                    <button class="btn-edit-small" onclick="editVisitDate(${visit.id})" title="Alterar Data">
                        <i class="fa-solid fa-calendar-day"></i>
                    </button>
                </div>
            </td>
            <td><strong style="cursor: pointer; color: var(--primary-blue);" onclick="showVisitDetails(${visit.id})" title="Ver detalhes da visita">${store ? store.name : 'Loja Removida'}${visit.isExtra ? ' <span class="badge-visit-extra">⭐ Visita Extra</span>' : ''}</strong></td>
            <td><span class="network-tag">${store ? store.network : '-'}</span></td>
            <td><span class="badge-rupture"${visit.ruptures.length > 0 ? ` data-tooltip="${getRuptureTooltipAttr(visit.ruptures)}"` : ''}>${visit.ruptures.length} Itens</span></td>
            <td>
                <div class="history-photos">
                    ${(photoCache[visit.id] && photoCache[visit.id].length > 0) ? `<button class="btn btn-secondary btn-small" onclick="viewVisitPhotos('${visit.id}')" style="display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-camera"></i> ${photoCache[visit.id].length} Fotos</button>` : '<span style="color:#ccc; font-size: 0.7rem;">Sem fotos</span>'}
                </div>
            </td>
            <td>${(visit.extraPoints || []).map(ep => `<span class="badge-extra-point">${ep}</span>`).join('') || '-'}</td>
            <td class="notes-cell" title="${visit.notes || ''}">${window.fixEncoding(visit.notes) || '-'}</td>
            <td>
                <div style="display: flex; gap: 8px; flex-wrap: nowrap; align-items: center;">
                    <button class="btn-icon text-blue" onclick="openEditVisit(${visit.id})" title="Editar Visita">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn-icon text-red" onclick="deleteVisit(${visit.id})" title="Excluir Visita">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (sortedVisits.length > limit) {
        const loadMore = document.createElement('tr');
        loadMore.innerHTML = `<td colspan="9" style="text-align:center; padding:15px;"><button class="btn btn-secondary" onclick="window.reportsTableLimit = (window.reportsTableLimit || 50) + 50; renderReportsTable();">Carregar mais ${Math.min(50, sortedVisits.length - limit)} (Restam ${sortedVisits.length - limit})</button></td>`;
        tbody.appendChild(loadMore);
    }
}

window.toggleSelectAll = function(masterCb) {
    const checkboxes = document.querySelectorAll('.visit-checkbox');
    checkboxes.forEach(cb => cb.checked = masterCb.checked);
    updateBulkDeleteButton();
};

window.updateBulkDeleteButton = function() {
    const checkedCount = document.querySelectorAll('.visit-checkbox:checked').length;
    const btn = document.getElementById('bulkDeleteBtn');
    if (btn) {
        btn.style.display = checkedCount > 0 ? 'inline-flex' : 'none';
        btn.innerHTML = `<i class="fa-solid fa-trash"></i> Excluir (${checkedCount})`;
    }
};

window.deleteSelectedVisits = async function() {
    const selectedIds = Array.from(document.querySelectorAll('.visit-checkbox:checked'))
                            .map(cb => cb.value);
    
    if (confirm(`Deseja realmente excluir as ${selectedIds.length} visitas selecionadas?`)) {
        // Captura lojas afetadas antes de remover as visitas
        const affectedStoreIds = new Set(visits.filter(v => selectedIds.includes(v.id)).map(v => v.storeId));

        // Deleta as fotos de cada visita no servidor (se aplicável)
        if (typeof Storage !== 'undefined' && Storage.isServer) {
            for (const id of selectedIds) {
                await Storage.deleteVisitPhotos(id);
            }
            // Deleta as visitas especificamente no servidor
            await Storage.deleteVisits(selectedIds);
        }

        // Remove visitas
        visits = visits.filter(v => !selectedIds.includes(v.id));
        invalidateVisitsIndex();

        // Persistência e sincronização local
        persistAppState();

        // Recalcula status das lojas afetadas e atualiza views
        affectedStoreIds.forEach(id => recomputeStoreStatus(id));
        checkOverdueStores();
        renderPage('reports');
        updateStats();
        alert("Visitas selecionadas foram removidas.");
    }
};

window.deleteVisit = async function(id) {
    if (confirm("Deseja realmente excluir esta visita e todas as suas fotos permanentemente?")) {
        // Identifica loja afetada antes de remover
        const visitObj = visits.find(v => v.id === id);
        const storeId = visitObj ? visitObj.storeId : null;

        // Remove a visita do histórico
        visits = visits.filter(v => v.id !== id);
        invalidateVisitsIndex();
        saveAppStateLocally(); // fire and forget

        // Se tiver Storage server
        if (typeof Storage !== 'undefined' && Storage.isServer) {
            await Storage.deleteVisitPhotos(id);
            await Storage.deleteVisits([id]);
            await syncAppStateServer();
        }

        // Recalcula status da loja afetada
        if (storeId) {
            recomputeStoreStatus(storeId);
            checkOverdueStores();
        }

        renderPage('reports'); // Recarregar a view
        updateStats(); // Atualizar contadores
        alert("Visita removida com sucesso.");
    }
};

// Recalcula o lastVisit e o status de uma loja com base no histórico de visits
function recomputeStoreStatus(storeId) {
    const storeIdx = stores.findIndex(s => s.id === storeId);
    if (storeIdx === -1) return;

    // Encontra as visitas restantes dessa loja (mais recente primeiro)
    const storeVisits = visits
        .filter(v => v.storeId === storeId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (storeVisits.length === 0) {
        stores[storeIdx].lastVisit = null;
        stores[storeIdx].status = null;
        stores[storeIdx].currentStatus = 'pending';
    } else {
        stores[storeIdx].lastVisit = storeVisits[0].date;
        stores[storeIdx].status = 'visited';
        // currentStatus será recalculado por checkOverdueStores()
    }
}

window.editVisitDate = function(id) {
    const visit = visits.find(v => v.id === id);
    if (!visit) return;

    const newDate = prompt("Digite a nova data (AAAA-MM-DD):", visit.date);
    if (newDate && newDate !== visit.date) {
        // Validação simples de formato AAAA-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
            visit.date = newDate;
            invalidateVisitsIndex();
            recomputeStoreStatus(visit.storeId);
            saveAppStateLocally(); // fire and forget
            if (typeof Storage !== 'undefined' && Storage.isServer) syncAppStateServer();
            renderPage('reports');
            updateStats();
            alert("Data atualizada!");
        } else {
            alert("Formato de data inválido. Use AAAA-MM-DD.");
        }
    }
};

window.viewPhoto = function(src) {
    const win = window.open();
    win.document.write(`<img src="${src}" style="max-width:100%; height:auto; display:block; margin:auto; border-radius:10px; margin-top:20px;">`);
};

window.viewVisitPhotos = function(visitId) {
    const photos = photoCache[visitId];
    if (!photos || photos.length === 0) return;
    const win = window.open();
    win.document.write(`
        <html style="background:#f4f7f6; font-family:sans-serif;">
        <head><title>Fotos da Visita</title></head>
        <body style="padding: 20px; text-align: center;">
            <h2 style="color:#203a4c; margin-bottom:20px;">Fotos da Visita</h2>
            ${photos.map(p => `<img src="${p}" style="max-width:100%; height:auto; display:block; margin:auto; margin-bottom:20px; border-radius:10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border:1px solid #ddd;">`).join('')}
        </body>
        </html>
    `);
};

function calculateRuptureRate() {
    const fStores = typeof getGlobalFilteredStores === 'function' ? getGlobalFilteredStores() : stores;
    
    // Calcula o total de produtos esperados nas lojas filtradas
    const totalPossible = fStores.reduce((acc, s) => acc + (s.productIds && s.productIds.length > 0 ? s.productIds.length : products.length), 0);
    if (totalPossible === 0) return "0.0";

    // Pega as rupturas ativas das lojas filtradas
    const activeRups = validatedRuptures.filter(r => fStores.some(s => s.id === r.storeId)).length;
    
    return ((activeRups / totalPossible) * 100).toFixed(1);
}

function updateStats() {
    const totalStoresEl = document.getElementById('totalStores');
    const totalVisitsEl = document.getElementById('totalVisits');
    const ruptureRateEl = document.getElementById('ruptureRate');

    const fStores = typeof getGlobalFilteredStores === 'function' ? getGlobalFilteredStores() : stores;
    const fVisits = typeof getGlobalFilteredVisits === 'function' ? getGlobalFilteredVisits() : visits;

    if (totalStoresEl) totalStoresEl.textContent = fStores.length;
    
    if (totalVisitsEl) {
        totalVisitsEl.textContent = fVisits.length;
    }
    
    if (ruptureRateEl) ruptureRateEl.textContent = calculateRuptureRate() + '%';
    
    // Atualizar alertas de produtos se estiver na dashboard
    const alertsContainer = document.getElementById('dashboardProductAlerts');
    if (alertsContainer) {
        renderValidatedRuptures();
    }
}

function isItemResolvedInHistory(productId, storeId, visitId, visitDate) {
    const visitDateValue = visitDate ? new Date(`${visitDate}T12:00:00`) : null;
    const visitDateMs = visitDateValue ? visitDateValue.getTime() : null;

    const exactMatch = resolvedRupturesHistory.find(r => 
        String(r.productId) === String(productId) &&
        String(r.storeId) === String(storeId) &&
        (visitId ? String(r.visitId) === String(visitId) : false)
    );
    if (exactMatch) return true;

    const laterOrSameMatch = resolvedRupturesHistory.find(r => {
        if (String(r.productId) !== String(productId) || String(r.storeId) !== String(storeId)) {
            return false;
        }
        const resolvedAtValue = r.resolvedAt ? new Date(`${r.resolvedAt}T12:00:00`) : null;
        const resolvedAtMs = resolvedAtValue ? resolvedAtValue.getTime() : null;
        const visitDateCandidate = r.visitDate ? new Date(`${r.visitDate}T12:00:00`) : null;
        const visitDateCandidateMs = visitDateCandidate ? visitDateCandidate.getTime() : null;
        const referenceMs = visitDateMs || visitDateCandidateMs || resolvedAtMs;
        return (resolvedAtMs !== null && referenceMs !== null && resolvedAtMs >= referenceMs) ||
               (visitDateCandidateMs !== null && referenceMs !== null && visitDateCandidateMs >= referenceMs);
    });

    return !!laterOrSameMatch;
}

window.getResolvedItemStatus = function(productId, storeId, visitId, visitDate) {
    const historyMatch = resolvedRupturesHistory.find(r => {
        if (String(r.productId) !== String(productId) || String(r.storeId) !== String(storeId)) {
            return false;
        }
        if (visitId && String(r.visitId) === String(visitId)) {
            return true;
        }
        const resolvedAtValue = r.resolvedAt ? new Date(`${r.resolvedAt}T12:00:00`) : null;
        const resolvedAtMs = resolvedAtValue ? resolvedAtValue.getTime() : null;
        const visitDateValue = visitDate ? new Date(`${visitDate}T12:00:00`) : null;
        const visitDateMs = visitDateValue ? visitDateValue.getTime() : null;
        const referenceMs = visitDateMs || resolvedAtMs;
        return resolvedAtMs !== null && referenceMs !== null && resolvedAtMs >= referenceMs;
    });

    if (historyMatch) {
        return { isResolved: true, resolvedAt: historyMatch.resolvedAt };
    }
    
    const isActive = validatedRuptures.some(r => 
        String(r.productId) === String(productId) && String(r.storeId) === String(storeId)
    );
    
    if (!isActive) {
        const latestResolve = resolvedRupturesHistory.find(r => 
            String(r.productId) === String(productId) && String(r.storeId) === String(storeId)
        );
        return { isResolved: true, resolvedAt: latestResolve ? latestResolve.resolvedAt : null };
    }
    
    return { isResolved: false, resolvedAt: null };
};

window.exportVisitsCSV = function() {
    const filtered = getFilteredReportVisits().sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        alert('Não hï¿½ dados filtrados para exportar.');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFFData;Loja;Rede;Qtd Rupturas;Itens em Ruptura;Pontos Extras;Observações\n";
    
    filtered.forEach(v => {
        const store = stores.find(s => s.id === v.storeId);
        const ruptureNames = (v.ruptures || []).map(id => {
            const p = products.find(prod => prod.id === id);
            return p ? p.name : id;
        }).join(" | ");
        const extraPointsNames = (v.extraPoints || []).join(" | ");
        
        const row = [
            formatDate(v.date),
            store ? store.name : 'N/A',
            store ? store.network : 'N/A',
            (v.ruptures || []).length,
            ruptureNames,
            extraPointsNames,
            v.notes || ''
        ].join(";");
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_visitas_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

function getReportFilterSettings() {
    const searchTerm = document.getElementById('reportSearch')?.value.toLowerCase() || '';
    const startDate = document.getElementById('reportStartDate')?.value || '';
    const endDate = document.getElementById('reportEndDate')?.value || '';
    const checkboxes = document.querySelectorAll('.network-checkbox');
    const selectedNetworks = checkboxes.length > 0 ? Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value) : ['all'];
    const isAllSelected = document.getElementById('selectAllNetworks')?.checked ?? true;

    return { searchTerm, startDate, endDate, selectedNetworks, isAllSelected };
}

function getFilteredReportVisits() {
    const { searchTerm, startDate, endDate, selectedNetworks, isAllSelected } = getReportFilterSettings();

    return visits.filter(v => {
        const store = stores.find(s => s.id === v.storeId);
        if (!store) return false;

        const matchesNetwork = isAllSelected || selectedNetworks.includes(store.network);
        const matchesSearch = (store.name || '').toLowerCase().includes(searchTerm) ||
                             (v.notes && v.notes.toLowerCase().includes(searchTerm));
        const matchesDate = (!startDate || v.date >= startDate) && (!endDate || v.date <= endDate);
        const matchesRupture = !reportFilterOnlyRuptures || (v.ruptures && v.ruptures.length > 0);
        const matchesObservation = !reportFilterOnlyObservation || (v.notes && v.notes.trim().length > 0);
        const matchesExtraPoints = !reportFilterOnlyExtraPoints || (v.extraPoints && v.extraPoints.length > 0);
        const matchesExtraVisits = !reportFilterOnlyExtraVisits || !!v.isExtra;

            return matchesNetwork && matchesSearch && matchesDate && matchesRupture && matchesObservation && matchesExtraPoints && matchesExtraVisits;
    });
}

// Retorna os dados dos "Principais Insights" como texto puro (sentences + details),
// para desenho nativo no jsPDF — sem depender de rasterizar HTML (ver drawVisitsReportHeaderNative).
function computeReportInsights(filteredVisits) {
    const storeMap = new Map();
    const networkCounts = {};
    let totalRuptureItems = 0;
    const productRuptureCounts = {};

    filteredVisits.forEach(v => {
        const store = stores.find(s => s.id === v.storeId);
        if (!store) return;
        
        const rupCount = (v.ruptures || []).length;
        totalRuptureItems += rupCount;

        (v.ruptures || []).forEach(pId => {
            productRuptureCounts[pId] = (productRuptureCounts[pId] || 0) + 1;
        });

        const networkName = store.network || 'Não informada';
        networkCounts[networkName] = (networkCounts[networkName] || 0) + 1;

        if (!storeMap.has(store.id)) {
            storeMap.set(store.id, []);
        }
        storeMap.get(store.id).push(v);
    });

    const totalPossibleRuptures = filteredVisits.length * products.length;
    const generalRuptureRate = totalPossibleRuptures > 0 
        ? ((totalRuptureItems / totalPossibleRuptures) * 100).toFixed(1) 
        : "0.0";

    const topProducts = Object.entries(productRuptureCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([pId, count]) => {
            const p = products.find(prod => String(prod.id) === String(pId));
            return { name: p ? p.name : `Prod #${pId}`, count };
        });

    const storeSummaries = [];
    storeMap.forEach((storeVisits, storeId) => {
        const store = stores.find(s => s.id === storeId);
        const visitsSorted = [...storeVisits].sort((a, b) => new Date(a.date) - new Date(b.date));
        const firstCount = (visitsSorted[0].ruptures || []).length;
        const lastCount = (visitsSorted[visitsSorted.length - 1].ruptures || []).length;
        const delta = firstCount - lastCount;
        const percent = firstCount === 0
            ? (lastCount === 0 ? 0 : -100)
            : Math.round((delta / Math.max(firstCount, 1)) * 100);

        storeSummaries.push({
            store,
            firstCount,
            lastCount,
            delta,
            percent,
            visits: visitsSorted.length
        });
    });

    const improvedStores = storeSummaries.filter(s => s.delta > 0).sort((a, b) => b.delta - a.delta);
    const worsenedStores = storeSummaries.filter(s => s.delta < 0).sort((a, b) => a.delta - b.delta);
    const mostVisitedStore = [...storeSummaries].sort((a, b) => b.visits - a.visits)[0] || null;
    const topNetwork = Object.entries(networkCounts).sort((a, b) => b[1] - a[1])[0] || ['Nenhum', 0];

    const improvedText = improvedStores.length > 0
        ? `${improvedStores.length} ${improvedStores.length === 1 ? 'loja' : 'lojas'} reduziram rupturas.`
        : 'Nenhuma loja apresentou redução de rupturas neste período.';
    const worsenedText = worsenedStores.length > 0
        ? `${worsenedStores.length} ${worsenedStores.length === 1 ? 'loja' : 'lojas'} tiveram acréscimo de rupturas.`
        : 'Nenhuma loja apresentou aumento de rupturas neste período.';

    const highlightImprov = improvedStores[0];
    const highlightWorse = worsenedStores[0];

    const sentences = [];
    sentences.push(`Total de visitas no relatório: ${filteredVisits.length}.`);
    sentences.push(`Lojas diferentes no recorte: ${storeMap.size}.`);
    sentences.push(`Rede mais registrada: ${topNetwork[0]} (${topNetwork[1]} visitas).`);
    sentences.push(`Taxa Geral de Ruptura: ${generalRuptureRate}% (Média de ${(totalRuptureItems / Math.max(1, filteredVisits.length)).toFixed(1)} Itens/visita).`);
    sentences.push(improvedText);
    sentences.push(worsenedText);

    const details = [];

    if (topProducts.length > 0) {
        const topList = topProducts.map(p => `${p.name} (${p.count}x)`).join(', ');
        details.push(`Top 5 Produtos Críticos: ${topList}`);
    }

    if (highlightImprov) {
        details.push(`${highlightImprov.store.name} apresentou a maior melhora: de ${highlightImprov.firstCount} para ${highlightImprov.lastCount} Itens (${highlightImprov.percent}% de melhoria).`);
    }
    if (highlightWorse) {
        details.push(`${highlightWorse.store.name} teve a maior piora: de ${highlightWorse.firstCount} para ${highlightWorse.lastCount} Itens.`);
    }
    if (mostVisitedStore) {
        details.push(`${mostVisitedStore.store.name} foi a loja com mais visitas no período (${mostVisitedStore.visits}).`);
    }

    return { sentences, details };
}

// Retorna as linhas da tabela de visitas como um ARRAY (uma string por linha), não uma
// tabela HTML já montada — assim exportVisitsPDF pode dividi-las em lotes menores antes
// de rasterizar (ver exportSectionedTablesToPdf), evitando páginas em branco quando o
// histórico é muito grande (milhares de visitas).
// Texto da célula "Rupturas" nos PDFs: mantém a contagem e acrescenta os nomes
// dos itens entre parênteses, sem precisar de coluna extra (a tabela já quebra
// linha automaticamente em células com texto longo).
function formatRupturesCellText(ruptures) {
    if (!ruptures || ruptures.length === 0) return '0';
    const names = ruptures.map(pId => {
        const prod = products.find(p => p.id === pId);
        return prod ? prod.name : 'Produto Desconhecido';
    });
    return `${ruptures.length} (${names.join(', ')})`;
}

function buildReportTableRows(filteredVisits) {
    return filteredVisits.map(v => {
        const store = stores.find(s => s.id === v.storeId) || { name: 'Loja Removida', network: 'N/A' };
        const extraPts = (v.extraPoints || []).join(', ') || '-';
        return [
            formatDate(v.date),
            store.name,
            store.network,
            formatRupturesCellText(v.ruptures),
            extraPts,
            v.notes || '-'
        ];
    });
}

function generateChartImage(config, width = 500, height = 300) {
    return new Promise(resolve => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.style.position = 'absolute';
        canvas.style.left = '-9999px';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, width, height);

        if (!config.options) config.options = {};
        if (!config.options.animation) config.options.animation = false;
        config.options.responsive = false;

        new Chart(ctx, config);

        setTimeout(() => {
            const dataUrl = canvas.toDataURL('image/png');
            document.body.removeChild(canvas);
            resolve(dataUrl);
        }, 150);
    });
}

function exportHtmlToPdf(container, options) {
    if (!container || !container.innerHTML.trim()) {
        alert('Não há conteúdo para exportar em PDF.');
        return;
    }

    if (typeof window.html2pdf !== 'function') {
        alert('A biblioteca de PDF não está disponível no momento.');
        return;
    }

    const source = container;
    const clone = source.cloneNode(true);
    clone.style.position = 'relative';
    clone.style.left = '0';
    clone.style.top = '0';
    clone.style.width = '1000px';
    clone.style.maxWidth = '1000px';
    clone.style.margin = '0 auto';
    clone.style.padding = '16px';
    clone.style.background = 'white';
    clone.style.boxSizing = 'border-box';
    clone.style.display = 'block';
    clone.style.zIndex = '1';
    clone.style.overflow = 'visible';
    clone.style.fontFamily = 'Outfit, Arial, sans-serif';

    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.width = '1000px';
    wrapper.style.maxWidth = '1000px';
    wrapper.style.background = 'white';
    wrapper.style.zIndex = '-1';
    wrapper.style.overflow = 'visible';
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    const cleanup = () => {
        if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    };

    const renderPdf = () => {
        const safeOptions = {
            ...options,
            html2canvas: {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                letterRendering: true,
                scrollX: 0,
                scrollY: 0,
                ...(options?.html2canvas || {})
            },
            pagebreak: {
                mode: ['avoid', 'css', 'legacy'],
                ...(options?.pagebreak || {})
            }
        };

        window.html2pdf()
            .set(safeOptions)
            .from(clone)
            .save()
            .then(() => cleanup())
            .catch(err => {
                console.error('Erro ao gerar PDF:', err);
                cleanup();
                alert('Não foi possível gerar o PDF. Verifique o conteúdo e tente novamente.');
            });
    };

    if (document.fonts && typeof document.fonts.ready?.then === 'function') {
        document.fonts.ready.then(renderPdf).catch(renderPdf);
    } else {
        requestAnimationFrame(() => setTimeout(renderPdf, 250));
    }
}

/**
 * Gera um PDF com cabeçalho/gráficos (via html2pdf — captura única, conteúdo pequeno e
 * seguro) seguido de uma ou mais tabelas potencialmente com milhares de linhas, desenhadas
 * diretamente com o jsPDF (texto vetorial, sem rasterizar linha por linha).
 *
 * Por quê: a abordagem anterior (rasterizar a tabela inteira com html2canvas) capturava
 * todo o conteúdo como UM único canvas gigante — com o histórico real (milhares de
 * linhas) isso ultrapassa o limite de tamanho de canvas do navegador e o resultado sai em
 * branco, gerando um PDF com dezenas de páginas vazias. Tentar rasterizar em lotes
 * menores (chamando html2pdf/html2canvas várias vezes em sequência) evita o canvas
 * gigante, mas mostrou-se instável — várias chamadas seguidas à mesma biblioteca podem
 * derrubar o processo do navegador em exportações grandes. Desenhando o texto da tabela
 * diretamente no jsPDF (sem rasterizar), nenhum desses dois problemas ocorre, e como
 * bônus o PDF fica menor e com texto selecionável/pesquisável.
 *
 * @param {object} params
 * @param {string} [params.headerHtml] - cabeçalho/gráficos como HTML, rasterizado via html2canvas (legado —
 *   preferir headerDraw sempre que possível: rasterizar um cabeçalho pequeno ainda é sujeito ao mesmo tipo
 *   de falha silenciosa que já causou o bug das páginas em branco na tabela grande).
 * @param {function(object, {marginH:number, marginV:number, contentWidthMm:number}): Promise<void>} [params.headerDraw]
 *   - desenha o cabeçalho diretamente no jsPDF (sem rasterizar nada) — forma preferida, 100% confiável
 *     independente do tamanho da página por trás. Recebe a instância do pdf já criada.
 * @param {Array<{title:string, columns:Array<{label:string,width:string}>, rows:Array<Array<string|number>>, emptyLabel?:string}>} params.sections
 * @param {object} params.opt - { filename, margin:[v,h], jsPDF:{unit,format,orientation}, image:{quality} }
 */
async function exportSectionedTablesToPdf({ headerHtml, headerDraw, sections, opt }) {
    const marginArr = Array.isArray(opt.margin) ? opt.margin : [opt.margin || 10, opt.margin || 10];
    const marginV = marginArr[0];
    const marginH = marginArr[1] !== undefined ? marginArr[1] : marginArr[0];
    const jsPdfOpts = opt.jsPDF || { unit: 'mm', format: 'a4', orientation: 'portrait' };

    let pdf;
    let cleanup = () => {};

    try {
        if (headerDraw) {
            if (typeof window.html2pdf !== 'function') {
                alert('A biblioteca de PDF não está disponível no momento.');
                return;
            }
            // Caminho nativo: a única rasterização de HTML é a de um elemento trivial de
            // 1 linha, só para obter uma instância válida do jsPDF (o bundle usado aqui
            // não expõe o construtor jsPDF como global). O cabeçalho em si é desenhado
            // depois direto no jsPDF — então não existe captura que possa sair em
            // branco/cortada por causa do tamanho da página real por trás (o bug que
            // afetava a versão anterior, baseada em html2canvas, em produção).
            // html2pdf sempre incorpora o elemento capturado como imagem na página (não existe
            // um jeito de só "pegar uma instância vazia"), então esse elemento precisa ter fundo
            // branco opaco explícito — sem isso, a área transparente vira preto ao converter pra
            // JPEG e essa imagem preta acaba esticada pela página inteira, por trás do conteúdo
            // desenhado nativamente logo em seguida.
            const bootstrapEl = document.createElement('div');
            bootstrapEl.style.position = 'fixed';
            bootstrapEl.style.left = '-9999px';
            bootstrapEl.style.top = '0';
            bootstrapEl.style.width = '10px';
            bootstrapEl.style.height = '10px';
            bootstrapEl.style.background = '#ffffff';
            document.body.appendChild(bootstrapEl);
            try {
                pdf = await window.html2pdf().set({ margin: 0, jsPDF: jsPdfOpts }).from(bootstrapEl).toPdf().get('pdf');
            } finally {
                if (bootstrapEl.parentNode) bootstrapEl.parentNode.removeChild(bootstrapEl);
            }
            const contentWidthMm0 = pdf.internal.pageSize.getWidth() - marginH * 2;
            await headerDraw(pdf, { marginH, marginV, contentWidthMm: contentWidthMm0 });
        } else {
            if (typeof window.html2pdf !== 'function') {
                alert('A biblioteca de PDF não está disponível no momento.');
                return;
            }
            const staging = document.createElement('div');
            staging.style.position = 'fixed';
            staging.style.left = '-9999px';
            staging.style.top = '0';
            staging.innerHTML = `<div style="width:1000px; padding:16px; box-sizing:border-box; background:white; font-family:'Outfit', Arial, sans-serif; color:#24305e;">${headerHtml}</div>`;
            document.body.appendChild(staging);
            cleanup = () => { if (staging.parentNode) staging.parentNode.removeChild(staging); };

            if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }

            // Única chamada ao html2pdf — só para o cabeçalho/gráficos (pequeno e seguro).
            // `.get('pdf')` devolve a instância real do jsPDF, que reaproveitamos abaixo
            // pra desenhar as tabelas nativamente, sem precisar chamar html2pdf de novo.
            pdf = await window.html2pdf()
                .set({
                    margin: marginArr,
                    image: { type: 'jpeg', quality: (opt.image && opt.image.quality) || 0.95 },
                    html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false, letterRendering: true },
                    jsPDF: jsPdfOpts,
                    pagebreak: { mode: ['avoid', 'css', 'legacy'] }
                })
                .from(staging.firstElementChild)
                .toPdf()
                .get('pdf');
        }

        const pageWidthMm = pdf.internal.pageSize.getWidth();
        const pageHeightMm = pdf.internal.pageSize.getHeight();
        const contentWidthMm = pageWidthMm - marginH * 2;
        const contentBottomMm = pageHeightMm - marginV;

        const FONT_SIZE = 8.5;
        const LINE_HEIGHT_MM = 4;
        const ROW_PADDING_MM = 1.5;

        sections.forEach(section => {
            pdf.addPage();
            let y = marginV + 4;

            const colWidths = section.columns.map(c => (contentWidthMm * parseFloat(c.width)) / 100);
            const colX = [];
            let acc = marginH;
            colWidths.forEach(w => { colX.push(acc); acc += w; });

            pdf.setFont(undefined, 'bold');
            pdf.setFontSize(12);
            pdf.setTextColor(0, 71, 171);
            pdf.text(section.title, marginH, y);
            y += 7;

            const drawColumnHeaders = () => {
                pdf.setFillColor(243, 246, 255);
                pdf.rect(marginH, y - 3.5, contentWidthMm, 6, 'F');
                pdf.setFont(undefined, 'bold');
                pdf.setFontSize(FONT_SIZE);
                pdf.setTextColor(43, 58, 85);
                section.columns.forEach((col, i) => pdf.text(String(col.label), colX[i] + 1, y));
                y += 5.5;
                pdf.setFont(undefined, 'normal');
                pdf.setTextColor(50, 50, 50);
                pdf.setFontSize(FONT_SIZE);
            };

            drawColumnHeaders();

            if (!section.rows || section.rows.length === 0) {
                pdf.setTextColor(120, 120, 120);
                pdf.text(section.emptyLabel || 'Nenhum registro', marginH, y);
                return;
            }

            section.rows.forEach(rowFields => {
                const wrapped = rowFields.map((field, i) => pdf.splitTextToSize(String(field ?? '-'), Math.max(4, colWidths[i] - 2)));
                const rowLines = Math.max(1, ...wrapped.map(w => w.length));
                const rowHeightMm = rowLines * LINE_HEIGHT_MM + ROW_PADDING_MM;

                if (y + rowHeightMm > contentBottomMm) {
                    pdf.addPage();
                    y = marginV + 4;
                    drawColumnHeaders();
                }

                wrapped.forEach((lines, i) => {
                    pdf.text(lines, colX[i] + 1, y + LINE_HEIGHT_MM - 1);
                });
                y += rowHeightMm;
                pdf.setDrawColor(230, 230, 230);
                pdf.line(marginH, y - 1, marginH + contentWidthMm, y - 1);
            });
        });

        pdf.save(opt.filename || 'documento.pdf');
    } catch (err) {
        console.error('Erro ao gerar PDF (seccionado):', err);
        alert('Não foi possível gerar o PDF. Tente novamente ou aplique um filtro para reduzir o período.');
    } finally {
        cleanup();
    }
}

window.exportHistoryCSV = function() {
    let { filteredVisits, filteredResolved } = getFilteredHistoryData();
    filteredVisits = [...filteredVisits].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filteredVisits.length === 0 && filteredResolved.length === 0) {
        alert('Não há dados para exportar no histórico com os filtros atuais.');
        return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFFTipo;Data;Loja;Rede;Produto;Produtos Pendentes;Status;Visita;Pontos Extras;Observações\n';
    filteredVisits.forEach(v => {
        const store = stores.find(s => s.id === v.storeId);
        const ruptureNames = (v.ruptures || []).map(r => {
            const p = products.find(prod => prod.id === r);
            return p ? p.name : String(r);
        }).join(' | ');
        const pendingRuptureNames = (v.ruptures || []).filter(r => {
            const status = getResolvedItemStatus(r, v.storeId, v.id);
            return !status.isResolved;
        }).map(r => {
            const p = products.find(prod => prod.id === r);
            return p ? p.name : String(r);
        }).join(' | ');
        const extraPointsNames = (v.extraPoints || []).join(" | ");
        const summary = getVisitResolutionSummary(v);
        csvContent += [
            'Visita',
            formatDate(v.date),
            store ? store.name : 'N/A',
            store ? store.network : 'N/A',
            ruptureNames,
            pendingRuptureNames,
            summary.label,
            summary.totalItems === 0 ? 'Sem rupturas' : `${summary.resolvedCount}/${summary.totalItems}`,
            extraPointsNames,
            v.notes || ''
        ].join(';') + '\n';
    });

    filteredResolved.forEach(item => {
        csvContent += [
            'Resolvido',
            item.resolvedAt ? formatDate(item.resolvedAt) : '-',
            item.storeName || 'N/A',
            '-',
            item.productName || 'N/A',
            '-',
            'Resolvido',
            item.visitDate ? formatDate(item.visitDate) : '-',
            ''
        ].join(';') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historico_hiperroll_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Cabeçalho do PDF de Rupturas — mesmo tratamento visual do Relatório de Visitas
// (título/selo + gráficos de Status/Top Produtos + quadro de Principais Insights),
// desenhado nativamente. `data` vem de buildVisitsChartsAndInsights(filteredVisits),
// já calculado em cima do recorte de dados que o usuário tem filtrado na tela.
async function drawHistoryHeaderNative(pdf, { marginH, marginV, contentWidthMm }, data) {
    const pageHeightMm = pdf.internal.pageSize.getHeight();
    const contentBottomMm = pageHeightMm - marginV;

    let y = drawPdfTitleAndBadge(pdf, { marginH, marginV, contentWidthMm, subtitle: 'Histórico de Rupturas Trade Marketing', subtitleColor: [227, 30, 36] });

    if (data) {
        y = drawPdfChartsRow(pdf, { marginH, y, contentWidthMm }, {
            donutChartUrl: data.donutChartUrl,
            donutLegendTitle: 'Composição por Rede (Sem/Com Ruptura)',
            donutLegendLines: [`Sem Ruptura: ${data.strOk}`, `Com Ruptura: ${data.strRup}`],
            barChartUrl: data.barChartUrl,
            barLegendTitle: 'Detalhamento das Faltas (Por Rede)',
            barLegendLines: data.topProductsList.map(p => `${p.name}: ${data.formatProductNetStr(p.networks)}`)
        });

        drawPdfInsightsBox(pdf, { marginH, marginV, contentWidthMm, contentBottomMm, y }, data.insights);
    }
}

window.exportHistoryPDF = async function() {
    let { filteredVisits, filteredResolved } = getFilteredHistoryData();
    filteredVisits = [...filteredVisits].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filteredVisits.length === 0 && filteredResolved.length === 0) {
        alert('Não há dados para exportar no histórico com os filtros atuais.');
        return;
    }

    const opt = {
        margin: [6, 6],
        filename: `Historico_Hiperroll_${new Date().toLocaleDateString()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    const visitsRows = filteredVisits.map(v => {
        const store = stores.find(s => s.id === v.storeId) || { name: 'N/A', network: 'N/A' };
        const summary = getVisitResolutionSummary(v);
        const extraPts = (v.extraPoints || []).join(', ') || '-';
        return [
            formatDate(v.date),
            store.name,
            store.network,
            formatRupturesCellText(v.ruptures),
            summary.label,
            extraPts,
            v.notes || '-'
        ];
    });

    const resolvedRows = filteredResolved.map(item => [
        item.productName || 'Produto',
        item.storeName || 'Loja',
        item.visitDate ? formatDate(item.visitDate) : '-',
        item.resolvedAt ? formatDate(item.resolvedAt) : '-',
        'Resolvido'
    ]);

    const chartsData = await buildVisitsChartsAndInsights(filteredVisits);

    await exportSectionedTablesToPdf({
        headerDraw: (pdf, ctx) => drawHistoryHeaderNative(pdf, ctx, chartsData),
        opt,
        sections: [
            {
                title: 'Rupturas não resolvidas',
                emptyLabel: 'Nenhuma visita no filtro',
                columns: [
                    { label: 'Data', width: '11%' },
                    { label: 'Loja', width: '18%' },
                    { label: 'Rede', width: '10%' },
                    { label: 'Rupturas', width: '8%' },
                    { label: 'Status', width: '15%' },
                    { label: 'Pontos Extras', width: '16%' },
                    { label: 'Observações', width: '22%' }
                ],
                rows: visitsRows
            },
            {
                title: 'Rupturas resolvidas',
                emptyLabel: 'Nenhuma ruptura resolvida no filtro',
                columns: [
                    { label: 'Produto', width: '22%' },
                    { label: 'Loja', width: '22%' },
                    { label: 'Visita', width: '18%' },
                    { label: 'Resolvido em', width: '18%' },
                    { label: 'Status', width: '20%' }
                ],
                rows: resolvedRows
            }
        ]
    });
};

// Desenha uma caixa com borda arredondada, título e linhas de texto (já quebradas
// pra caber em `w`), com altura calculada a partir do conteúdo — nunca corta nada,
// diferente da versão anterior baseada em captura de imagem. Retorna o Y final.
function drawPdfLegendBox(pdf, x, topY, w, title, lines) {
    const innerW = w - 10;
    pdf.setFontSize(8.5);
    const wrapped = lines.map(l => pdf.splitTextToSize(l, innerW));
    const totalLines = wrapped.reduce((sum, w2) => sum + w2.length, 0);
    const boxH = 8 + totalLines * 4 + Math.max(0, lines.length - 1) * 1.5 + 5;

    pdf.setFillColor(249, 249, 249);
    pdf.setDrawColor(238, 238, 238);
    pdf.roundedRect(x, topY, w, boxH, 2, 2, 'FD');

    let ly = topY + 6;
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(0, 71, 171);
    pdf.text(title, x + 5, ly);
    ly += 4;
    pdf.setDrawColor(224, 224, 224);
    pdf.line(x + 5, ly - 2.5, x + w - 5, ly - 2.5);
    ly += 1.5;

    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(85, 85, 85);
    wrapped.forEach(wLines => {
        pdf.text(wLines, x + 5, ly);
        ly += wLines.length * 4 + 1.5;
    });

    return topY + boxH;
}

// Título "Hiperroll Embalagens" + subtítulo + data + responsável (esquerda) e selo
// HIPERROLL (direita) + linha divisória — comum a todos os cabeçalhos de PDF do
// sistema. Retorna o Y logo abaixo da linha, pronto para o próximo bloco.
function drawPdfTitleAndBadge(pdf, { marginH, marginV, contentWidthMm, subtitle, subtitleColor }) {
    const y = marginV + 8;
    const badgeW = 58, badgeH = 15;

    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(17);
    pdf.setTextColor(0, 71, 171);
    pdf.text('Hiperroll Embalagens', marginH, y);

    pdf.setFontSize(12);
    const [sr, sg, sb] = subtitleColor || [227, 30, 36];
    pdf.setTextColor(sr, sg, sb);
    pdf.text(subtitle, marginH, y + 6.5);

    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(102, 102, 102);
    pdf.text('Gerado em: ' + new Date().toLocaleString(), marginH, y + 11.5);

    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(51, 51, 51);
    pdf.text('Responsável: Nicole Portela - Trade Marketing', marginH, y + 16.5);

    const badgeX = marginH + contentWidthMm - badgeW;
    const badgeY = y - 6;
    pdf.setFillColor(0, 71, 171);
    pdf.roundedRect(badgeX, badgeY, badgeW, badgeH, 3, 3, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(13);
    pdf.text('HIPERROLL', badgeX + badgeW / 2, badgeY + badgeH / 2 + 1.5, { align: 'center' });
    pdf.setTextColor(0, 71, 171);
    pdf.setFontSize(7.5);
    pdf.text('INTELIGÊNCIA EM TRADE', badgeX + badgeW / 2, badgeY + badgeH + 5, { align: 'center' });

    const ruleY = y + 20;
    pdf.setDrawColor(0, 71, 171);
    pdf.setLineWidth(0.6);
    pdf.line(marginH, ruleY, marginH + contentWidthMm, ruleY);
    pdf.setLineWidth(0.2);

    return ruleY + 8;
}

// Caixas de filtro em linha (rótulo + valor) — reflete os filtros que o usuário
// aplicou na tela antes de exportar. Retorna o Y logo abaixo das caixas.
function drawPdfFilterBoxes(pdf, { marginH, y, contentWidthMm }, filters) {
    const boxGap = 5;
    const boxW = (contentWidthMm - boxGap * (filters.length - 1)) / filters.length;
    const boxH = 15;
    filters.forEach((f, i) => {
        const bx = marginH + i * (boxW + boxGap);
        pdf.setDrawColor(225, 233, 255);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(bx, y, boxW, boxH, 2, 2, 'FD');
        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(13, 59, 127);
        pdf.text(f.label, bx + 4, y + 6);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(51, 51, 51);
        const valueLines = pdf.splitTextToSize(f.value, boxW - 8).slice(0, 2);
        pdf.text(valueLines, bx + 4, y + 11);
    });
    return y + boxH + 10;
}

// Gráfico de rosca + gráfico de barras lado a lado, cada um com sua legenda
// (ambos opcionais). Retorna o Y logo abaixo do mais alto dos dois.
function drawPdfChartsRow(pdf, { marginH, y, contentWidthMm }, { donutChartUrl, donutLegendTitle, donutLegendLines, barChartUrl, barLegendTitle, barLegendLines }) {
    const colGap = 10;
    const colW = (contentWidthMm - colGap) / 2;
    const chartsTopY = y;

    const donutAspect = 350 / 250;
    const donutW = Math.min(colW * 0.7, 68);
    const donutH = donutW / donutAspect;
    const donutX = marginH + (colW - donutW) / 2;
    if (donutChartUrl) { try { pdf.addImage(donutChartUrl, 'PNG', donutX, chartsTopY, donutW, donutH); } catch (e) {} }
    let leftBottomY = chartsTopY + donutH + 4;
    if (donutLegendLines && donutLegendLines.length > 0) {
        const legendW1 = colW * 0.9;
        const legendX1 = marginH + (colW - legendW1) / 2;
        leftBottomY = drawPdfLegendBox(pdf, legendX1, leftBottomY, legendW1, donutLegendTitle, donutLegendLines);
    }

    const barAspect = 500 / 250;
    const barColX = marginH + colW + colGap;
    const barW = Math.min(colW * 0.85, 95);
    const barH = barW / barAspect;
    const barImgX = barColX + (colW - barW) / 2;
    if (barChartUrl) { try { pdf.addImage(barChartUrl, 'PNG', barImgX, chartsTopY, barW, barH); } catch (e) {} }
    let rightBottomY = chartsTopY + barH + 4;
    if (barLegendLines && barLegendLines.length > 0) {
        const legendW2 = colW * 0.95;
        const legendX2 = barColX + (colW - legendW2) / 2;
        rightBottomY = drawPdfLegendBox(pdf, legendX2, rightBottomY, legendW2, barLegendTitle, barLegendLines);
    }

    return Math.max(leftBottomY, rightBottomY) + 8;
}

// Quadro "Principais Insights" — altura calculada a partir do texto real, então
// nunca corta; se não couber no resto da página, pula pra próxima automaticamente.
function drawPdfInsightsBox(pdf, { marginH, marginV, contentWidthMm, contentBottomMm, y }, insights) {
    const innerW2 = contentWidthMm - 16;
    pdf.setFontSize(9.5);
    const sentenceLines = insights.sentences.map(s => pdf.splitTextToSize(s, innerW2));
    const detailLines = insights.details.map(d => pdf.splitTextToSize('• ' + d, innerW2 - 4));
    const sentencesTotalLines = sentenceLines.reduce((s, l) => s + l.length, 0);
    const detailsTotalLines = detailLines.reduce((s, l) => s + l.length, 0);
    const insightsH = 10 + sentencesTotalLines * 5 + (insights.details.length > 0 ? (4 + detailsTotalLines * 5) : 0) + 8;

    if (y + insightsH > contentBottomMm) {
        pdf.addPage();
        y = marginV + 8;
    }

    pdf.setFillColor(244, 248, 255);
    pdf.setDrawColor(216, 231, 255);
    pdf.roundedRect(marginH, y, contentWidthMm, insightsH, 3, 3, 'FD');

    let iy = y + 9;
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(13, 59, 127);
    pdf.text('Principais Insights', marginH + 8, iy);
    iy += 7;

    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(36, 48, 94);
    sentenceLines.forEach(lines => {
        pdf.text(lines, marginH + 8, iy);
        iy += lines.length * 5;
    });

    if (insights.details.length > 0) {
        iy += 2;
        pdf.setTextColor(45, 63, 105);
        detailLines.forEach(lines => {
            pdf.text(lines, marginH + 12, iy);
            iy += lines.length * 5;
        });
    }

    return y + insightsH;
}

// Monta os dois gráficos (rosca "Status das Visitas" + barras "Top 5 Produtos em
// Ruptura") e o quadro de insights a partir de uma lista de visitas — reaproveitado
// tanto pelo Relatório de Visitas quanto pelo PDF de Rupturas, cada um com seu
// próprio recorte de dados (mas o mesmo tipo de gráfico/insight).
async function buildVisitsChartsAndInsights(filteredVisits) {
    const productRuptureData = {};
    filteredVisits.forEach(v => {
        const store = stores.find(s => s.id === v.storeId);
        const net = store && store.network ? store.network : 'Outros';
        (v.ruptures || []).forEach(pId => {
            if (!productRuptureData[pId]) productRuptureData[pId] = { count: 0, networks: {} };
            productRuptureData[pId].count += 1;
            productRuptureData[pId].networks[net] = (productRuptureData[pId].networks[net] || 0) + 1;
        });
    });

    const topProductsList = Object.entries(productRuptureData)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([pId, data]) => {
            const p = products.find(prod => String(prod.id) === String(pId));
            return { name: p ? p.name : `Produto ${pId}`, count: data.count, networks: data.networks };
        });

    const formatProductNetStr = (netObj) => Object.entries(netObj)
        .sort((a, b) => b[1] - a[1])
        .map(([n, c]) => `${n} (${c}x)`)
        .join(', ');

    const barChartConfig = {
        type: 'bar',
        data: {
            labels: topProductsList.map(p => p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name),
            datasets: [{ label: 'Faltas Registradas', data: topProductsList.map(p => p.count), backgroundColor: '#0047AB', borderRadius: 4 }]
        },
        options: {
            plugins: { title: { display: true, text: 'Top 5 Produtos em Ruptura', font: { size: 14 } } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Lojas Afetadas (Qtd)', font: { size: 11, weight: 'bold' } } } }
        }
    };

    const visitsWithRupture = filteredVisits.filter(v => v.ruptures && v.ruptures.length > 0).length;
    const visitsWithout = filteredVisits.length - visitsWithRupture;

    const okNetworks = {}, rupNetworks = {};
    filteredVisits.forEach(v => {
        const store = stores.find(s => s.id === v.storeId);
        const net = store && store.network ? store.network : 'Outros';
        if (v.ruptures && v.ruptures.length > 0) rupNetworks[net] = (rupNetworks[net] || 0) + 1;
        else okNetworks[net] = (okNetworks[net] || 0) + 1;
    });
    const formatNetStr = (netObj, totalCat) => Object.entries(netObj)
        .sort((a, b) => b[1] - a[1])
        .map(([n, c]) => `${n} (${Math.round((c / totalCat) * 100)}%)`)
        .join(', ');
    const strOk = visitsWithout > 0 ? formatNetStr(okNetworks, visitsWithout) : 'N/A';
    const strRup = visitsWithRupture > 0 ? formatNetStr(rupNetworks, visitsWithRupture) : 'N/A';

    const donutChartConfig = {
        type: 'doughnut',
        data: { labels: ['Com Ruptura', 'Sem Ruptura'], datasets: [{ data: [visitsWithRupture, visitsWithout], backgroundColor: ['#E31E24', '#27ae60'] }] },
        plugins: [{
            id: 'textInside',
            afterDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    chart.getDatasetMeta(i).data.forEach((element, index) => {
                        const data = dataset.data[index];
                        if (data > 0) {
                            const total = dataset.data.reduce((a, b) => a + b, 0);
                            const percent = Math.round((data / total) * 100) + '%';
                            ctx.fillStyle = 'white';
                            ctx.font = 'bold 16px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            const position = element.tooltipPosition();
                            ctx.fillText(percent, position.x, position.y);
                        }
                    });
                });
            }
        }],
        options: { plugins: { title: { display: true, text: 'Status das Visitas', font: { size: 14 } }, legend: { position: 'bottom' } } }
    };

    const barChartUrl = await generateChartImage(barChartConfig, 500, 250);
    const donutChartUrl = await generateChartImage(donutChartConfig, 350, 250);
    const insights = computeReportInsights(filteredVisits);

    return { donutChartUrl, barChartUrl, strOk, strRup, topProductsList, formatProductNetStr, insights };
}

// Desenha o cabeçalho completo do "Relatório de Visitas" (título, badge, filtros,
// os dois gráficos + legendas e o quadro de Principais Insights) direto no jsPDF,
// sem rasterizar nenhum HTML — elimina de vez a classe de bug em que a captura de
// imagem saía em branco/cortada em produção (base grande de dados por trás).
async function drawVisitsReportHeaderNative(pdf, { marginH, marginV, contentWidthMm }, data) {
    const { startDate, endDate, isAllSelected, selectedNetworks, reportFilterOnlyRuptures, insights } = data;
    const pageHeightMm = pdf.internal.pageSize.getHeight();
    const contentBottomMm = pageHeightMm - marginV;

    let y = drawPdfTitleAndBadge(pdf, { marginH, marginV, contentWidthMm, subtitle: 'Relatório de Visitas Trade Marketing', subtitleColor: [227, 30, 36] });

    y = drawPdfFilterBoxes(pdf, { marginH, y, contentWidthMm }, [
        { label: 'Período', value: `${startDate || 'Início'} até ${endDate || 'Fim'}` },
        { label: 'Rede', value: isAllSelected ? 'Todas as Redes' : selectedNetworks.join(', ') },
        { label: 'Rupturas', value: reportFilterOnlyRuptures ? 'Somente visitas com ruptura' : 'Todas as visitas' }
    ]);

    y = drawPdfChartsRow(pdf, { marginH, y, contentWidthMm }, {
        donutChartUrl: data.donutChartUrl,
        donutLegendTitle: 'Composição por Rede (Sem/Com Ruptura)',
        donutLegendLines: [`Sem Ruptura: ${data.strOk}`, `Com Ruptura: ${data.strRup}`],
        barChartUrl: data.barChartUrl,
        barLegendTitle: 'Detalhamento das Faltas (Por Rede)',
        barLegendLines: data.topProductsList.map(p => `${p.name}: ${data.formatProductNetStr(p.networks)}`)
    });

    drawPdfInsightsBox(pdf, { marginH, marginV, contentWidthMm, contentBottomMm, y }, insights);
}

window.exportVisitsPDF = async function() {
    const element = document.querySelector('.reports-container');
    const filteredVisits = getFilteredReportVisits().sort((a, b) => new Date(b.date) - new Date(a.date));
    const { selectedNetworks, isAllSelected, startDate, endDate } = getReportFilterSettings();

    if (filteredVisits.length === 0) {
        alert('Não há dados para exportar. Ajuste os filtros ou registre visitas antes.');
        return;
    }

    const filenameNetwork = !isAllSelected ? selectedNetworks.join('_').substring(0, 40).replace(/\s+/g, '_') : 'Geral';
    const opt = {
        margin:       [10, 10],
        filename:     `Relatorio_Trade_Hiperroll_${filenameNetwork}_${new Date().toLocaleDateString()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    const chartsData = await buildVisitsChartsAndInsights(filteredVisits);
    const headerData = { startDate, endDate, isAllSelected, selectedNetworks, reportFilterOnlyRuptures, ...chartsData };

    await exportSectionedTablesToPdf({
        headerDraw: (pdf, ctx) => drawVisitsReportHeaderNative(pdf, ctx, headerData),
        opt,
        sections: [
            {
                title: 'Visitas Incluídas no Relatório',
                emptyLabel: 'Nenhuma visita no filtro',
                columns: [
                    { label: 'Data', width: '13%' },
                    { label: 'Loja', width: '22%' },
                    { label: 'Rede', width: '13%' },
                    { label: 'Rupturas', width: '10%' },
                    { label: 'Pontos Extras', width: '20%' },
                    { label: 'Observações', width: '22%' }
                ],
                rows: buildReportTableRows(filteredVisits)
            }
        ]
    });
};

// Dados (texto puro) do resumo executivo de lojas pendentes/em atraso — mesmo
// formato de computeReportInsights, pra reaproveitar drawPdfInsightsBox.
function computePendingStoresInsights(pendingStores) {
    const overdueCounts = pendingStores.filter(s => s.currentStatus === 'overdue').length;
    const pendingCounts = pendingStores.filter(s => s.currentStatus === 'pending' || s.status === 'pending').length;
    const networkMap = {};
    const neverVisited = pendingStores.filter(s => !s.lastVisit).length;

    pendingStores.forEach(s => {
        const net = s.network || 'Não informada';
        networkMap[net] = (networkMap[net] || 0) + 1;
    });

    const topNetwork = Object.entries(networkMap).sort((a, b) => b[1] - a[1])[0] || ['Nenhuma', 0];
    const overduePct = Math.round((overdueCounts / pendingStores.length) * 100);

    return {
        sentences: [
            `Lojas no relatório: ${pendingStores.length}.`,
            `Em atraso: ${overdueCounts} (${overduePct}%).`,
            `Pendentes de visita: ${pendingCounts}.`,
            `Nunca visitadas: ${neverVisited}.`,
            `Rede mais afetada: ${topNetwork[0]} (${topNetwork[1]} lojas).`
        ],
        details: ['Prioridade: agendar visitas para as lojas em atraso o quanto antes.']
    };
}

// Monta o gráfico de rosca (Atrasado/Pendente) e de barras (top redes) para o
// relatório de lojas pendentes, no mesmo espírito de buildVisitsChartsAndInsights.
async function buildPendingStoresCharts(pendingStores) {
    const overdueCounts = pendingStores.filter(s => s.currentStatus === 'overdue').length;
    const pendingCounts = pendingStores.length - overdueCounts;

    const donutChartConfig = {
        type: 'doughnut',
        data: { labels: ['Atrasado', 'Pendente'], datasets: [{ data: [overdueCounts, pendingCounts], backgroundColor: ['#E31E24', '#FFC107'] }] },
        plugins: [{
            id: 'textInside',
            afterDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    chart.getDatasetMeta(i).data.forEach((element, index) => {
                        const data = dataset.data[index];
                        if (data > 0) {
                            const total = dataset.data.reduce((a, b) => a + b, 0);
                            const percent = Math.round((data / total) * 100) + '%';
                            ctx.fillStyle = 'white';
                            ctx.font = 'bold 16px sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            const position = element.tooltipPosition();
                            ctx.fillText(percent, position.x, position.y);
                        }
                    });
                });
            }
        }],
        options: { plugins: { title: { display: true, text: 'Status das Lojas', font: { size: 14 } }, legend: { position: 'bottom' } } }
    };

    const networkCounts = {};
    pendingStores.forEach(s => { const n = s.network || 'Não informada'; networkCounts[n] = (networkCounts[n] || 0) + 1; });
    const topNets = Object.entries(networkCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const barChartConfig = {
        type: 'bar',
        data: { labels: topNets.map(([n]) => n), datasets: [{ label: 'Lojas Pendentes', data: topNets.map(([, c]) => c), backgroundColor: '#0047AB', borderRadius: 4 }] },
        options: {
            plugins: { title: { display: true, text: 'Top Redes com Mais Lojas Pendentes', font: { size: 14 } } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    };

    const donutChartUrl = await generateChartImage(donutChartConfig, 350, 250);
    const barChartUrl = await generateChartImage(barChartConfig, 500, 250);

    const total = pendingStores.length;
    const statusSummary = `Atrasado: ${overdueCounts} (${Math.round((overdueCounts / total) * 100)}%) — Pendente: ${pendingCounts} (${Math.round((pendingCounts / total) * 100)}%)`;

    return { donutChartUrl, barChartUrl, statusSummary, topNets };
}

// Cabeçalho do PDF de Lojas Pendentes/Em Atraso — título/selo + gráficos + insights,
// desenhado nativamente (sem rasterizar tabela nenhuma, ao contrário da versão
// anterior que capturava a lista inteira como uma única imagem e saía em branco).
async function drawPendingStoresHeaderNative(pdf, { marginH, marginV, contentWidthMm }, data) {
    const pageHeightMm = pdf.internal.pageSize.getHeight();
    const contentBottomMm = pageHeightMm - marginV;

    let y = drawPdfTitleAndBadge(pdf, { marginH, marginV, contentWidthMm, subtitle: 'Relatório de Lojas Pendentes / Em Atraso', subtitleColor: [227, 30, 36] });

    y = drawPdfChartsRow(pdf, { marginH, y, contentWidthMm }, {
        donutChartUrl: data.donutChartUrl,
        donutLegendTitle: 'Resumo por Status',
        donutLegendLines: [data.statusSummary],
        barChartUrl: data.barChartUrl,
        barLegendTitle: 'Top Redes (Lojas Pendentes)',
        barLegendLines: data.topNets.map(([n, c]) => `${n}: ${c} loja(s)`)
    });

    drawPdfInsightsBox(pdf, { marginH, marginV, contentWidthMm, contentBottomMm, y }, data.insights);
}

window.exportDashboardPDF = async function() {
    const fStores = typeof getGlobalFilteredStores === 'function' ? getGlobalFilteredStores() : stores;
    const pendingStores = fStores.filter(s => s.currentStatus === 'overdue' || s.currentStatus === 'pending' || s.status === 'pending');

    if (pendingStores.length === 0) {
        alert('Não há lojas pendentes ou em atraso para exportar.');
        return;
    }

    const opt = {
        margin: [10, 10],
        filename: `Relatorio_Lojas_Pendentes_${new Date().toLocaleDateString()}.pdf`,
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    const chartsData = await buildPendingStoresCharts(pendingStores);
    const insights = computePendingStoresInsights(pendingStores);
    const headerData = { ...chartsData, insights };

    const rows = pendingStores.map(s => {
        const statusStr = s.currentStatus === 'overdue' ? 'Atrasado' : 'Pendente';
        const lastVisitStr = s.lastVisit ? formatDate(s.lastVisit) : 'Nunca visitada';
        return [s.name, s.network, statusStr, lastVisitStr];
    });

    await exportSectionedTablesToPdf({
        headerDraw: (pdf, ctx) => drawPendingStoresHeaderNative(pdf, ctx, headerData),
        opt,
        sections: [
            {
                title: 'Lojas Pendentes / Em Atraso',
                emptyLabel: 'Nenhuma loja pendente',
                columns: [
                    { label: 'Loja', width: '35%' },
                    { label: 'Rede', width: '20%' },
                    { label: 'Status', width: '20%' },
                    { label: 'Última Visita', width: '25%' }
                ],
                rows
            }
        ]
    });
};

window.toggleRuptureFilter = function() {
    reportFilterOnlyRuptures = !reportFilterOnlyRuptures;
    const btn = document.getElementById('reportRuptureFilterBtn');
    if (btn) {
        if (reportFilterOnlyRuptures) {
            btn.style.background = 'var(--primary-red, #E31E24)';
            btn.style.color = 'white';
            btn.style.borderColor = 'var(--primary-red, #E31E24)';
        } else {
            btn.style.background = 'white';
            btn.style.color = 'var(--text-dark)';
            btn.style.borderColor = '#eee';
        }
    }
    renderReportsTable();
};

window.toggleReportObservationFilter = function() {
    reportFilterOnlyObservation = !reportFilterOnlyObservation;
    const btn = document.getElementById('reportObservationFilterBtn');
    if (btn) {
        if (reportFilterOnlyObservation) {
            btn.style.background = 'var(--primary-red, #E31E24)';
            btn.style.color = 'white';
            btn.style.borderColor = 'var(--primary-red, #E31E24)';
        } else {
            btn.style.background = 'white';
            btn.style.color = 'var(--text-dark)';
            btn.style.borderColor = '#eee';
        }
    }
    renderReportsTable();
};

window.toggleReportExtraVisitsFilter = function() {
    reportFilterOnlyExtraVisits = !reportFilterOnlyExtraVisits;
    const btn = document.getElementById('reportExtraVisitsFilterBtn');
    if (btn) {
        if (reportFilterOnlyExtraVisits) {
            btn.style.background = 'var(--primary-red, #E31E24)';
            btn.style.color = 'white';
            btn.style.borderColor = 'var(--primary-red, #E31E24)';
        } else {
            btn.style.background = 'white';
            btn.style.color = 'var(--text-dark)';
            btn.style.borderColor = '#eee';
        }
    }
    renderReportsTable();
};

window.toggleReportExtraPointsFilter = function() {
    reportFilterOnlyExtraPoints = !reportFilterOnlyExtraPoints;
    const btn = document.getElementById('reportExtraPointsFilterBtn');
    if (btn) {
        if (reportFilterOnlyExtraPoints) {
            btn.style.background = 'var(--primary-red, #E31E24)';
            btn.style.color = 'white';
            btn.style.borderColor = 'var(--primary-red, #E31E24)';
        } else {
            btn.style.background = 'white';
            btn.style.color = 'var(--text-dark)';
            btn.style.borderColor = '#eee';
        }
    }
    renderReportsTable();
};

function updateNotifications() {
    const badge = document.getElementById('notificationBadge');
    const list = document.getElementById('notificationList');
    if (!badge || !list) return;

    const notifications = [];

    // 1. Alertas de Atraso Crítico (+14 dias)
    stores.forEach(s => {
        if (s.lastVisit) {
            const last = new Date(s.lastVisit + 'T12:00:00');
            const diff = Math.floor((new Date() - last) / (1000 * 60 * 60 * 24));
            if (diff >= 14) {
                const notifId = `overdue-${s.id}-${s.lastVisit}`;
                if (!dismissedNotifications.includes(notifId)) {
                    notifications.push({
                        id: notifId,
                        type: 'danger',
                        icon: 'fa-calendar-xmark',
                        title: 'Atraso Crítico',
                        text: `${s.name} sem visita há ${diff} dias.`
                    });
                }
            }
        }
    });

    // 2. Rupturas não validadas (Alertas Recentes)
    visits.forEach(v => {
        if (v.ruptures && v.ruptures.length > 0) {
            v.ruptures.forEach(pId => {
                const store = stores.find(s => s.id === v.storeId);
                const prod = products.find(p => p.id === pId);
                const notifId = `rupture-${v.id}-${pId}`;
                
                // Só mostra se não foi validada e não foi "limpa/dismissed"
                const isValidated = validatedRuptures.some(r => r.productId === pId && r.storeId === v.storeId);
                if (!isValidated && !dismissedNotifications.includes(notifId)) {
                    notifications.push({
                        id: notifId,
                        type: 'warning',
                        icon: 'fa-triangle-exclamation',
                        title: 'Ruptura Detectada',
                        text: `${prod ? prod.name : 'Item'} em falta no ${store ? store.name : 'PDV'}.`
                    });
                }
            });
        }
    });

    // Atualizar Badge
    if (notifications.length > 0) {
        badge.textContent = notifications.length;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }

    // Renderizar Lista
    if (notifications.length === 0) {
        list.innerHTML = '<div class="notif-empty">Nenhuma notificação nova</div>';
    } else {
        list.innerHTML = notifications.map(n => `
            <div class="notification-item">
                <i class="fa-solid ${n.icon} ${n.type === 'danger' ? 'noti-red' : 'noti-orange'}"></i>
                <div class="noti-content">
                    <strong>${n.title}</strong>
                    <p>${n.text}</p>
                </div>
            </div>
        `).join('');
    }
}

window.clearNotifications = function() {
    const badge = document.getElementById('notificationBadge');
    const list = document.getElementById('notificationList');
    
    const currentNotifs = [];
    stores.forEach(s => {
        if (s.lastVisit) {
            const last = new Date(s.lastVisit + 'T12:00:00');
            const diff = Math.floor((new Date() - last) / (1000 * 60 * 60 * 24));
            if (diff >= 14) currentNotifs.push(`overdue-${s.id}-${s.lastVisit}`);
        }
    });
    visits.forEach(v => {
        if (v.ruptures) {
            v.ruptures.forEach(pId => currentNotifs.push(`rupture-${v.id}-${pId}`));
        }
    });

    dismissedNotifications = [...new Set([...dismissedNotifications, ...currentNotifs])];
    saveAppStateLocally(); // fire and forget
    if (typeof Storage !== 'undefined' && Storage.isServer) syncAppStateServer();

    updateNotifications();
};

// Update badge on init
setTimeout(updateNotifications, 1000);

function renderStatusBadge(store) {
    if (store.currentStatus === 'overdue') return '<span style="color: #e74c3c; font-size: 0.8rem;"><i class="fa-solid fa-triangle-exclamation"></i> Em Atraso</span>';
    if (store.currentStatus === 'visited' || store.status === 'visited') return '<span style="color: #27ae60; font-size: 0.8rem;"><i class="fa-solid fa-circle-check"></i> OK</span>';
    return '<span style="color: #f39c12; font-size: 0.8rem;"><i class="fa-solid fa-clock"></i> Pendente</span>';
}

function populateSelects() {
    storeSelect.innerHTML = '<option value="">Selecione uma loja...</option>';
    stores.forEach(store => {
        const option = document.createElement('option');
        option.value = store.id;
        option.textContent = store.name;
        storeSelect.appendChild(option);
    });
}

function renderChecklist(searchTerm = '', storeProductIds = null) {
    productListChecklist.innerHTML = '';
    const lastRupturesContainer = document.getElementById('lastVisitRuptures');
    if (lastRupturesContainer) lastRupturesContainer.innerHTML = '';
    
    let filteredProducts = products;
    
    // Filtro por termo de busca
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(p => 
            (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    // Filtro por Loja (Opï¿½ï¿½o 2: Apenas itens daquela loja específica)
    if (storeProductIds) {
        filteredProducts = filteredProducts.filter(p => 
            storeProductIds.includes(p.id)
        );
    }

    if (filteredProducts.length === 0) {
        productListChecklist.innerHTML = `<p style="padding: 10px; color: var(--text-muted);">
            ${storeProductIds ? 'Nenhum item cadastrado para esta loja específica.' : 'Selecione uma loja para ver os produtos.'}
        </p>`;
        return;
    }
    
    // Se houver loja selecionada, exibe dados da ÚLTIMA visita (com ou sem rupturas)
    const selectedStoreId = storeSelect ? storeSelect.value : null;
    if (selectedStoreId && lastRupturesContainer) {
        const lastVisit = [...visits].filter(v => v.storeId === selectedStoreId).sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
        if (lastVisit) {
            const formattedDate = lastVisit.date ? formatDate(lastVisit.date) : '';
            if (Array.isArray(lastVisit.ruptures) && lastVisit.ruptures.length > 0) {
                const names = lastVisit.ruptures.map(pid => {
                    const p = products.find(x => x.id === pid);
                    return p ? p.name : pid;
                });
                lastRupturesContainer.innerHTML = `<strong>Rupturas na última visita (${formattedDate}):</strong> <div style="margin-top:6px;">${names.map(n => `<span class="badge-rupture" style="margin-right:6px;">${n}</span>`).join('')}</div>`;
            } else {
                lastRupturesContainer.innerHTML = `<strong>Última visita (${formattedDate}):</strong> <div style="margin-top:6px; color: #27ae60; font-size: 0.9rem;"><i class="fa-solid fa-circle-check"></i> Nenhuma ruptura registrada</div>`;
            }
        }
    }

    filteredProducts.forEach(product => {
        const item = document.createElement('div');
        item.className = 'checklist-item';
        item.innerHTML = `
            <input type="checkbox" id="prod-${product.id}" value="${product.id}" class="rupture-check">
            <label for="prod-${product.id}">${product.name}</label>
        `;
        productListChecklist.appendChild(item);
    });
}

async function handleVisitSubmit(e) {
    e.preventDefault();

    // Trava de segurança contra cliques duplos
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn.disabled) return;

    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

    const storeId = storeSelect.value;
    const notes     = document.getElementById('visitNotes').value;
    const checkedProducts = Array.from(document.querySelectorAll('.rupture-check:checked'))
                                 .map(cb => cb.value);
    const checkedExtraPoints = Array.from(document.querySelectorAll('.extra-point-check:checked'))
                                    .map(cb => cb.value);
    const visitDate = document.getElementById('visitDate').value;
    const isExtra = !!document.getElementById('visitIsExtra')?.checked;

    // ============================================================
    // MODO EDIï¿½AO: sobrepõe a visita existente, sem criar duplicata
    // ============================================================
    if (editingVisitId !== null) {
        const idx = visits.findIndex(v => v.id === editingVisitId);
        if (idx !== -1) {
            const oldVisit = visits[idx];
            const oldStoreId = oldVisit.storeId;

            // Atualiza os campos editáveis (mantém id e fotos originais)
            visits[idx] = {
                ...oldVisit,
                storeId,
                date: visitDate,
                ruptures: checkedProducts,
                extraPoints: checkedExtraPoints,
                isExtra,
                notes,
            };

            // ----------------------------------------------------------
            // Atualiza rupturas validadas:
            // Remove as antigas vinculadas a esta visita (pela loja antiga)
            // e garante que as novas existam.
            // ----------------------------------------------------------
            const oldRuptureIds = oldVisit.ruptures || [];
            const newRuptureIds = checkedProducts;

            // Remove rupturas que foram DESMARCADAS nesta ediï¿½ï¿½o
            oldRuptureIds.forEach(pId => {
                if (!newRuptureIds.includes(pId)) {
                    // Só remove se nenhuma OUTRA visita da mesma loja também reporta esta ruptura
                    const stillReported = visits.some(
                        (v, i) => i !== idx && v.storeId === storeId && v.ruptures && v.ruptures.includes(pId)
                    );
                    if (!stillReported) {
                        validatedRuptures = validatedRuptures.filter(
                            r => !(r.productId === pId && r.storeId === storeId)
                        );
                    }
                }
            });

            // Adiciona rupturas NOVAS que não existiam antes
            newRuptureIds.forEach(pId => {
                const exists = validatedRuptures.find(r => r.productId === pId && r.storeId === storeId);
                if (!exists) {
                    const product = products.find(p => p.id === pId);
                    const store   = stores.find(s => s.id === storeId);
                    const existingRupture = validatedRuptures.find(r => r.productId === pId && r.storeId === storeId);
                    if (existingRupture) {
                        existingRupture.visitId = editingVisitId;
                        existingRupture.visitDate = visitDate;
                        existingRupture.timestamp = new Date().getTime();
                    } else {
                        validatedRuptures.push({
                            id: Date.now() + Math.random(),
                            productId: pId,
                            productName: product ? product.name : 'Produto',
                            storeId,
                            storeName: store ? store.name : 'Loja',
                            visitId: editingVisitId,
                            visitDate,
                            timestamp: new Date().getTime()
                        });
                    }
                }
            });

            // Recalcula status das lojas envolvidas
            recomputeStoreStatus(storeId);
            if (oldStoreId !== storeId) recomputeStoreStatus(oldStoreId);

            try {
                await persistAppState();
                renderValidatedRuptures();
                selectedPhotos = [];
                document.getElementById('photoPreviewContainer').innerHTML = '';
                e.target.reset();
                visitModal.style.display = 'none';
                _resetEditMode();
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                checkOverdueStores();
                renderPage(currentPage || 'dashboard');
                updateStats();
                updateNotifications();
                showToast('Visita atualizada com sucesso!');
            } catch (err) {
                console.error('Erro ao salvar ediï¿½ï¿½o:', err);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                alert('Erro ao salvar a ediï¿½ï¿½o. Tente novamente.');
            }
            return; // Encerra aqui é não executa o fluxo de nova visita
        }
    }

    // ============================================================
    // MODO NOVA VISITA (comportamento original)
    // ============================================================
    const newVisit = {
        id: Date.now(),
        storeId,
        date: visitDate,
        ruptures: checkedProducts,
        extraPoints: checkedExtraPoints,
        isExtra,
        notes,
        photos: []  // fotos ficam apenas em memória (photoCache), não no localStorage
    };

    // Guarda fotos só em memória para a sessão atual
    if (selectedPhotos.length > 0) {
        photoCache[newVisit.id] = [...selectedPhotos];
        
        // ?? Upload para o servidor (em background)
        if (typeof Storage !== 'undefined' && Storage.isServer) {
            const urls = [];
            for (const b64 of selectedPhotos) {
                const u = await Storage.uploadPhoto(b64, newVisit.id);
                if (u) urls.push(u);
            }
            if (urls.length > 0) photoCache[newVisit.id] = urls;
        }
    }
    
    // Atualiza Estado
    visits.push(newVisit);
    invalidateVisitsIndex();

    recomputeStoreStatus(storeId);
    
    let autoResolvedCount = 0;

    // Auto-resolver rupturas validadas: se houver uma ruptura ativa
    // para esta loja que NÃO aparece na nova visita (checkedProducts),
    // e a nova visita tem data igual ou posterior à visita que gerou
    // a ruptura, então consideramos a ruptura resolvida automaticamente.
    (function autoResolveFromNewVisit() {
        const visitDateStr = newVisit.date;
        const newDate = visitDateStr ? new Date(visitDateStr) : new Date();
        const toResolve = [];

        validatedRuptures.forEach(r => {
            if (r.storeId === storeId && !(newVisit.ruptures || []).includes(r.productId)) {
                // compare dates when available
                const rDate = r.visitDate ? new Date(r.visitDate) : null;
                if (!rDate || newDate >= rDate) {
                    toResolve.push(r);
                }
            }
        });

        if (toResolve.length > 0) {
            autoResolvedCount = toResolve.length;
            toResolve.forEach(r => {
                const store = stores.find(s => s.id === r.storeId);
                resolvedRupturesHistory.unshift({
                    ...r,
                    network: store?.network || r.network || '',
                    resolvedAt: visitDateStr,
                    resolvedAtTime: new Date(`${visitDateStr}T12:00:00`).toLocaleString('pt-BR'),
                    visitId: newVisit.id,
                    visitDate: visitDateStr,
                    timestamp: new Date(`${visitDateStr}T12:00:00`).getTime()
                });

                validatedRuptures = validatedRuptures.filter(vr => !(vr.productId === r.productId && vr.storeId === r.storeId));
            });
            // Keep history bounded
            resolvedRupturesHistory = resolvedRupturesHistory.slice(0, 500);
        }
    })();
    
    // Sugerir rupturas para validaï¿½ï¿½o (em lote para performance)
    newVisit.ruptures.forEach(pId => {
        const exists = validatedRuptures.find(r => r.productId === pId && r.storeId === storeId);
        if (!exists) {
            const product = products.find(p => p.id === pId);
            const store = stores.find(s => s.id === storeId);
            const existingRupture = validatedRuptures.find(r => r.productId === pId && r.storeId === storeId);
            if (existingRupture) {
                existingRupture.visitId = newVisit.id;
                existingRupture.visitDate = visitDate;
                existingRupture.timestamp = new Date().getTime();
            } else {
                validatedRuptures.push({
                    id: Date.now() + Math.random(),
                    productId: pId,
                    productName: product ? product.name : 'Produto',
                    storeId,
                    storeName: store ? store.name : 'Loja',
                    visitId: newVisit.id,
                    visitDate,
                    timestamp: new Date().getTime()
                });
            }
        }
    });

    // Feedback e Reset imediato
    try {
        await persistAppState();
        renderValidatedRuptures();
        
        selectedPhotos = [];
        const photoPreview = document.getElementById('photoPreviewContainer');
        if (photoPreview) photoPreview.innerHTML = '';
        e.target.reset();
        
        visitModal.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;

        checkOverdueStores();
        renderPage(currentPage || 'dashboard');
        updateStats();
        updateNotifications();
        
        if (autoResolvedCount > 0) {
            showToast(`${autoResolvedCount} rupturas resolvidas automaticamente nesta visita.`,
                      'success');
        } else {
            showToast("Visita registrada com sucesso!");
        }
    } catch (err) {
        console.error("Erro ao salvar:", err);
        // Libera chaves legadas e tenta salvar novamente automaticamente
        localStorage.removeItem('hr_stores');
        localStorage.removeItem('hr_products');
        // Segunda tentativa após limpar espaço
        try {
            IndexedDBHelper.set('hr_visits', visits);
            saveStoreUpdates();
            IndexedDBHelper.set('hr_validated_ruptures', validatedRuptures);
            showToast("Visita salva após liberar espaço!", 'success');
        } catch(err2) {
            alert("Armazenamento cheio mesmo após limpeza. Exporte o relatério em CSV e limpe o histórico de visitas antigas.");
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

function suggestRupture(productId, storeId) {
    // Verifica se já não está validada
    const exists = validatedRuptures.find(r => r.productId === productId && r.storeId === storeId);
    if (!exists) {
        // Por enquanto, vamos validar automaticamente para demonstraï¿½ï¿½o, 
        // ou adicionar a uma lista de "pendentes"
        const product = products.find(p => p.id === productId);
        const store = stores.find(s => s.id === storeId);
        
        // Adicionar botão de validaï¿½ï¿½o na UI ou validar direto se for a chefe
        // Vamos criar a entrada de ruptura validada
        const newRupture = {
            id: Date.now() + Math.random(),
            productId,
            productName: product ? product.name : 'Produto',
            storeId,
            storeName: store ? store.name : 'Loja',
            timestamp: new Date().getTime()
        };
        
        validatedRuptures.push(newRupture);
        IndexedDBHelper.set('hr_validated_ruptures', validatedRuptures);
        renderValidatedRuptures();
    }
}

function renderValidatedRuptures(storeFilter) {
    const container = document.getElementById('dashboardProductAlerts');
    const fRuptures = typeof getGlobalFilteredRuptures === 'function' ? getGlobalFilteredRuptures() : validatedRuptures;
    const countEl = document.getElementById('activeRupturesCount');
    if (countEl) countEl.textContent = fRuptures.length;
    if (!container) return;

    container.innerHTML = '';

    // Se não recebeu filtro, tenta ler do input
    if (storeFilter === undefined) {
        const searchInput = document.getElementById('ruptureStoreSearch');
        storeFilter = searchInput ? searchInput.value : '';
    }

    // Normaliza o filtro (remove acentos e lowercase)
    const normalizeStr = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const filterNorm = normalizeStr(storeFilter || '');

    // Filtra rupturas pela loja
    const filtered = filterNorm
        ? fRuptures.filter(r => normalizeStr(r.storeName || '').includes(filterNorm))
        : fRuptures;

    if (fRuptures.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhuma ruptura ativa para os filtros atuais.</p>';
        return;
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhuma ruptura encontrada para esta loja.</p>';
        return;
    }

    // Pré-calcular reincidências: contagem de visitas consecutivas mais recentes
    // reportando o mesmo produto em ruptura na mesma loja
    const recurrenceMap = {};
    fRuptures.forEach(r => {
        const key = `${r.productId}-${r.storeId}`;
        if (!recurrenceMap[key]) {
            const storeVisits = getStoreVisitsIndexed(r.storeId); // já ordenadas: mais recente primeiro
            let streak = 0;
            for (const v of storeVisits) {
                if (v.ruptures && v.ruptures.includes(r.productId)) {
                    streak++;
                } else {
                    break;
                }
            }
            recurrenceMap[key] = streak;
        }
    });

    filtered.forEach(rupture => {
        // Encontra a loja para pegar a data da última visita
        const store = stores.find(s => s.id === rupture.storeId);
        
        let referenceTime = rupture.timestamp;
        if (store && store.lastVisit) {
            // lastVisit é uma string "YYYY-MM-DD"; converter para timestamp
            const parsed = new Date(store.lastVisit + 'T12:00:00').getTime();
            if (!isNaN(parsed)) referenceTime = parsed;
        }
        
        const timeDiff = getTimeDiff(referenceTime);
        const key = `${rupture.productId}-${rupture.storeId}`;
        const visitCount = recurrenceMap[key] || 0;
        const isRecurrent = visitCount >= 2;

        const item = document.createElement('div');
        item.className = 'rupture-item' + (isRecurrent ? ' rupture-recurrent' : '');
        item.innerHTML = `
            <div class="rupture-item-header">
                <span class="rupture-product">${rupture.productName}</span>
                <span class="rupture-time">${timeDiff}</span>
            </div>
            <div class="rupture-store-row">
                <span class="rupture-store">${rupture.storeName}</span>
                ${isRecurrent ? `
                    <span class="rupture-recurrence-badge" title="Produto em ruptura em ${visitCount} visitas é mesma loja">
                        <i class="fa-solid fa-fire"></i> ${visitCount}ª visita sem resolver
                    </span>
                ` : ''}
            </div>
            <div class="rupture-actions">
                <button class="btn btn-secondary btn-small" onclick="resolveRupture(${rupture.id})">
                    <i class="fa-solid fa-check"></i> Resolvido
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

// Funï¿½ï¿½o chamada pelo input de busca por loja no painel de rupturas
window.filterRupturesByStore = function() {
    const searchInput = document.getElementById('ruptureStoreSearch');
    renderValidatedRuptures(searchInput ? searchInput.value : '');
};

function getTimeDiff(timestamp) {
    const now = new Date().getTime();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60) ;
    const days = Math.floor(hours / 24);

    if (days > 0) return `Há ${days}d`;
    if (hours > 0) return `Há ${hours}h`;
    return `Há ${minutes}min`;
}

window.resolveRupture = function(id) {
    const rupture = validatedRuptures.find(r => r.id === id);
    if (rupture) {
        const store = stores.find(s => s.id === rupture.storeId);
        resolvedRupturesHistory = [{
            ...rupture,
            network: store?.network || rupture.network || '',
            resolvedAt: new Date().toISOString().slice(0, 10),
            resolvedAtTime: new Date().toLocaleString('pt-BR'),
            visitId: rupture.visitId || null,
            visitDate: rupture.visitDate || null
        }, ...resolvedRupturesHistory].slice(0, 300);
    }

    validatedRuptures = validatedRuptures.filter(r => r.id !== id);
    saveAppStateLocally(); // fire and forget
    if (typeof Storage !== 'undefined' && Storage.isServer) syncAppStateServer();
    if (currentPage === 'dashboard') {
        renderValidatedRuptures();
        renderProductAlerts();
    } else if (currentPage === 'history') {
        renderHistoryViewData();
    } else {
        renderValidatedRuptures();
    }
    updateStats();
};

// (updateStats unificado)

function renderProductAlerts() {
    const alertsContainer = document.getElementById('dashboardProductAlerts');
    alertsContainer.innerHTML = '';
    
    // Contar quantas vezes cada produto entrou em ruptura
    const ruptureCounts = {};
    visits.forEach(v => {
        v.ruptures.forEach(pId => {
            ruptureCounts[pId] = (ruptureCounts[pId] || 0) + 1;
        });
    });
    
    // Criar lista ordenada por maior ruptura
    const sortedAlerts = Object.entries(ruptureCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
        
    if (sortedAlerts.length === 0) {
        alertsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Nenhuma ruptura registrada ainda.</p>';
        return;
    }

    sortedAlerts.forEach(([pId, count]) => {
        const product = products.find(p => p.id == pId);
        const item = document.createElement('div');
        item.style.marginBottom = '12px';
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 500;">${product ? product.name : 'Desconhecido'}</span>
                <span class="badge" style="position: static; background: var(--primary-red);">${count}x</span>
            </div>
            <div style="height: 6px; background: #eee; border-radius: 3px; margin-top: 5px;">
                <div style="width: ${(count/visits.length)*100}%; height: 100%; background: var(--primary-red); border-radius: 3px;"></div>
            </div>
        `;
        alertsContainer.appendChild(item);
    });
}

function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('loginError');

    // Credenciais Personalizadas - liberado temporariamente para testes
    if (true || (user.toLowerCase() === 'nicole.portela' && pass === 'lasanha10')) {
        safeSetItem('hr_logged_in', 'true');
        document.body.classList.add('logged-in');
        document.body.classList.remove('not-logged-in');
        updateNotifications(); // Atualizar alertas após login
        updateStats(); // Garantir que as estatísticas carreguem no login
    } else {
        errorMsg.style.display = 'block';
    }
}

window.logout = function() {
    safeRemoveItem('hr_logged_in');
    location.reload();
};

window.openVisitForStore = function(storeId) {
    _resetEditMode();
    visitModal.style.display = 'flex';
    storeSelect.value = storeId;
    document.getElementById('visitDate').valueAsDate = new Date();
    const store = stores.find(s => s.id === storeId);
    renderChecklist('', store ? store.productIds : null);
};

// Restaura o modal para o estado padrão de "Nova Visita"
function _resetEditMode() {
    editingVisitId = null;
    // Desbloqueia o select de loja (pode ter sido travado em modo ediï¿½ï¿½o)
    if (storeSelect) storeSelect.disabled = false;
    const modalTitle = document.querySelector('#visitModal .modal-header h2');
    if (modalTitle) modalTitle.textContent = 'Registrar Visita';
    const submitBtn = document.querySelector('#visitForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = 'Salvar Visita';
        submitBtn.className = 'btn btn-success';
    }
    // Remove banner de modo ediï¿½ï¿½o se existir
    const editBanner = document.getElementById('editModeBanner');
    if (editBanner) editBanner.remove();
    // limpar checkbox de Visita Extra
    const extraCb = document.getElementById('visitIsExtra');
    if (extraCb) extraCb.checked = false;
}

// Abre o modal prï¿½-populado com os dados da visita para ediï¿½ï¿½o
window.openEditVisit = function(visitId) {
    const visit = visits.find(v => v.id === visitId);
    if (!visit) { alert('Visita não encontrada.'); return; }

    const store = stores.find(s => s.id === visit.storeId);

    // Define o ID em ediï¿½ï¿½o ANTES de qualquer renderizaï¿½ï¿½o
    editingVisitId = visitId;

    // Abre o modal
    visitModal.style.display = 'flex';

    // Ajusta título e botão para indicar modo ediï¿½ï¿½o
    const modalTitle = document.querySelector('#visitModal .modal-header h2');
    if (modalTitle) modalTitle.textContent = 'Editar Visita';

    const submitBtn = document.querySelector('#visitForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Alterações';
        submitBtn.className = 'btn btn-primary';
    }

    // Adiciona banner visual de aviso (se não existir ainda)
    if (!document.getElementById('editModeBanner')) {
        const form = document.getElementById('visitForm');
        const banner = document.createElement('div');
        banner.id = 'editModeBanner';
        banner.style.cssText = `
            background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px;
            padding: 10px 14px; margin-bottom: 14px; font-size: 0.85rem;
            color: #856404; display: flex; align-items: center; gap: 8px;
        `;
        banner.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i>
            <span>Você está <strong>editando</strong> uma visita existente. As alterações substituirão os dados anteriores.</span>`;
        form.insertBefore(banner, form.firstChild);
    }

    // Pré-preenche a loja
    storeSelect.value = visit.storeId;
    // Bloqueia troca de loja durante ediï¿½ï¿½o para evitar inconsistência
    storeSelect.disabled = true;

    // Pré-preenche a data
    document.getElementById('visitDate').value = visit.date;

    // Pré-preenche observaï¿½ï¿½es
    document.getElementById('visitNotes').value = window.fixEncoding(visit.notes) || '';

    // Renderiza checklist da loja e depois marca os produtos em ruptura
    renderChecklist('', store ? store.productIds : null);

    // Aguarda o DOM da checklist ser montado antes de marcar os checkboxes
    requestAnimationFrame(() => {
        const checkboxes = document.querySelectorAll('.rupture-check');
        checkboxes.forEach(cb => {
            cb.checked = visit.ruptures && visit.ruptures.includes(cb.value);
        });
        const extraCheckboxes = document.querySelectorAll('.extra-point-check');
        extraCheckboxes.forEach(cb => {
            cb.checked = visit.extraPoints && visit.extraPoints.includes(cb.value);
        });
        const isExtraCb = document.getElementById('visitIsExtra');
        if (isExtraCb) isExtraCb.checked = !!visit.isExtra;
    });

    // Garante que ao fechar o modal (pelo X ou fundo) a loja seja desbloqueada
    const unlockStore = () => { storeSelect.disabled = false; };
    visitModal.addEventListener('click', function onBgClick(e) {
        if (e.target === visitModal) { unlockStore(); visitModal.removeEventListener('click', onBgClick); }
    }, { once: true });
    const xBtn = document.querySelector('#visitModal .close-modal');
    if (xBtn) xBtn.addEventListener('click', unlockStore, { once: true });
};

window.toggleNetworkDropdown = function() {
    const dropdown = document.getElementById('networkDropdown');
    if (dropdown) dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
};

window.toggleAllNetworks = function(selectAllCheckbox) {
    const checkboxes = document.querySelectorAll('.network-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
    updateNetworkFilterLabel();
};

window.updateNetworkFilterLabel = function() {
    const checkboxes = document.querySelectorAll('.network-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    const someChecked = Array.from(checkboxes).some(cb => cb.checked);
    
    const selectAllCb = document.getElementById('selectAllNetworks');
    if (selectAllCb) selectAllCb.checked = allChecked;
    
    const label = document.getElementById('networkFilterLabel');
    if (label) {
        if (allChecked || checkboxes.length === 0) {
            label.textContent = "Todas as Redes";
        } else if (someChecked) {
            const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
            label.textContent = `${checkedCount} rede(s) selecionada(s)`;
        } else {
            label.textContent = "Nenhuma rede";
        }
    }
    renderReportsTable();
};

document.addEventListener('click', function(event) {
    const multiselect = document.querySelector('.custom-multiselect');
    if (multiselect && !multiselect.contains(event.target)) {
        const dropdown = document.getElementById('networkDropdown');
        if (dropdown) dropdown.style.display = 'none';
    }
});

// Start the app
window.addEventListener('unhandledrejection', function(event) {
    alert("Erro assíncrono detectado: " + event.reason);
});
init().catch(err => {
    alert("Erro crítico ao inicializar o painel: " + err.message);
    console.error(err);
});

window.showVisitDetails = function(visitId) {
    const visit = visits.find(v => v.id === visitId);
    if (!visit) return;
    const store = stores.find(s => s.id === visit.storeId);
    const modal = document.getElementById('visitDetailsModal');
    const body = document.getElementById('visitDetailsBody');
    
    if (!modal || !body) return;
    
    const ruptureNames = visit.ruptures.map(pId => {
        const prod = products.find(p => p.id === pId);
        return prod ? prod.name : 'Produto Desconhecido';
    });

    const itemDetailsHtml = (visit.ruptures || []).map(pId => {
        const prod = products.find(p => p.id === pId);
        const name = prod ? prod.name : 'Produto Desconhecido';
        const status = getResolvedItemStatus(pId, visit.storeId, visit.id);
        const resolvedLabel = status.isResolved
            ? `<span style="font-size: 0.72rem; background: #e8f5e9; color: #2e7d32; padding: 3px 6px; border-radius: 999px; font-weight: 700;"><i class="fa-solid fa-check"></i> Resolvido${status.resolvedAt ? ` · ${formatDate(status.resolvedAt)}` : ''}</span>`
            : `<span style="font-size: 0.72rem; background: #ffebee; color: var(--primary-red); padding: 3px 6px; border-radius: 999px; font-weight: 700;"><i class="fa-solid fa-triangle-exclamation"></i> Pendente</span>`;
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:8px; padding:8px 10px; background:#f8fafc; border:1px solid #e5e7eb; border-radius:8px;">
                <span style="font-weight:600; color: var(--text-dark);">${name}</span>
                ${resolvedLabel}
            </div>`;
    }).join('');
    
    // Busca outras visitas para a mesma loja
    const otherVisits = visits.filter(v => v.storeId === visit.storeId && v.id !== visitId)
                              .sort((a, b) => new Date(b.date) - new Date(a.date));

    let historyHtml = '';
    if (otherVisits.length > 0) {
        historyHtml = `
            <div style="margin-top: 20px; padding-top: 15px; border-top: 2px dashed var(--border-color);">
                <h3 style="font-size: 1rem; margin-bottom: 12px; color: var(--primary-blue);">
                    <i class="fa-solid fa-clock-rotate-left"></i> Outras Visitas é ${store ? store.name : 'Loja'}
                </h3>
                <ul style="list-style: none; padding: 0; font-size: 0.85rem;">
        `;
        otherVisits.forEach(v => {
            let itemsHtml = '';
            
            if (v.ruptures && v.ruptures.length > 0) {
                const itemsList = v.ruptures.map(pId => {
                    const prod = products.find(p => p.id === pId);
                    const name = prod ? prod.name : 'Produto Desconhecido';
                    
                    // Verifica se já foi resolvido (se o produto Nï¿½O está mais na lista de rupturas validadas/ativas para esta loja)
                    const isResolved = !validatedRuptures.some(r => r.productId === pId && r.storeId === v.storeId);
                    
                    if (isResolved) {
                        return `<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; padding-bottom: 4px; border-bottom: 1px solid #e0e0e0;">
                                    <span style="color: var(--text-muted); text-decoration: line-through;">${name}</span>
                                    <span style="font-size: 0.65rem; background: #e8f5e9; color: #2e7d32; padding: 3px 6px; border-radius: 4px; font-weight: bold;"><i class="fa-solid fa-check"></i> Resolvido</span>
                                </div>`;
                    } else {
                        return `<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; padding-bottom: 4px; border-bottom: 1px solid #e0e0e0;">
                                    <span style="color: var(--text-dark); font-weight: 500;">${name}</span>
                                    <span style="font-size: 0.65rem; background: #ffebee; color: var(--primary-red); padding: 3px 6px; border-radius: 4px; font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> Pendente</span>
                                </div>`;
                    }
                }).join('');
                
                itemsHtml = `<div style="margin-top: 8px;">${itemsList}</div>`;
            } else {
                itemsHtml = `<span style="color: #27ae60; font-weight: 500; display: block; margin-top: 8px;">Tudo Ok (Sem rupturas)</span>`;
            }
            
            historyHtml += `
                    <li style="margin-bottom: 12px; padding: 12px; background: var(--bg-light); border-radius: 8px; border-left: 3px solid ${(v.ruptures && v.ruptures.length > 0) ? 'var(--primary-red)' : '#27ae60'}">
                        <strong style="display: block; margin-bottom: 4px; color: var(--primary-blue); border-bottom: 1px solid #ddd; padding-bottom: 6px;">
                            <i class="fa-solid fa-calendar-day"></i> ${formatDate(v.date)}
                        </strong>
                        ${itemsHtml}
                    </li>
            `;
        });
        historyHtml += `
                </ul>
            </div>
        `;
    }

    const summary = getVisitResolutionSummary(visit);
    const resolvedCount = summary.resolvedCount;
    const pendingCount = Math.max(0, summary.totalItems - resolvedCount);

    body.innerHTML = `
        <div style="margin-bottom: 15px;">
            <strong style="font-size: 1.1rem; color: var(--primary-blue);">${store ? store.name : 'Removida'}</strong><br>
            <span style="color: var(--text-muted); font-size: 0.9rem;">Data da Visita: ${formatDate(visit.date)}</span>
        </div>
        <div style="margin-bottom: 14px; padding: 10px 12px; border-radius: 10px; background: ${summary.totalItems > 0 && resolvedCount === summary.totalItems ? '#f4fff5' : '#f8fafc'}; border: 1px solid ${summary.totalItems > 0 && resolvedCount === summary.totalItems ? '#c8e6c9' : '#e5e7eb'};">
            <strong style="display:block; margin-bottom: 4px; color: var(--primary-blue);">Progresso de resolução</strong>
            <span style="font-size: 0.92rem; color: var(--text-muted);">${summary.label}</span>
        </div>
        <h3 style="font-size: 1rem; margin-bottom: 10px; color: var(--primary-red);">Evolução dos Itens</h3>
        ${ruptureNames.length > 0
            ? `<div style="display:grid; gap:8px;">${itemDetailsHtml}</div>`
            : '<p class="empty-state">Nenhuma ruptura registrada nesta visita.</p>'}
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-color); display:grid; gap:8px;">
            <div style="font-size: 0.9rem; color: #2e7d32;"><i class="fa-solid fa-check"></i> Resolvidos: ${resolvedCount}</div>
            <div style="font-size: 0.9rem; color: var(--primary-red);"><i class="fa-solid fa-triangle-exclamation"></i> Pendentes: ${pendingCount}</div>
        </div>
        ${visit.notes ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                <strong>Observações:</strong>
                <p style="margin-top: 5px; font-size: 0.9rem; color: var(--text-muted);">${window.fixEncoding(visit.notes)}</p>
            </div>
        ` : ''}
        ${(visit.extraPoints && visit.extraPoints.length > 0) ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                <strong style="color: #8e44ad;"><i class="fa-solid fa-star"></i> Pontos Extras:</strong>
                <div style="margin-top: 8px;">
                    ${visit.extraPoints.map(ep => `<span class="badge-extra-point">${ep}</span>`).join('')}
                </div>
            </div>
        ` : ''}
        ${historyHtml}
    `;
    
    modal.style.display = 'flex';
};











function getVisitResolutionSummary(visit) {
    if (!visit || !visit.ruptures) return { totalItems: 0, resolvedCount: 0 };
    const totalItems = visit.ruptures.length;
    let resolvedCount = 0;
    
    visit.ruptures.forEach(productId => {
        const isResolved = window.getResolvedItemStatus
            ? window.getResolvedItemStatus(productId, visit.storeId, visit.id, visit.date).isResolved
            : resolvedRupturesHistory.some(r => r.visitId === visit.id && String(r.productId) === String(productId));
        if (isResolved) {
            resolvedCount++;
        }
    });
    
    return { totalItems, resolvedCount };
}

function getVisitResolutionBadge(visit) {
    const summary = getVisitResolutionSummary(visit);
    if (summary.totalItems === 0) return '<span class="status-tag ok">Sem Rupturas</span>';
    if (summary.resolvedCount === 0) return '<span class="status-tag error">Pendente</span>';
    if (summary.resolvedCount < summary.totalItems) return `<span class="status-tag warning">Parcial (${summary.resolvedCount}/${summary.totalItems})</span>`;
    return '<span class="status-tag ok">Resolvido</span>';
}

window.exportStoresCSV = function() {
    const fStores = getFilteredStoresList();
    if (fStores.length === 0) {
        alert('Não há dados para exportar com os filtros atuais.');
        return;
    }
    
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFFLoja;Rede;Status Atual;Última Visita;Frequência;Rupturas (última visita)\n';
    
    const { periodStart, periodEnd } = getStoreListPeriod();
    fStores.forEach(s => {
        const periodStatus = computeStorePeriodStatus(s, periodStart, periodEnd);
        let statusStr = "Sem Visita";
        if (periodStatus === 'overdue') statusStr = "Em Atraso";
        if (periodStatus === 'visited') statusStr = "Visitada";

        let ruptureText = "Sem registro";
        const lastVisit = getStoreVisitsIndexed(s.id)[0];
        if (lastVisit) {
            if (Array.isArray(lastVisit.ruptures) && lastVisit.ruptures.length > 0) {
                ruptureText = lastVisit.ruptures.map(pid => {
                    const p = products.find(x => x.id === pid);
                    return p ? p.name : pid;
                }).join(', ');
            } else {
                ruptureText = "Nenhuma ruptura";
            }
        }
        
        csvContent += [
            s.name,
            s.network || '',
            statusStr,
            s.lastVisit ? formatDate(s.lastVisit) : 'Nunca',
            s.frequency || 1,
            `"${ruptureText}"`
        ].join(';') + '\n';
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Lojas_Hiperroll_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.exportStoresPDF = function() {
    const fStores = getFilteredStoresList();
    if (fStores.length === 0) {
        alert('Não há dados para exportar com os filtros atuais.');
        return;
    }
    
    const opt = {
        margin:       [10, 10],
        filename:     `Lojas_Hiperroll_${new Date().toLocaleDateString()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    
    const header = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; font-family: 'Outfit', sans-serif; border-bottom: 2px solid #0047AB; padding-bottom: 15px; width: 100%; box-sizing: border-box;">
            <div style="text-align: left; flex: 1; padding-right: 20px;">
                <h1 style="color: #0047AB; margin: 0; font-size: 24px; font-weight: 700;">Hiperroll Embalagens</h1>
                <h3 style="color: #333; margin: 5px 0 0; font-size: 16px; font-weight: 600;">Relatório de Gestão de Lojas</h3>
                <p style="font-size: 11px; color: #666; margin: 6px 0 0; font-weight: 400;">Gerado em: ${new Date().toLocaleString()}</p>
            </div>
            <div style="text-align: right;">
                <div style="background: #f8f9fa; border: 1px solid #e0e0e0; padding: 10px 15px; border-radius: 6px; display: inline-block;">
                    <div style="font-size: 20px; font-weight: 700; color: #0047AB;">${fStores.length}</div>
                    <div style="font-size: 11px; color: #555; text-transform: uppercase; margin-top: 3px;">Lojas Encontradas</div>
                </div>
            </div>
        </div>
    `;
    
    let tableRows = '';
    const { periodStart, periodEnd } = getStoreListPeriod();
    fStores.forEach(s => {
        const periodStatus = computeStorePeriodStatus(s, periodStart, periodEnd);
        let statusStr = "Sem Visita";
        let statusColor = "#f39c12"; // yellow
        if (periodStatus === 'overdue') { statusStr = "Em Atraso"; statusColor = "#e74c3c"; }
        if (periodStatus === 'visited') { statusStr = "Visitada"; statusColor = "#27ae60"; }

        let ruptureText = "<span style='color:#999; font-style:italic;'>Sem registro</span>";
        const lastVisit = getStoreVisitsIndexed(s.id)[0];
        if (lastVisit) {
            if (Array.isArray(lastVisit.ruptures) && lastVisit.ruptures.length > 0) {
                const names = lastVisit.ruptures.map(pid => {
                    const p = products.find(x => x.id === pid);
                    return p ? p.name : pid;
                }).join(', ');
                ruptureText = `<span style='color:#e74c3c;'>${names}</span>`;
            } else {
                ruptureText = "<span style='color:#27ae60;'>Nenhuma ruptura</span>";
            }
        }
        
        tableRows += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 8px; font-size: 12px; color: #333;"><strong>${s.name}</strong></td>
                <td style="padding: 10px 8px; font-size: 12px; color: #555;">${s.network || '-'}</td>
                <td style="padding: 10px 8px; font-size: 12px;"><span style="color: ${statusColor}; font-weight: 600;">${statusStr}</span></td>
                <td style="padding: 10px 8px; font-size: 12px; color: #555;">${s.lastVisit ? formatDate(s.lastVisit) : '-'}</td>
                <td style="padding: 10px 8px; font-size: 11px; color: #333;">${ruptureText}</td>
                <td style="padding: 10px 8px; font-size: 12px; color: #555; text-align: center;">${s.frequency || 1}x/sem</td>
            </tr>
        `;
    });
    
    const tableHtml = `
        <table style="width: 100%; border-collapse: collapse; font-family: 'Outfit', sans-serif;">
            <thead>
                <tr style="background: #f4f6f9; border-bottom: 2px solid #ddd;">
                    <th style="padding: 12px 8px; text-align: left; font-size: 12px; color: #333; text-transform: uppercase; width: 25%;">Loja</th>
                    <th style="padding: 12px 8px; text-align: left; font-size: 12px; color: #333; text-transform: uppercase; width: 15%;">Rede</th>
                    <th style="padding: 12px 8px; text-align: left; font-size: 12px; color: #333; text-transform: uppercase; width: 10%;">Status</th>
                    <th style="padding: 12px 8px; text-align: left; font-size: 12px; color: #333; text-transform: uppercase; width: 10%;">Última Visita</th>
                    <th style="padding: 12px 8px; text-align: left; font-size: 12px; color: #333; text-transform: uppercase; width: 30%;">Rupturas (Última Visita)</th>
                    <th style="padding: 12px 8px; text-align: center; font-size: 12px; color: #333; text-transform: uppercase; width: 10%;">Frequência</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
    
    const container = document.createElement('div');
    container.innerHTML = header + tableHtml;
    container.style.padding = '20px';
    container.style.background = 'white';
    container.style.color = 'black';
    container.style.width = '297mm'; // A4 Landscape
    container.style.boxSizing = 'border-box';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    
    exportHtmlToPdf(container, opt);
};




