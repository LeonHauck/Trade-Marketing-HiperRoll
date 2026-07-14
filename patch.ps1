$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding $false
$c = [IO.File]::ReadAllText("app.js", $utf8)

$c = $c -replace "`r`n", "`n"

# 1. Replace the entire visits IIFE
$oldVisits = @"
// Carrega visitas e STRIP fotos do localStorage legado (libera espaço imediatamente)
let visits = (function() {
    try {
        const raw = JSON.parse(localStorage.getItem('hr_visits')) || [];
        let dirty = false;
        const cleaned = raw.map(v => {
            if (v.photos && v.photos.length > 0) {
                photoCache[v.id] = v.photos; // mantém fotos em memória
                dirty = true;
                return { ...v, photos: [] };  // remove do objeto persistido
            }
            return v;
        });
        if (dirty) {
            // Resalva versão sem fotos para liberar o espaço legado
            localStorage.setItem('hr_visits', JSON.stringify(cleaned));
        }
        return cleaned;
    } catch(e) {
        return [];
    }
})();
"@.Replace("`r`n", "`n")
$newVisits = "let visits = [];`nlet dbLoaded = false;"
$c = $c.Replace($oldVisits, $newVisits)

# 2. Replace try/catch for validatedRuptures
$oldValidated = @"
try {
    validatedRuptures = JSON.parse(localStorage.getItem('hr_validated_ruptures')) || [];
    dismissedNotifications = JSON.parse(localStorage.getItem('hr_dismissed')) || [];
    resolvedRupturesHistory = JSON.parse(localStorage.getItem('hr_resolved_ruptures_history')) || [];
} catch(e) {
    console.warn("localStorage indisponível", e);
}
"@.Replace("`r`n", "`n")
$newValidated = ""
$c = $c.Replace($oldValidated, $newValidated)

# 3. Replace loadStoreUpdates
$oldLoadStore = @"
function loadStoreUpdates() {
    try { return JSON.parse(localStorage.getItem('hr_store_updates')) || {}; }
    catch(e) { return {}; }
}
"@.Replace("`r`n", "`n")
$newLoadStore = @"
async function loadStoreUpdates() {
    return (await IndexedDBHelper.get('hr_store_updates')) || {};
}
"@.Replace("`r`n", "`n")
$c = $c.Replace($oldLoadStore, $newLoadStore)

# 4. Replace saveStoreUpdates
$oldSaveStore = @"
function saveStoreUpdates() {
    // Persiste apenas os campos voláteis (lastVisit, currentStatus) de cada loja
    const updates = {};
    stores.forEach(s => {
        if (s.lastVisit || s.currentStatus) {
            updates[s.id] = { lastVisit: s.lastVisit || null, currentStatus: s.currentStatus || 'pending' };
        }
    });
    try {
        localStorage.setItem('hr_store_updates', JSON.stringify(updates));
    } catch(e) {
        console.warn('Falha ao salvar atualizações de lojas:', e);
    }
}
"@.Replace("`r`n", "`n")
$newSaveStore = @"
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
"@.Replace("`r`n", "`n")
$c = $c.Replace($oldSaveStore, $newSaveStore)

# 5. saveAppStateLocally
$oldSaveApp = @"
function saveAppStateLocally() {
    saveStoreUpdates();
    try {
        localStorage.setItem('hr_visits', JSON.stringify(visits));
        localStorage.setItem('hr_validated_ruptures', JSON.stringify(validatedRuptures));
        localStorage.setItem('hr_dismissed', JSON.stringify(dismissedNotifications));
        localStorage.setItem('hr_resolved_ruptures_history', JSON.stringify(resolvedRupturesHistory));
    } catch (e) {
        console.warn('Falha ao salvar estado local:', e);
    }
}
"@.Replace("`r`n", "`n")
$newSaveApp = @"
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
"@.Replace("`r`n", "`n")
$c = $c.Replace($oldSaveApp, $newSaveApp)

# 6. stores init block
$oldStores = @"
// Inicializa stores mesclando os dados base com overrides persistidos e atualizações salvas
const _storeUpdates = loadStoreUpdates();
let stores = (initialData.stores || []).map(s => {
    const upd = _storeUpdates[s.id];
    return upd ? { ...s, lastVisit: upd.lastVisit, currentStatus: upd.currentStatus } : { ...s };
});
"@.Replace("`r`n", "`n")
$newStores = "let stores = [];"
$c = $c.Replace($oldStores, $newStores)

