const fs = require('fs');

let content = fs.readFileSync('app.js', 'utf8');

// Inject generateStableId
if (!content.includes('function generateStableId')) {
    const helperFn = 
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
;
    content = content.replace('function normalizeText(value) {', helperFn + '\nfunction normalizeText(value) {');
}

// Fix store ID generation
content = content.replace(
    /const id = newStores\.length \+ 1;\s+const storeObj = { id, name: storeName, network: networkName, lastVisit: null, status: 'pending', productNames: \[\] };/g,
    "const id = generateStableId(networkName, storeName);\n            const storeObj = { id, name: storeName, network: networkName, lastVisit: null, status: 'pending', productNames: [] };"
);

// Fix product ID generation
content = content.replace(
    /const id = 100 \+ newProducts\.length \+ 1;\s+const prodObj = { id, name: productName, network: networkName, status: productStatus };/g,
    "const id = generateStableId('', productName);\n            const prodObj = { id, name: productName, network: networkName, status: productStatus };"
);

// Fix mergeDataCollections incoming stores
content = content.replace(
    /const nextId = mergedStores\.reduce\(\(max, item\) => Math\.max\(max, Number\(item\.id\) \|\| 0\), 0\) \+ 1;/g,
    "const nextId = generateStableId(importedStore.network || 'Geral', importedStore.name);"
);

// Fix mergeDataCollections incoming products
content = content.replace(
    /const nextId = mergedProducts\.reduce\(\(max, item\) => Math\.max\(max, Number\(item\.id\) \|\| 0\), 100\) \+ 1;/g,
    "const nextId = generateStableId('', product.name);"
);

// Fix storeId from parseInt
content = content.replace(/const selectedStoreId = parseInt\(storeSelect\.value\);/g, 'const selectedStoreId = storeSelect.value;');
content = content.replace(/const storeId\s*=\s*parseInt\(storeSelect\.value\);/g, 'const storeId = storeSelect.value;');
content = content.replace(/parseInt\(e\.target\.value\)/g, 'e.target.value');

// Fix productIds from checkboxes
content = content.replace(/\.map\(cb => parseInt\(cb\.value, 10\)\)/g, '.map(cb => cb.value)');
content = content.replace(/\.map\(cb => parseInt\(cb\.value\)\)/g, '.map(cb => cb.value)');

// Fix visit ruptures mapping
content = content.replace(/cb\.checked = visit\.ruptures && visit\.ruptures\.includes\(parseInt\(cb\.value\)\);/g, 'cb.checked = visit.ruptures && visit.ruptures.includes(cb.value);');

// Fix finding product
content = content.replace(/products\.find\(prod => prod\.id === parseInt\(pId\)\);/g, 'products.find(prod => String(prod.id) === String(pId));');

// Fix cleanPersistedDataForRemovedStores
content = content.replace(/if \(existingStoreIds\.has\(Number\(storeId\)\)\)/g, 'if (existingStoreIds.has(storeId) || existingStoreIds.has(Number(storeId)))');

fs.writeFileSync('app.js', content, 'utf8');
console.log('Patch aplicado no app.js');
