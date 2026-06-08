const PRODUCTS_DATA = [
    {
        "status":  "ATIVO",
        "name":  "ECONOMICO 30L",
        "id":  101,
        "network":  "BAHAMAS"
    },
    {
        "status":  "ATIVO",
        "name":  "ECONOMICO 50L",
        "id":  102,
        "network":  "BAHAMAS"
    },
    {
        "status":  "ATIVO",
        "name":  "BOBINA 20X30",
        "id":  103,
        "network":  "BAHAMAS"
    },
    {
        "status":  "ATIVO",
        "name":  "ECONOMICO 100L",
        "id":  104,
        "network":  "BAHAMAS"
    },
    {
        "status":  "ATIVO",
        "name":  "BOBINA 25X35",
        "id":  105,
        "network":  "BAHAMAS"
    },
    {
        "status":  "ATIVO",
        "name":  "SACOLA 29X39",
        "id":  106,
        "network":  "BAHAMAS"
    },
    {
        "status":  "ATIVO",
        "name":  "SACOLA 38X48",
        "id":  107,
        "network":  "BAHAMAS"
    },
    {
        "status":  "ATIVO",
        "name":  "BOBINA 30X40",
        "id":  108,
        "network":  "BAHAMAS"
    },
    {
        "status":  "ATIVO",
        "name":  "ECONOMICO 15L",
        "id":  109,
        "network":  "BARCELOS ATACADISTA"
    },
    {
        "status":  "ATIVO",
        "name":  "REFORCADO 100L",
        "id":  110,
        "network":  "BARCELOS ATACADISTA"
    },
    {
        "status":  "ATIVO",
        "name":  "REFORCADO 200L",
        "id":  111,
        "network":  "BARCELOS ATACADISTA"
    },
    {
        "status":  "ATIVO",
        "name":  "BRAMIL LIXO 15L",
        "id":  112,
        "network":  "BRAMIL"
    },
    {
        "status":  "ATIVO",
        "name":  "BRAMIL LIXO 30L",
        "id":  113,
        "network":  "BRAMIL"
    },
    {
        "status":  "ATIVO",
        "name":  "BRAMIL LIXO 50L",
        "id":  114,
        "network":  "BRAMIL"
    },
    {
        "status":  "ATIVO",
        "name":  "BRAMIL LIXO 100L",
        "id":  115,
        "network":  "BRAMIL"
    },
    {
        "status":  "ATIVO",
        "name":  "BRAMIL LIXO 100L REF",
        "id":  116,
        "network":  "BRAMIL"
    },
    {
        "status":  "ATIVO",
        "name":  "BRAMIL LIXO 200L REF",
        "id":  117,
        "network":  "BRAMIL"
    },
    {
        "status":  "ATIVO",
        "name":  "HIPERROLL 15L",
        "id":  118,
        "network":  "ATACADAO BA"
    },
    {
        "status":  "ATIVO",
        "name":  "HIPERROLL 30L",
        "id":  119,
        "network":  "ATACADAO BA"
    },
    {
        "status":  "ATIVO",
        "name":  "HIPERROLL 50L",
        "id":  120,
        "network":  "ATACADAO BA"
    },
    {
        "status":  "ATIVO",
        "name":  "HIPERROLL 100L",
        "id":  121,
        "network":  "ATACADAO BA"
    },
    {
        "status":  "ATIVO",
        "name":  "SACOLA VERDE 38X50",
        "id":  122,
        "network":  "ATACADAO BA"
    },
    {
        "status":  "ATIVO",
        "name":  "SACOLA VERDE 40X50",
        "id":  123,
        "network":  "ATACADAO BA"
    }
];