# 7. persistLocalStorageJson
$oldPersist = @"
function persistLocalStorageJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        return false;
    }
}
"@.Replace("`r`n", "`n")
$newPersist = @"
async function persistLocalStorageJson(key, value) {
    try {
        await IndexedDBHelper.set(key, value);
        return true;
    } catch (e) {
        return false;
    }
}
"@.Replace("`r`n", "`n")
$c = $c.Replace($oldPersist, $newPersist)

# 8. cleanPersistedDataForRemovedStores
$oldClean = @"
function cleanPersistedDataForRemovedStores() {
    const existingStoreIds = new Set(stores.map(s => s.id));

    const cleanedVisits = visits.filter(v => existingStoreIds.has(v.storeId));
    if (cleanedVisits.length !== visits.length) {
        visits = cleanedVisits;
        persistLocalStorageJson('hr_visits', visits);
    }

    const cleanedValidatedRuptures = validatedRuptures.filter(r => existingStoreIds.has(r.storeId));
    if (cleanedValidatedRuptures.length !== validatedRuptures.length) {
        validatedRuptures = cleanedValidatedRuptures;
        persistLocalStorageJson('hr_validated_ruptures', validatedRuptures);
    }

    const cleanedResolvedHistory = resolvedRupturesHistory.filter(item => existingStoreIds.has(item.storeId));
    if (cleanedResolvedHistory.length !== resolvedRupturesHistory.length) {
        resolvedRupturesHistory = cleanedResolvedHistory;
        persistLocalStorageJson('hr_resolved_ruptures_history', resolvedRupturesHistory);
    }

    const storeUpdates = loadStoreUpdates();
    const cleanedUpdates = Object.entries(storeUpdates).reduce((acc, [storeId, value]) => {
        if (existingStoreIds.has(storeId) || existingStoreIds.has(Number(storeId))) {
            acc[storeId] = value;
        }
        return acc;
    }, {});

    if (Object.keys(cleanedUpdates).length !== Object.keys(storeUpdates).length) {
        persistLocalStorageJson('hr_store_updates', cleanedUpdates);
    }
}

cleanPersistedDataForRemovedStores();
"@.Replace("`r`n", "`n")
$newClean = @"
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

async function initializeAppDatabase() {
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
"@.Replace("`r`n", "`n")
$c = $c.Replace($oldClean, $newClean)

# Now replace the usages of setItem
$c = $c.Replace("localStorage.setItem('hr_data_overrides', JSON.stringify({", "IndexedDBHelper.set('hr_data_overrides', {")
$c = $c.Replace("localStorage.setItem('hr_visits', JSON.stringify(visits));", "IndexedDBHelper.set('hr_visits', visits);")
$c = $c.Replace("localStorage.setItem('hr_validated_ruptures', JSON.stringify(validatedRuptures));", "IndexedDBHelper.set('hr_validated_ruptures', validatedRuptures);")

# Update init() call
$c = $c.Replace("async function init() {`n", "async function init() {`n    await initializeAppDatabase();`n")

# Fix persistLocalStorageJson calls in init()
$c = $c.Replace("persistLocalStorageJson('hr_validated_ruptures', validatedRuptures);", "await persistLocalStorageJson('hr_validated_ruptures', validatedRuptures);")
$c = $c.Replace("persistLocalStorageJson('hr_resolved_ruptures_history', resolvedRupturesHistory);", "await persistLocalStorageJson('hr_resolved_ruptures_history', resolvedRupturesHistory);")
$c = $c.Replace("persistLocalStorageJson('hr_visits', visits);", "await persistLocalStorageJson('hr_visits', visits);")

# Await saveAppStateLocally where needed (in functions like deleteVisit, if they use it)
$c = $c.Replace("saveAppStateLocally();`n        if (typeof Storage !== 'undefined' && Storage.isServer) syncAppStateServer();", "await persistAppState();")
$c = $c.Replace("saveAppStateLocally();", "saveAppStateLocally(); // fire and forget")

[IO.File]::WriteAllText("app.js", $c, $utf8)
Write-Host "Replaced everything successfully."
