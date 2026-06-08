const fs = require('fs');

const content = fs.readFileSync('Dados.csv', 'utf8');
const lines = content.split('\n').filter(line => line.trim() !== '');
const headerLine = lines[0];
const delimiter = headerLine.includes(';') ? ';' : ',';
const headers = headerLine.split(delimiter).map(h => h.trim().toLowerCase());

const colLoja = headers.findIndex(h => h.includes('loja'));
const colItem = headers.findIndex(h => h.includes('item'));
const colRede = headers.findIndex(h => h.includes('rede'));
const colStatus = headers.findIndex(h => h.includes('status'));

const stores = [];
const products = [];
const storeMap = new Map();
const productMap = new Map();

for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter);
    if (cols.length < 2) continue;

    const storeName = cols[colLoja]?.trim();
    const productName = cols[colItem]?.trim();
    const networkName = colRede !== -1 ? cols[colRede]?.trim() : 'Geral';
    const status = colStatus !== -1 ? cols[colStatus]?.trim() : 'Ativo';

    if (storeName && !storeMap.has(storeName.toLowerCase())) {
        const id = stores.length + 1;
        const storeObj = { id, name: storeName, network: networkName, lastVisit: null, status: 'pending', productIds: [] };
        stores.push(storeObj);
        storeMap.set(storeName.toLowerCase(), storeObj);
    }

    if (productName && !productMap.has(productName.toLowerCase())) {
        const id = 100 + products.length + 1;
        const prodObj = { id, name: productName, network: networkName, status: status };
        products.push(prodObj);
        productMap.set(productName.toLowerCase(), prodObj);
    }
    
    // Link product to store (case insensitive)
    if (storeName && productName) {
        const sObj = storeMap.get(storeName.toLowerCase());
        const pObj = productMap.get(productName.toLowerCase());
        if (sObj && pObj && !sObj.productIds.includes(pObj.id)) {
            sObj.productIds.push(pObj.id);
        }
    }
}

console.log('STORES_START');
console.log(JSON.stringify(stores, null, 2));
console.log('STORES_END');
console.log('PRODUCTS_START');
console.log(JSON.stringify(products, null, 2));
console.log('PRODUCTS_END');