const STORES_DATA = [
    {
        "id":  1,
        "name":  "10 - SUPERMERCADO BAHAMAS VICOSA.",
        "network":  "BAHAMAS",
        "productIds":  [
                           101,
                           102,
                           103,
                           104
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  2,
        "name":  "11 - SUPERMERCADO BAHAMAS PONTE NOVA.",
        "network":  "BAHAMAS",
        "productIds":  [
                           101,
                           103,
                           104,
                           102
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  3,
        "name":  "12 - BAHAMAS MIX JF FABRICA.",
        "network":  "BAHAMAS",
        "productIds":  [
                           102,
                           104,
                           103,
                           105,
                           101,
                           106,
                           107,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  4,
        "name":  "13 - MERCADO BAHAMAS JF POCO RICO.",
        "network":  "BAHAMAS",
        "productIds":  [
                           103
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  5,
        "name":  "14 - BAHAMAS MIX CATAGUASES.",
        "network":  "BAHAMAS",
        "productIds":  [
                           101,
                           105,
                           103,
                           108,
                           107,
                           102,
                           106,
                           104
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  6,
        "name":  "15 - SUPERMERCADO BAHAMAS JF INDEPENDENCIA.",
        "network":  "BAHAMAS",
        "productIds":  [
                           102,
                           101,
                           104,
                           103
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  7,
        "name":  "17 - BAHAMAS MIX UBA AVENIDA",
        "network":  "BAHAMAS",
        "productIds":  [
                           103,
                           108,
                           104,
                           101,
                           106,
                           105,
                           102,
                           107
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  8,
        "name":  "18 - MERCADO BAHAMAS JF GRAMA.",
        "network":  "BAHAMAS",
        "productIds":  [
                           103
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  9,
        "name":  "19 - BAHAMAS MIX FERREIRA GUIMARAES",
        "network":  "BAHAMAS",
        "productIds":  [
                           102,
                           101,
                           103,
                           104,
                           108,
                           105,
                           106,
                           107
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  10,
        "name":  "02 - HIPER BAHAMAS SAO PEDRO",
        "network":  "BAHAMAS",
        "productIds":  [
                           102,
                           104,
                           101,
                           103
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  11,
        "name":  "20 - BAHAMAS MIX BENFICA.",
        "network":  "BAHAMAS",
        "productIds":  [
                           102,
                           104,
                           105,
                           101,
                           103,
                           108,
                           106,
                           107
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  12,
        "name":  "21 - HIPER BAHAMAS GETULIO VARGAS",
        "network":  "BAHAMAS",
        "productIds":  [
                           102,
                           101,
                           104,
                           103
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  13,
        "name":  "23 - SUPERMERCADO BAHAMAS ALEM PARAIBA.",
        "network":  "BAHAMAS",
        "productIds":  [
                           102,
                           101,
                           104,
                           103
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  14,
        "name":  "25 - SUPERMERCADO BAHAMAS JF TEIXEIRAS.",
        "network":  "BAHAMAS",
        "productIds":  [
                           102,
                           104,
                           101,
                           103
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  15,
        "name":  "26 - BAHAMAS MIX JF SALVATERRA",
        "network":  "BAHAMAS",
        "productIds":  [
                           102,
                           104,
                           101,
                           105,
                           103,
                           108,
                           106,
                           107
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  16,
        "name":  "27 - SUPERMERCADO BAHAMAS SAO JOAO DEL REI.",
        "network":  "BAHAMAS",
        "productIds":  [
                           104,
                           102,
                           103,
                           101
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  17,
        "name":  "28 - BAHAMAS MIX BARB.",
        "network":  "BAHAMAS",
        "productIds":  [
                           101,
                           104,
                           102,
                           108,
                           103,
                           105,
                           107,
                           106
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  18,
        "name":  "3 - SUPERMERCADO BAHAMAS BARBACENA.",
        "network":  "BAHAMAS",
        "productIds":  [
                           102,
                           103,
                           101,
                           104
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  19,
        "name":  "30 - SUPERMERCADO BAHAMAS CATAGUASES 2.",
        "network":  "BAHAMAS",
        "productIds":  [
                           102,
                           101,
                           104,
                           103
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  20,
        "name":  "32 - BAHAMAS MIX UBERLANDIA J. PINHEIRO",
        "network":  "BAHAMAS",
        "productIds":  [
                           108,
                           103,
                           107,
                           106,
                           105
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  21,
        "name":  "33 - SUPERMERCADO BAHAMAS UBERLANDIA STA ROSA.",
        "network":  "BAHAMAS",
        "productIds":  [
                           103
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  22,
        "name":  "34 - BAHAMAS MIX MURIAE.",
        "network":  "BAHAMAS",
        "productIds":  [
                           105,
                           103,
                           102,
                           108,
                           101,
                           107,
                           104,
                           106
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  23,
        "name":  "35 - BAHAMAS MIX LEOPOLDINA.",
        "network":  "BAHAMAS",
        "productIds":  [
                           103,
                           105,
                           102,
                           107,
                           104,
                           108,
                           101,
                           106
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  24,
        "name":  "38 - SUPERMERCADO BAHAMAS UBERLANDIA GRANADA",
        "network":  "BAHAMAS",
        "productIds":  [
                           104,
                           103
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  25,
        "name":  "39 - BAHAMAS MIX UBERLANDIA AEROPORTO",
        "network":  "BAHAMAS",
        "productIds":  [
                           105,
                           106,
                           108,
                           103,
                           107
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  26,
        "name":  "4 - MERCADO BAHAMAS JF STA LUZIA.",
        "network":  "BAHAMAS",
        "productIds":  [
                           103
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  27,
        "name":  "40 - BAHAMAS MIX UBA",
        "network":  "BAHAMAS",
        "productIds":  [
                           105,
                           103,
                           108,
                           102,
                           104,
                           101,
                           107,
                           106
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  28,
        "name":  "42 - BAHAMAS MIX ALEM PARAIBA",
        "network":  "BAHAMAS",
        "productIds":  [
                           105,
                           101,
                           104,
                           108,
                           103,
                           102,
                           106,
                           107
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  29,
        "name":  "43 - BAHAMAS MIX SAO JOAO DEL REI",
        "network":  "BAHAMAS",
        "productIds":  [
                           105,
                           103,
                           101,
                           108,
                           104,
                           107,
                           102,
                           106
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  30,
        "name":  "44 - BAHAMAS MIX UBERABA NSRA DO DESTERRO",
        "network":  "BAHAMAS",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  31,
        "name":  "45 - BAHAMAS MIX JF GRAMA",
        "network":  "BAHAMAS",
        "productIds":  [
                           102,
                           101,
                           104,
                           103,
                           105,
                           107,
                           108,
                           106
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  32,
        "name":  "46 - BAHAMAS MIX VICOSA",
        "network":  "BAHAMAS",
        "productIds":  [
                           102,
                           103,
                           101,
                           105,
                           104,
                           108,
                           107,
                           106
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  33,
        "name":  "47 - BAHAMAS MIX UBERLANDIA PLANALTO",
        "network":  "BAHAMAS",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  34,
        "name":  "48 - BAHAMAS MIX JF SAO PEDRO",
        "network":  "BAHAMAS",
        "productIds":  [
                           104,
                           103,
                           102,
                           101,
                           105,
                           108,
                           107,
                           106
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  35,
        "name":  "49 - BAHAMAS MIX UBERABA CHEREN",
        "network":  "BAHAMAS",
        "productIds":  [
                           105,
                           108,
                           107,
                           106,
                           103
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  36,
        "name":  "5 - SUPERMERCADO BAHAMAS JF AV.BRASIL.",
        "network":  "BAHAMAS",
        "productIds":  [
                           104,
                           102,
                           101,
                           103
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  37,
        "name":  "50 - BAHAMAS MIX PATROCINIO",
        "network":  "BAHAMAS",
        "productIds":  [
                           105,
                           103,
                           108,
                           106,
                           107
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  38,
        "name":  "52 - BAHAMAS MIX ARAGUARI",
        "network":  "BAHAMAS",
        "productIds":  [
                           108,
                           105,
                           103,
                           106,
                           107
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  39,
        "name":  "53 - BAHAMAS MIX UBERABA SANTANA BORGES",
        "network":  "BAHAMAS",
        "productIds":  [
                           108,
                           106,
                           107,
                           103,
                           105
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  40,
        "name":  "55 - BAHAMAS MIX ITUIUTABA",
        "network":  "BAHAMAS",
        "productIds":  [
                           105,
                           108,
                           103,
                           107,
                           106
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  41,
        "name":  "58 - BAHAMAS MIX MONTE CARMELO",
        "network":  "BAHAMAS",
        "productIds":  [
                           105,
                           103,
                           106,
                           108,
                           107
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  42,
        "name":  "59 - SUPERMERCADO BAHAMAS JF STA TEREZINHA",
        "network":  "BAHAMAS",
        "productIds":  [
                           102,
                           104,
                           103,
                           101
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  43,
        "name":  "61 - BAHAMAS MIX JF JK",
        "network":  "BAHAMAS",
        "productIds":  [
                           102,
                           101,
                           104,
                           103,
                           107,
                           105,
                           108,
                           106
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  44,
        "name":  "62 - SUPERMERCADO BAHAMAS UBERLANDIA MARTINS",
        "network":  "BAHAMAS",
        "productIds":  [
                           103
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  45,
        "name":  "64 - BAHAMAS MIX UBERLANDIA JOAO NAVES",
        "network":  "BAHAMAS",
        "productIds":  [
                           108,
                           106,
                           105,
                           103,
                           107
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  46,
        "name":  "65 - BAHAMAS MIX ARAXA",
        "network":  "BAHAMAS",
        "productIds":  [
                           103,
                           105,
                           108,
                           107,
                           106
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  47,
        "name":  "66 - BAHAMAS MIX PATOS DE MINAS",
        "network":  "BAHAMAS",
        "productIds":  [
                           105,
                           103,
                           107,
                           106,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  48,
        "name":  "68 - SUPERMERCADO BAHAMAS MURIAE",
        "network":  "BAHAMAS",
        "productIds":  [
                           102,
                           104,
                           101,
                           103
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  49,
        "name":  "7 - BAHAMAS MIX J.CLUBE.",
        "network":  "BAHAMAS",
        "productIds":  [
                           102,
                           104,
                           101,
                           107,
                           108,
                           103,
                           105,
                           106
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  50,
        "name":  "72 - BAHAMAS MIX FRUTAL",
        "network":  "BAHAMAS",
        "productIds":  [
                           108,
                           105,
                           103,
                           106,
                           107
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  51,
        "name":  "74 - BAHAMAS MIX UBERLANDIA ZONA SUL",
        "network":  "BAHAMAS",
        "productIds":  [
                           108,
                           105,
                           107,
                           103,
                           106
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  52,
        "name":  "75 - BAHAMAS MIX VISCONDE DO RIO BRANCO",
        "network":  "BAHAMAS",
        "productIds":  [
                           103,
                           105,
                           104,
                           101,
                           102,
                           108,
                           106,
                           107
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  53,
        "name":  "79 - BAHAMAS MIX RIO POMBA",
        "network":  "BAHAMAS",
        "productIds":  [
                           101,
                           105,
                           102,
                           104,
                           103,
                           106,
                           107,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  54,
        "name":  "8 - HIPER BAHAMAS SAO VICENTE",
        "network":  "BAHAMAS",
        "productIds":  [
                           102,
                           103,
                           104,
                           101
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  55,
        "name":  "80 - BAHAMAS MIX ITURAMA",
        "network":  "BAHAMAS",
        "productIds":  [
                           108,
                           103,
                           106,
                           105,
                           107
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  56,
        "name":  "82 - BAHAMAS MIX ARAXA SANTO ANTONIO",
        "network":  "BAHAMAS",
        "productIds":  [
                           108,
                           103,
                           105,
                           107,
                           106
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  57,
        "name":  "85 - BAHAMAS MIX EDILSON LAMARTINE",
        "network":  "BAHAMAS",
        "productIds":  [
                           105,
                           103,
                           108,
                           106,
                           107
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  58,
        "name":  "86 - BAHAMAS MIX JF RETIRO",
        "network":  "BAHAMAS",
        "productIds":  [
                           105,
                           103,
                           102,
                           104,
                           101,
                           107,
                           108,
                           106
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  59,
        "name":  "87 - BAHAMAS MIX PONTE NOVA",
        "network":  "BAHAMAS",
        "productIds":  [
                           102,
                           101,
                           105,
                           103,
                           104,
                           108,
                           107,
                           106
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  60,
        "name":  "9 - HIPER BAHAMAS MANOEL HONORIO",
        "network":  "BAHAMAS",
        "productIds":  [
                           102,
                           104,
                           101,
                           103,
                           106
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  61,
        "name":  "90 - BAHAMAS MIX SAO JOAO NEPOMUCENO",
        "network":  "BAHAMAS",
        "productIds":  [
                           104,
                           101,
                           105,
                           108,
                           103,
                           102,
                           107,
                           106
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  62,
        "name":  "91 - BAHAMAS MIX - ITUIUTABA II",
        "network":  "BAHAMAS",
        "productIds":  [
                           108,
                           103,
                           105,
                           106,
                           107
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  63,
        "name":  "92 - SUPERMERCADO BAHAMAS JF LINHARES",
        "network":  "BAHAMAS",
        "productIds":  [
                           104,
                           102,
                           101,
                           103
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  64,
        "name":  "95 - BAHAMAS MIX UBE SEGISMUNDO",
        "network":  "BAHAMAS",
        "productIds":  [
                           108,
                           103,
                           105,
                           106,
                           107
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  65,
        "name":  "239 ATACADAO - PARELHEIROS",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  66,
        "name":  "248 ATACADAO - SANTO AMARO",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  67,
        "name":  "263 ATACADAO - HORTOLANDIA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  68,
        "name":  "267 ATACADAO - COTIA CENTRO",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  69,
        "name":  "269 ATACADAO - JANDIRA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  70,
        "name":  "270 ATACADAO - LIMEIRA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  71,
        "name":  "271 ATACADAO - LIMEIRA CENTRO",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  72,
        "name":  "272 ATACADAO - OSASCO YOLANDA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  73,
        "name":  "286 ATACADAO - PACAEMBU",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  74,
        "name":  "293 ATACADAO - BARUERI",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  75,
        "name":  "295 ATACADAO - CARAPICUIBA GOPIUVA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  76,
        "name":  "296 ATACADAO - CARAPICUIBA KM21",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  77,
        "name":  "306 ATACADAO - ITAPEVI",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  78,
        "name":  "323 ATACADAO - TAMBORE",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  79,
        "name":  "326 ATACADAO - SUMARE",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  80,
        "name":  "337 ATACADAO - JUNDIAI",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  81,
        "name":  "364 ATACADAO - AMERICANA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  82,
        "name":  "389 ATACADAO - ITU",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  83,
        "name":  "425 ATACADAO - VARZEA PAULISTA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  84,
        "name":  "264 ATACADAO - CAMPINAS",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  85,
        "name":  "265 ATACADAO - CAMPINAS DOM PEDRO",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  86,
        "name":  "266 ATACADAO - CAMPINAS DUNLOP",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  87,
        "name":  "292 ATACADAO - ANCHIETA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  88,
        "name":  "297 ATACADAO - COTIA RAPOSO KM21",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  89,
        "name":  "298 ATACADAO - DIADEMA CANHEMA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  90,
        "name":  "299 ATACADAO - DIADEMA SERRARIA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  91,
        "name":  "302 ATACADAO - INAJAR DE SOUZA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  92,
        "name":  "303 ATACADAO - INDIANOPOLIS",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  93,
        "name":  "304 ATACADAO - INTERLAGOS",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  94,
        "name":  "305 ATACADAO - ITAPECERICA DA SERRA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  95,
        "name":  "309 ATACADAO - OSASCO BONANCA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  96,
        "name":  "310 ATACADAO - OSASCO CENTRO",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  97,
        "name":  "312 ATACADAO - PIRITUBA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  98,
        "name":  "320 ATACADAO - TABOAO DA SERRA CENTRO",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  99,
        "name":  "321 ATACADAO - TABOAO DA SERRA RUA DO TESOURO",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  100,
        "name":  "322 ATACADAO - TAIPAS",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  101,
        "name":  "325 ATACADAO - VILA LOBOS",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  102,
        "name":  "240 ATACADAO - FERRAZ DE VASCONCELOS",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  103,
        "name":  "241 ATACADAO - SAO MIGUEL",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  104,
        "name":  "242 ATACADAO - SUZANO",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  105,
        "name":  "243 ATACADAO - MAUA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  106,
        "name":  "244 ATACADAO - MAUA JOAO RAMALHO",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  107,
        "name":  "245 ATACADAO - RIBEIRAO PIRES",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  108,
        "name":  "246 ATACADAO - GUARULHOS AEROPORTO",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  109,
        "name":  "247 ATACADAO - VILA MARIA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  110,
        "name":  "249 ATACADAO - ITAQUERA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  111,
        "name":  "250 ATACADAO - PRAIA GRANDE",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  112,
        "name":  "251 ATACADAO - SANTOS",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  113,
        "name":  "252 ATACADAO - GUARUJA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  114,
        "name":  "253 ATACADAO - ARICANDUVA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  115,
        "name":  "254 ATACADAO - IPIRANGA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  116,
        "name":  "255 ATACADAO - VILA JACUI",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  117,
        "name":  "256 ATACADAO - AQUARIOS DULTRA SAO JOSE DOS CAMPOS",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  118,
        "name":  "257 ATACADAO - ATIBAIA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  119,
        "name":  "261 ATACADAO - SAO JOSE CAMPOS JK",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  120,
        "name":  "262 ATACADAO - TAUBATE",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  121,
        "name":  "274 ATACADAO - SANTA BARBARA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  122,
        "name":  "282 ATACADAO - DIADEMA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  123,
        "name":  "283 ATACADAO - GUARULHOS",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  124,
        "name":  "285 ATACADAO - ITANHAEM",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  125,
        "name":  "287 ATACADAO - POA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  126,
        "name":  "288 ATACADAO - SANTO ANDRE 1",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  127,
        "name":  "289 ATACADAO - SANTO ANDRE 2",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  128,
        "name":  "290 ATACADAO - TATUAPE",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  129,
        "name":  "294 ATACADAO - CAMBUCI",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  130,
        "name":  "300 ATACADAO - GUARULHOS BONSUCESSO",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  131,
        "name":  "301 ATACADAO - GUARULHOS CENTRO",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  132,
        "name":  "307 ATACADAO - ITAQUAQUECETUBA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  133,
        "name":  "308 ATACADAO - MOGI DAS CRUZES",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  134,
        "name":  "311 ATACADAO - PENHA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  135,
        "name":  "313 ATACADAO - SANTO ANDRE CENTRO",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  136,
        "name":  "314 ATACADAO - SAO BERNARDO CENTRO",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  137,
        "name":  "315 ATACADAO - SAO BERNARDO DEMARCHI",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  138,
        "name":  "316 ATACADAO - SAO BERNARDO PIRAPORINHA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  139,
        "name":  "317 ATACADAO - SAO CAETANO DO SUL",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  140,
        "name":  "318 ATACADAO - SAO VICENTE",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  141,
        "name":  "324 ATACADAO - VILA GUILHERME",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  142,
        "name":  "327 ATACADAO - SAO JOSE DOS CAMPOS SHOPPING",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  143,
        "name":  "365 ATACADAO - ARACATUBA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  144,
        "name":  "366 ATACADAO - ARARAS",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  145,
        "name":  "367 ATACADAO - ASSIS",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  146,
        "name":  "370 ATACADAO - BARRETOS",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  147,
        "name":  "371 ATACADAO - BAURU",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  148,
        "name":  "376 ATACADAO - CATANDUVA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  149,
        "name":  "386 ATACADAO - FRANCA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  150,
        "name":  "391 ATACADAO - JACAREI",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  151,
        "name":  "398 ATACADAO - MARILIA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  152,
        "name":  "399 ATACADAO - MOGI GUACU",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  153,
        "name":  "401 ATACADAO - OURINHOS",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  154,
        "name":  "407 ATACADAO - RIO CLARO",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  155,
        "name":  "258 ATACADAO - CARAGUATATUBA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  156,
        "name":  "259 ATACADAO - JACAREI",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  157,
        "name":  "260 ATACADAO - MOGI MIRIM",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  158,
        "name":  "268 ATACADAO - INDAIATUBA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  159,
        "name":  "319 ATACADAO - SOROCABA CAMPOLIM",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  160,
        "name":  "328 ATACADAO - PRESIDENTE PRUDENTE",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  161,
        "name":  "329 ATACADAO - PRESIDENTE PRUDENTE II - MONTE ALTO",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  162,
        "name":  "330 ATACADAO - ARARAQUARA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  163,
        "name":  "331 ATACADAO - RIBEIRAO PRETO VIA NORTE",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  164,
        "name":  "388 ATACADAO - GUARATINGUETA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  165,
        "name":  "402 ATACADAO - PIRACICABA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  166,
        "name":  "406 ATACADAO - RIBEIRAO PRETO",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  167,
        "name":  "412 ATACADAO - SAO CARLOS",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  168,
        "name":  "414 ATACADAO - SAO JOSE DO RIO PRETO AMERICA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  169,
        "name":  "BARCELOS ATACADISTA - GUARUS PLAZA",
        "network":  "BARCELOS ATACADISTA",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  170,
        "name":  "BARCELOS ATACADISTA - ITABORAI",
        "network":  "BARCELOS ATACADISTA",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  171,
        "name":  "BARCELOS ATACADISTA - SAO GONCALO",
        "network":  "BARCELOS ATACADISTA",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  172,
        "name":  "SUPER BOM - 13 DE MAIO",
        "network":  "SUPER BOM",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  173,
        "name":  "SUPER BOM - CAMPO GRANDE",
        "network":  "SUPER BOM",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  174,
        "name":  "SUPER BOM - COLUBANDE",
        "network":  "SUPER BOM",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  175,
        "name":  "SUPER BOM - CURICICA",
        "network":  "SUPER BOM",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  176,
        "name":  "SUPER BOM - GOYTACAZES",
        "network":  "SUPER BOM",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  177,
        "name":  "SUPER BOM - GUARUS PLAZA",
        "network":  "SUPER BOM",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  178,
        "name":  "SUPER BOM - IPS",
        "network":  "SUPER BOM",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  179,
        "name":  "SUPER BOM - NOVA IGUACU",
        "network":  "SUPER BOM",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  180,
        "name":  "SUPER BOM - PARTAGE SHOPPING",
        "network":  "SUPER BOM",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  181,
        "name":  "SUPER BOM - SAO PEDRO DA ALDEIA",
        "network":  "SUPER BOM",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  182,
        "name":  "SUPER BOM - 28 DE MARCO",
        "network":  "SUPER BOM",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  183,
        "name":  "SUPER BOM - TARCISIO MIRANDA",
        "network":  "SUPER BOM",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  184,
        "name":  "SUPER BOM - CAMPISTA",
        "network":  "SUPER BOM",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  185,
        "name":  "SUPER BOM - BARTOLOMEU",
        "network":  "SUPER BOM",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  186,
        "name":  "SUPER BOM - ALBERTO TORRES",
        "network":  "SUPER BOM",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  187,
        "name":  "SUPER BOM - VISCONDE JOSE ALVES DE AZEVEDO",
        "network":  "SUPER BOM",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  188,
        "name":  "SUPER BOM - UEBE TURF",
        "network":  "SUPER BOM",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  189,
        "name":  "SUPER BOM - ALBERTO LAMEGO",
        "network":  "SUPER BOM",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  190,
        "name":  "SUPER BOM - SAO JOAO DA BARRA",
        "network":  "SUPER BOM",
        "productIds":  [
                           109,
                           101,
                           102,
                           104,
                           110,
                           111
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  191,
        "name":  "ATACADAO MG - UBERLANDIA",
        "network":  "ATACADAO MG",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  192,
        "name":  "ATACADAO MG - JUIZ DE FORA",
        "network":  "ATACADAO MG",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  194,
        "name":  "ATACADAO MG - CONTAGEM",
        "network":  "ATACADAO MG",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  195,
        "name":  "ATACADAO MG - UBERABA",
        "network":  "ATACADAO MG",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  196,
        "name":  "ATACADAO MG - SETE LAGOAS",
        "network":  "ATACADAO MG",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  197,
        "name":  "ATACADAO MG - PATOS DE MINAS",
        "network":  "ATACADAO MG",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  198,
        "name":  "ATACADAO MG - BELO HORIZONTE",
        "network":  "ATACADAO MG",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  199,
        "name":  "ATACADAO MG - BETIM",
        "network":  "ATACADAO MG",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  200,
        "name":  "ATACADAO MG - GOVERNADOR VALADARES",
        "network":  "ATACADAO MG",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  201,
        "name":  "ATACADAO MG - PAMPULHA",
        "network":  "ATACADAO MG",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  202,
        "name":  "ATACADAO MG - CONTAGEM SHOPPING",
        "network":  "ATACADAO MG",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  203,
        "name":  "Bramil - Areal",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  204,
        "name":  "Bramil - Nova Friburgo",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  205,
        "name":  "Bramil - Pinheiral I",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  206,
        "name":  "Bramil - Pinheiral II",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  207,
        "name":  "Bramil Barra do Pirai",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  208,
        "name":  "Bramil - Paraiba do Sul I",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  209,
        "name":  "Bramil - Paraiba do Sul II",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  210,
        "name":  "Bramil - Paraiba do Sul III",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  211,
        "name":  "Bramil - Tres Rios I",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  212,
        "name":  "Bramil - Tres Rios II",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  213,
        "name":  "Bramil - Tres Rios III",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  214,
        "name":  "Bramil - Levy Gasparian",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  215,
        "name":  "Bramil - Paty dos Alferes I",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  216,
        "name":  "Bramil - Paty dos Alferes II",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  217,
        "name":  "Bramil - Valenca",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  218,
        "name":  "Bramil - Matias Barbosa",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  219,
        "name":  "Bramil - Petropolis I",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  220,
        "name":  "Bramil - Petropolis II",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  221,
        "name":  "Bramil - Petropolis III",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  222,
        "name":  "Bramil - Petropolis IV",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  223,
        "name":  "Bramil - Vassouras",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  224,
        "name":  "Bramil - Miguel Pereira",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  225,
        "name":  "Bramil - Volta Redonda",
        "network":  "BRAMIL",
        "productIds":  [
                           112,
                           113,
                           114,
                           115,
                           116,
                           117
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  226,
        "name":  "415 ATACADAO - SAO JOSE DO RIO PRETO II FALAVINA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  227,
        "name":  "418 ATACADAO - SOROCABA",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  228,
        "name":  "420 ATACADAO - SOROCABA ITAVUVU",
        "network":  "ATACADAO SP",
        "productIds":  [
                           103,
                           105,
                           108
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  229,
        "name":  "924 ATACADAO - ALAGOINHAS",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  230,
        "name":  "68 ATACADAO - ARACAJU BR",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  231,
        "name":  "109 ATACADAO - ARACAJU CD",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  232,
        "name":  "862 ATACADAO - ARACAJU GONÇALO PRADO",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  233,
        "name":  "274 ATACADAO - ARACAJU TANCREDO NEVES",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  234,
        "name":  "926 ATACADAO - BARREIRAS",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  235,
        "name":  "845 ATACADAO - CAMAÇARI CENTRO",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  236,
        "name":  "915 ATACADAO - CAMAÇARI VIA PARAFUSO",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  237,
        "name":  "911 ATACADAO - EUNAPOLIS",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  238,
        "name":  "124 ATACADAO - FEIRA DE SANTANA CD",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  239,
        "name":  "914 ATACADAO - FEIRA MORADA DAS ARVORES",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  240,
        "name":  "830 ATACADAO - FEIRA PEDRA DESCANSO",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  241,
        "name":  "908 ATACADAO - FEIRA SUBAE",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  242,
        "name":  "906 ATACADAO - ILHEUS BR",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  243,
        "name":  "932 ATACADAO - ILHEUS PRAIA",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  244,
        "name":  "913 ATACADAO - IRECE",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  245,
        "name":  "741 ATACADAO - ITAPARICA",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  246,
        "name":  "887 ATACADAO - JUAZEIRO",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  247,
        "name":  "824 ATACADAO - LAURO DE FREITAS CAJI",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  248,
        "name":  "907 ATACADAO - LAURO DE FREITAS PORTAO",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  249,
        "name":  "902 ATACADAO - SANTO ANTONIO DE JESUS",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  250,
        "name":  "909 ATACADAO - SIMOES FILHO",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  251,
        "name":  "916 ATACADAO - SSA ACM",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  252,
        "name":  "695 ATACADAO - SSA BARRA",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  253,
        "name":  "919 ATACADAO - SSA BARROS REIS",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  254,
        "name":  "918 ATACADAO - SSA BONOCO",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  255,
        "name":  "835 ATACADAO - SSA CABULA",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  256,
        "name":  "917 ATACADAO - SSA CAJAZEIRAS",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  257,
        "name":  "942 ATACADAO - SSA CAMPINAS BROTAS",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  258,
        "name":  "618 ATACADAO - SSA GARIBALDI",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  259,
        "name":  "920 ATACADAO - SSA IGUATEMI",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  260,
        "name":  "742 ATACADAO - SSA ITAPUA",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  261,
        "name":  "851 ATACADAO - SSA MARES",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  262,
        "name":  "921 ATACADAO - SSA MATA ESCURA",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  263,
        "name":  "841 ATACADAO - SSA PAU DA LIMA",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  264,
        "name":  "925 ATACADAO - SSA PIRAJA",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  265,
        "name":  "341 ATACADAO - SSA PIRAJA CD",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  266,
        "name":  "696 ATACADAO - SSA PITUBA",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  267,
        "name":  "923 ATACADAO - SSA TROBOGY",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  268,
        "name":  "910 ATACADAO - TEXEIRA DE FREITAS",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  269,
        "name":  "896 ATACADAO - VALENCA",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  270,
        "name":  "94 ATACADAO - VITORIA CONQUISTA CD",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  271,
        "name":  "894 ATACADAO - VITORIA CONQUISTA AV PRES DUTRA - BR",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    },
    {
        "id":  272,
        "name":  "820 ATACADAO - VITORIA DA CONQUISTA BRUMADO",
        "network":  "ATACADAO BA",
        "productIds":  [
                           103,
                           105,
                           108,
                           106,
                           107,
                           118,
                           119,
                           120,
                           121,
                           110,
                           111,
                           122,
                           123
                       ],
        "status":  "pending",
        "lastVisit":  null
    }
];




