// store-geo.js — coordenadas geocodificadas das lojas, a partir das planilhas de endereço
// enviadas pelo usuário. Mantido manualmente conforme as planilhas de cada rede chegam.
//
// Formato: { [storeId]: { address, lat, lng, geocodedAt } }
// storeId é o mesmo "id" usado em STORES_DATA (data.js).
const STORE_GEO_DATA = {};
