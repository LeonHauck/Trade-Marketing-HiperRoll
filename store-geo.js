// store-geo.js — coordenadas geocodificadas das lojas, a partir das planilhas de endereço
// enviadas pelo usuário. Mantido manualmente conforme as planilhas de cada rede chegam.
//
// Formato: { [storeId]: { address, lat, lng, geocodedAt, precision } }
// storeId é o mesmo "id" usado em STORES_DATA (data.js).
// precision: "endereco" = geocodificado pelo endereço completo (rua+número).
//            "bairro" = endereço exato não encontrado; usada a localização central do bairro (via CEP).
//
// Redes já processadas: BAHAMAS JF (24/24 lojas)
const STORE_GEO_DATA = {
  "bahamas-jf-02-hiper-bahamas-sao-pedro": { address: "R JOSE LOURENCO - N° 710 - LOJA 102 - SÃO PEDRO / CEP: 36.036-230", lat: -21.7704338, lng: -43.3782241, geocodedAt: "2026-08-24T13:21:13Z", precision: "endereco" },
  "bahamas-jf-12-bahamas-mix-jf-fabrica": { address: "R BERNARDO MASCARENHAS - N° 1072 - FÁBRICA / CEP: 36.080-001", lat: -21.7461087, lng: -43.3670221, geocodedAt: "2026-08-24T13:21:13Z", precision: "endereco" },
  "bahamas-jf-13-mercado-bahamas-jf-poco-rico": { address: "AV FRANCISCO VALADARES - N° 108 - POÇO RICO / CEP: 36.020-420", lat: -21.7779307, lng: -43.3274597, geocodedAt: "2026-08-24T13:21:13Z", precision: "endereco" },
  "bahamas-jf-15-supermercado-bahamas-jf-independencia": { address: "AV PRESIDENTE ITAMAR FRANCO - N° 2115 - SÃO MATEUS / CEP: 36.025-290", lat: -21.7777104, lng: -43.3584575, geocodedAt: "2026-08-24T13:21:13Z", precision: "endereco" },
  "bahamas-jf-18-mercado-bahamas-jf-grama": { address: "R DIOMAR MONTEIRO - N° 126 - GRAMA / CEP: 36.048-310", lat: -21.6908364, lng: -43.3427504, geocodedAt: "2026-08-24T13:21:13Z", precision: "endereco" },
  "bahamas-jf-19-bahamas-mix-ferreira-guimaraes": { address: "R BENJAMIM GUIMARAES - N° 315 - DEMOCRATA / CEP: 36.035-200", lat: -21.7496425, lng: -43.3686212, geocodedAt: "2026-08-24T13:21:13Z", precision: "bairro" },
  "bahamas-jf-20-bahamas-mix-benfica": { address: "R MARTINS BARBOSA - N° 738 - BENFICA / CEP: 36.090-300", lat: -21.6935439, lng: -43.4437192, geocodedAt: "2026-08-24T13:21:13Z", precision: "endereco" },
  "bahamas-jf-21-hiper-bahamas-getulio-vargas": { address: "R MARECHAL FLORIANO PEIXOTO - N° 270 - CENTRO / CEP: 36.013-080", lat: -21.7581378, lng: -43.3483689, geocodedAt: "2026-08-24T13:21:13Z", precision: "endereco" },
  "bahamas-jf-24-emporio-bahamas-jf-cascatinha": { address: "AV DOUTOR PAULO JAPIASSU COELHO - N° 548 - CASCATINHA / CEP: 36.033-310", lat: -21.7842283, lng: -43.3650956, geocodedAt: "2026-08-24T13:21:13Z", precision: "endereco" },
  "bahamas-jf-25-supermercado-bahamas-jf-teixeiras": { address: "R MARIA DE ALMEIDA SILVA - N° 849 - GALPAO 101 - TEIXEIRAS / CEP: 36.033-012", lat: -21.7908663, lng: -43.3623365, geocodedAt: "2026-08-24T13:21:13Z", precision: "bairro" },
  "bahamas-jf-26-bahamas-mix-jf-salvaterra": { address: "AV DEUSDEDITH SALGADO - N° 4992 - AREA 1-A3 - TEIXEIRAS / CEP: 36.033-000", lat: -21.8128822, lng: -43.375354, geocodedAt: "2026-08-24T13:21:13Z", precision: "endereco" },
  "bahamas-jf-4-mercado-bahamas-jf-sta-luzia": { address: "R IBITIGUAIA - N° 551 - COMPLEMENTO 557 - SANTA LUZIA / CEP: 36.030-000", lat: -21.784991, lng: -43.3464695, geocodedAt: "2026-08-24T13:21:13Z", precision: "endereco" },
  "bahamas-jf-45-bahamas-mix-jf-grama": { address: "AV JUIZ DE FORA - N° 1819 - LOJA 01 - GRAMA / CEP: 36.048-001", lat: -21.6940779, lng: -43.3529409, geocodedAt: "2026-08-24T13:21:13Z", precision: "endereco" },
  "bahamas-jf-48-bahamas-mix-jf-sao-pedro": { address: "V PEDRO NAVA (BR 440) - N° 4701 - SÃO PEDRO / CEP: 36.036-448", lat: -21.7708213, lng: -43.3879244, geocodedAt: "2026-08-24T13:21:13Z", precision: "bairro" },
  "bahamas-jf-5-supermercado-bahamas-jf-av-brasil": { address: "AV BRASIL - N° 1980 - LOJA - CENTRO / CEP: 36.062-420", lat: -21.7586768, lng: -43.3423606, geocodedAt: "2026-08-24T13:21:13Z", precision: "endereco" },
  "bahamas-jf-54-bahamas-express-jf-rio-branco": { address: "AV BARAO DO RIO BRANCO - N° 3760 - LOJA 28 -ALTO DOS PASSOS / CEP: 36.025-020", lat: -21.7749124, lng: -43.3468373, geocodedAt: "2026-08-24T13:21:13Z", precision: "endereco" },
  "bahamas-jf-59-supermercado-bahamas-jf-sta-terezinha": { address: "R DOUTOR JOSE EUTROPIO - N° 330 - SANTA TEREZINHA / CEP: 36.045-480", lat: -21.7416206, lng: -43.3651258, geocodedAt: "2026-08-24T13:21:13Z", precision: "endereco" },
  "bahamas-jf-6-emporio-bahamas-jf-sao-mateus": { address: "R SÃO MATEUS - N° 1030 - SÃO MATEUS / CEP: 36.025-001", lat: -21.7749486, lng: -43.3536976, geocodedAt: "2026-08-24T13:21:13Z", precision: "endereco" },
  "bahamas-jf-61-bahamas-mix-jf-jk": { address: "AV PRESIDENTE JUSCELINO KUBITSCHECK - N° 879 - FRANCISCO BERNARDINO / CEP: 36.083-750", lat: -21.73497, lng: -43.3982458, geocodedAt: "2026-08-24T13:21:13Z", precision: "bairro" },
  "bahamas-jf-7-bahamas-mix-j-clube": { address: "AV DOARDINO LONGO - N° 669 - BARBOSA LAGE / CEP: 36.085-050", lat: -21.719425, lng: -43.396732, geocodedAt: "2026-08-24T13:21:13Z", precision: "bairro" },
  "bahamas-jf-8-hiper-bahamas-sao-vicente": { address: "AV BARAO DO RIO BRANCO - N° 3760 - GALPÃO - ALTO DOS PASSOS / CEP: 36.025-020", lat: -21.7749124, lng: -43.3468373, geocodedAt: "2026-08-24T13:21:13Z", precision: "endereco" },
  "bahamas-jf-86-bahamas-mix-jf-retiro": { address: "AV DOUTOR FRANCISCO ALVARES DE ASSIS - N° 3000 - KM 87 LOJA 5 - BARAO DO RETIRO / CEP: 36.073-130", lat: -21.7819825, lng: -43.2989466, geocodedAt: "2026-08-24T13:21:13Z", precision: "endereco" },
  "bahamas-jf-9-hiper-bahamas-manoel-honorio": { address: "AV RIO BRANCO - N° 700 - MANOEL HONORIO / CEP: 36.045-120", lat: -21.7455191, lng: -43.3541666, geocodedAt: "2026-08-24T13:21:13Z", precision: "endereco" },
  "bahamas-jf-92-supermercado-bahamas-jf-linhares": { address: "R DIVA GARCIA - N° 1160 - LOTE B2 - LINHARES / CEP: 36.060-300", lat: -21.7383411, lng: -43.3317314, geocodedAt: "2026-08-24T13:21:13Z", precision: "endereco" }
};
