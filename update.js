const fs = require('fs');

const content = fs.readFileSync('data.js', 'utf8');

// The file has:
// const PRODUCTS_DATA = [...]
// const STORES_DATA = [...]
// const VISITS_DATA = [...]

// We only need to modify STORES_DATA.
const storesMatch = content.match(/const STORES_DATA = (\[[\s\S]*?\]);\s*const VISITS_DATA =/);
if (!storesMatch) {
    console.log("Could not find STORES_DATA block!");
    process.exit(1);
}

let storesText = storesMatch[1];
// Some JSON in data.js might have trailing commas or other JS quirks, but it seems to be valid JSON.
let stores = JSON.parse(storesText);

const storesToUpdate = [
    "695 ATACADAO - SSA BARRA",
    "835 ATACADAO - SSA CABULA",
    "942 ATACADAO - SSA CAMPINAS BROTAS",
    "618 ATACADAO - SSA GARIBALDI",
    "742 ATACADAO - SSA ITAPUA",
    "851 ATACADAO - SSA MARES",
    "921 ATACADAO - SSA MATA ESCURA",
    "841 ATACADAO - SSA PAU DA LIMA",
    "696 ATACADAO - SSA PITUBA",
    "917 ATACADAO - SSA CAJAZEIRAS",
    "916 ATACADAO - SSA ACM",
    "918 ATACADAO - SSA BONOCO",
    "920 ATACADAO - SSA IGUATEMI",
    "923 ATACADAO - SSA TROBOGY"
];

const idsToRemove = ["sacola-29x39", "sacola-38x48"];
let modifiedCount = 0;

stores.forEach(store => {
    if (storesToUpdate.includes(store.name) && store.productIds) {
        const originalLength = store.productIds.length;
        store.productIds = store.productIds.filter(pid => !idsToRemove.includes(pid));
        if (store.productIds.length !== originalLength) {
            modifiedCount++;
            console.log(Updated: );
        }
    }
});

const newStoresText = JSON.stringify(stores, null, 4);
const newContent = content.replace(storesMatch[1], newStoresText);
fs.writeFileSync('data.js', newContent, 'utf8');
console.log(Successfully updated  stores.);
