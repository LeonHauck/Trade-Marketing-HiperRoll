// ============================================================
// db.js — Camada de persistência inteligente
// Em file:// (abrir local): usa localStorage puro (compatível com Chrome)
// Em http/https (HostGator): usa IndexedDB (mais performático)
// API única: IndexedDBHelper.get(key) / .set(key, value)
// ============================================================

const DB_NAME = 'hiperroll_trade_db';
const DB_VERSION = 1;
const _IS_FILE_PROTOCOL = (window.location.protocol === 'file:');

const IndexedDBHelper = {
    db: null,

    async init() {
        // No protocolo file://, nunca usa IndexedDB — Chrome bloqueia
        if (_IS_FILE_PROTOCOL) return;
        if (this.db) return;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout'));
            }, 3000);

            try {
                const req = indexedDB.open(DB_NAME, DB_VERSION);
                req.onupgradeneeded = e => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('keyvalue')) {
                        db.createObjectStore('keyvalue', { keyPath: 'id' });
                    }
                };
                req.onsuccess = e => {
                    clearTimeout(timeout);
                    this.db = e.target.result;
                    console.log('[DB] IndexedDB aberto com sucesso.');
                    resolve();
                };
                req.onerror = e => {
                    clearTimeout(timeout);
                    reject(e.target.error);
                };
                req.onblocked = () => {
                    clearTimeout(timeout);
                    reject(new Error('Bloqueado'));
                };
            } catch (err) {
                clearTimeout(timeout);
                reject(err);
            }
        });
    },

    async get(key) {
        // --- localStorage puro em file:// ---
        if (_IS_FILE_PROTOCOL) {
            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : null;
            } catch (e) {
                return null;
            }
        }

        // --- IndexedDB em http/https ---
        await this.init();
        if (!this.db) {
            // fallback se init falhou
            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : null;
            } catch (e) {
                return null;
            }
        }

        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction('keyvalue', 'readonly');
                const store = tx.objectStore('keyvalue');
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result ? req.result.value : null);
                req.onerror = () => resolve(null);
            } catch (e) {
                resolve(null);
            }
        });
    },

    async set(key, value) {
        // --- localStorage puro em file:// ---
        if (_IS_FILE_PROTOCOL) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.warn('[DB] Falha localStorage:', e.message);
                return false;
            }
        }

        // --- IndexedDB em http/https ---
        await this.init();
        if (!this.db) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                return false;
            }
        }

        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction('keyvalue', 'readwrite');
                const store = tx.objectStore('keyvalue');
                const req = store.put({ id: key, value: value });
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(false);
            } catch (e) {
                resolve(false);
            }
        });
    },

    async migrateFromLocalStorage() {
        // Em file://, não precisa migrar (já usa localStorage)
        if (_IS_FILE_PROTOCOL) return;

        // Garantir que IndexedDB esteja inicializado antes de migrar
        await this.init();
        if (!this.db) return;

        try {
            const migrated = await this.get('migration_done');
            if (migrated) return;

            console.log('[Migration] Migrando localStorage -> IndexedDB...');
            const keys = [
                'hr_visits',
                'hr_validated_ruptures',
                'hr_dismissed',
                'hr_resolved_ruptures_history',
                'hr_store_updates',
                'hr_data_overrides'
            ];

            for (const key of keys) {
                try {
                    const raw = localStorage.getItem(key);
                    if (raw) {
                        await this.set(key, JSON.parse(raw));
                        console.log('[Migration] OK:', key);
                    }
                } catch (e) {
                    console.warn('[Migration] Falha:', key);
                }
            }
            await this.set('migration_done', true);
            console.log('[Migration] Concluída!');
        } catch (err) {
            console.error('[Migration] Erro:', err);
        }
    }
};
