const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// 1. Remove synchronous initializations
appJs = appJs.replace(/const persistedDataOverrides = loadDataOverrides\(\);[\s\S]*?if \(safeGetItem\('hr_stores'\)\) {\s*safeRemoveItem\('hr_stores'\);\s*}/, `
// Globais agora vazias, serão carregadas via IndexedDB
let products = PRODUCTS_DATA;
let stores = STORES_DATA;
const photoCache = {};
let visits = [];
let validatedRuptures = [];
let dismissedNotifications = [];
let resolvedRupturesHistory = [];
let historyBackfillNotice = '';

// Variável para sinalizar que o banco carregou
let dbLoaded = false;

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

async function saveAppStateLocally() {
    await saveStoreUpdates();
    try {
        await IndexedDBHelper.set('hr_visits', visits);
        await IndexedDBHelper.set('hr_validated_ruptures', validatedRuptures);
        await IndexedDBHelper.set('hr_dismissed', dismissedNotifications);
        await IndexedDBHelper.set('hr_resolved_ruptures_history', resolvedRupturesHistory);
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
    await saveAppStateLocally();
    await syncAppStateServer();
}

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

    const cleanedVisits = visits.filter(v => existingStoreIds.has(v.storeId));
    if (cleanedVisits.length !== visits.length) {
        visits = cleanedVisits;
        await persistLocalStorageJson('hr_visits', visits);
    }

    const cleanedValidatedRuptures = validatedRuptures.filter(r => existingStoreIds.has(r.storeId));
    if (cleanedValidatedRuptures.length !== validatedRuptures.length) {
        validatedRuptures = cleanedValidatedRuptures;
        await persistLocalStorageJson('hr_validated_ruptures', validatedRuptures);
    }

    const cleanedResolvedHistory = resolvedRupturesHistory.filter(item => existingStoreIds.has(item.storeId));
    if (cleanedResolvedHistory.length !== resolvedRupturesHistory.length) {
        resolvedRupturesHistory = cleanedResolvedHistory;
        await persistLocalStorageJson('hr_resolved_ruptures_history', resolvedRupturesHistory);
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

async function loadDataOverridesAsync() {
    try {
        return await IndexedDBHelper.get('hr_data_overrides') || null;
    } catch (e) {
        return null;
    }
}

async function initializeAppDatabase() {
    await IndexedDBHelper.migrateFromLocalStorage();
    
    const persistedDataOverrides = await loadDataOverridesAsync();
    const initialData = persistedDataOverrides
        ? mergeDataCollections(PRODUCTS_DATA, STORES_DATA, persistedDataOverrides.products || [], persistedDataOverrides.stores || [])
        : { products: PRODUCTS_DATA, stores: STORES_DATA };
    products = initialData.products;
    
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
    if (dirty) await persistLocalStorageJson('hr_visits', visits);

    validatedRuptures = (await IndexedDBHelper.get('hr_validated_ruptures')) || [];
    dismissedNotifications = (await IndexedDBHelper.get('hr_dismissed')) || [];
    resolvedRupturesHistory = (await IndexedDBHelper.get('hr_resolved_ruptures_history')) || [];

    const _storeUpdates = await loadStoreUpdates();
    stores = (initialData.stores || []).map(s => {
        const upd = _storeUpdates[s.id];
        return upd ? { ...s, lastVisit: upd.lastVisit, currentStatus: upd.currentStatus } : { ...s };
    });

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
`);

// 2. Add initializeAppDatabase() to init()
appJs = appJs.replace(/async function init\(\) \{/, `async function init() {
    await initializeAppDatabase();`);

// 3. Replace all remaining localStorage.setItem and persistLocalStorageJson calls with await
appJs = appJs.replace(/localStorage\.setItem\('hr_data_overrides'/g, `await IndexedDBHelper.set('hr_data_overrides'`);
appJs = appJs.replace(/localStorage\.setItem\('hr_visits'/g, `await IndexedDBHelper.set('hr_visits'`);
appJs = appJs.replace(/localStorage\.setItem\('hr_validated_ruptures'/g, `await IndexedDBHelper.set('hr_validated_ruptures'`);
appJs = appJs.replace(/localStorage\.setItem\('hr_dismissed'/g, `await IndexedDBHelper.set('hr_dismissed'`);
appJs = appJs.replace(/localStorage\.setItem\('hr_resolved_ruptures_history'/g, `await IndexedDBHelper.set('hr_resolved_ruptures_history'`);

appJs = appJs.replace(/persistLocalStorageJson\('hr_validated_ruptures', validatedRuptures\);/g, `await persistLocalStorageJson('hr_validated_ruptures', validatedRuptures);`);
appJs = appJs.replace(/persistLocalStorageJson\('hr_resolved_ruptures_history', resolvedRupturesHistory\);/g, `await persistLocalStorageJson('hr_resolved_ruptures_history', resolvedRupturesHistory);`);
appJs = appJs.replace(/persistLocalStorageJson\('hr_visits', visits\);/g, `await persistLocalStorageJson('hr_visits', visits);`);

// 4. In "saveAppStateLocally();" inside deleteVisit, etc., we can leave them as fire-and-forget or replace with await persistAppState()
appJs = appJs.replace(/saveAppStateLocally\(\);[\s\n]*if \(typeof Storage !== 'undefined' && Storage\.isServer\) syncAppStateServer\(\);/g, `await persistAppState();`);

// 5. Fix remaining saveAppStateLocally calls inside functions
appJs = appJs.replace(/saveAppStateLocally\(\);/g, `await saveAppStateLocally();`);

// Save
fs.writeFileSync('app.js', appJs);
console.log("Migration script complete");
