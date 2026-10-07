// cd-clientes.js — Mapeamento de códigos de cliente para rede de destino (aba "Pedidos")
// Gerado a partir de Enderecos_cds.xlsx — cada código de cliente identifica a rede de lojas
// pra onde o pedido pode ir (ex: código 9268 = ATACADAO SA = rede ATACADAO BA). O campo
// "Código do Cliente" do modal de pedido busca aqui pra sugerir o código, preencher o nome
// do cliente automaticamente e restringir a busca de "Loja" às redes listadas.
// Destinos de entrega que NÃO são lojas (centros de distribuição). Aparecem apenas como
// opção no campo "Loja" do pedido, para os clientes cuja rede coincide com "network" —
// não entram em visitas, rotas, dashboard nem na contagem de lojas.
const PEDIDO_CD_DESTINATIONS = [
    { id: "cd-bahamas-01-zona-da-mata", name: "01 - CD ZONA DA MATA", network: "BAHAMAS" }
];

const CD_CLIENT_MAP = {
    "9268": {
        clienteNome: "ATACADAO SA",
        endereco: "RODOVIA BR 324, Nº 8420. BAIRRO: PORTO SECO PIRAJA. SALVADOR - BA",
        cdNumero: "CD 341",
        cdNome: "PIRAJA",
        networks: ["ATACADAO BA"]
    },
    "7661": {
        clienteNome: "ATACADAO SA",
        endereco: "AV PRESIDENTE DUTRA, SN. COMPLEMENTO: BR 116, KM 839. BAIRRO: CONVEIMA. VITORIA DA CONQUISTA - BA",
        cdNumero: "CD 94",
        cdNome: "VITORIA CONQUISTA - AT",
        networks: ["ATACADAO BA"]
    },
    "4400": {
        clienteNome: "BARCELOS E CIA LTDA",
        endereco: "EST CAMPO NOVO, SN. BAIRRO: CAMPO NOVO. CAMPOS DOS GOYTACAZES - RJ",
        cdNumero: "CD",
        cdNome: "MATRIZ",
        networks: ["BARCELOS ATACADISTA", "SUPER BOM"]
    },
    "1118": {
        clienteNome: "CEREAIS BRAMIL LTDA",
        endereco: "EST ELIAS JORGE, Nº 103. COMPLEMENTO: ANTIGA ESTRADA DO PASSATEMPO. BAIRRO: CANTAGALO. TRES RIOS - RJ",
        cdNumero: "PV 19",
        cdNome: "BRAMIL",
        networks: ["BRAMIL"]
    },
    "3532": {
        clienteNome: "SUPERMERCADO BAHAMAS SA",
        endereco: "RODOVIA BR 040, Nº 780. COMPLEMENTO: KM. BAIRRO: DISTRITO INDUSTRIAL/BENFICA. JUIZ DE FORA - MG",
        cdNumero: "LJ 01",
        cdNome: "ZONA DA MATA",
        networks: ["BAHAMAS", "BAHAMAS JF"]
    },
    "4272": {
        clienteNome: "ATACADAO SA",
        endereco: "AVENIDA CESARIO CROSARA, Nº 925. BAIRRO: PRESIDENTE ROOSEVELT. UBERLANDIA - MG",
        cdNumero: "LJ 30",
        cdNome: "UBERLANDIA",
        networks: ["ATACADAO MG"]
    },
    "5820": {
        clienteNome: "ATACADAO SA",
        endereco: "AVENIDA GARCIA RODRIGUES PAES, Nº 12415. BAIRRO: INDUSTRIAL. JUIZ DE FORA - MG",
        cdNumero: "LJ 147",
        cdNome: "JUIZ DE FORA",
        networks: ["ATACADAO MG"]
    },
    "10387": {
        clienteNome: "ATACADAO SA",
        endereco: "ROD BR-040, Nº 2420. COMPLEMENTO: KM:2.5. BAIRRO: MORADA NOVA. CONTAGEM - MG",
        cdNumero: "LJ 180",
        cdNome: "CONTAGEM",
        networks: ["ATACADAO MG"]
    },
    "10388": {
        clienteNome: "ATACADAO SA",
        endereco: "AV SANTOS DUMONT, Nº 1750. BAIRRO: SANTA MARIA. UBERABA - MG",
        cdNumero: "LJ 241",
        cdNome: "UBERABA",
        networks: ["ATACADAO MG"]
    },
    "10389": {
        clienteNome: "ATACADAO SA",
        endereco: "R POLICENAS MASCARENHA, Nº 33. BAIRRO: SÃO GERALDO. SETE LAGOAS - MG",
        cdNumero: "LJ 337",
        cdNome: "SETE LAGOAS",
        networks: ["ATACADAO MG"]
    },
    "10390": {
        clienteNome: "WMS SUPERMERCADOS DO BRASIL LTDA",
        endereco: "AV MARABA, Nº 621. BAIRRO: BELA VISTA. PATOS DE MINAS - MG",
        cdNumero: "LJ 668",
        cdNome: "PATOS DE MINAS",
        networks: ["ATACADAO MG"]
    },
    "6904": {
        clienteNome: "ATACADAO SA",
        endereco: "RUA DA SERTANEJA, Nº 100. BAIRRO: MORADA DO TREVO. BETIM - MG",
        cdNumero: "LJ 167",
        cdNome: "BETIM",
        networks: ["ATACADAO MG"]
    },
    "6897": {
        clienteNome: "ATACADAO SA",
        endereco: "AV RIO BAHIA, Nº 667. BAIRRO: VILA ISA. GOVERNADOR VALADARES - MG",
        cdNumero: "LJ 170",
        cdNome: "GOVERNADOR VALADARES",
        networks: ["ATACADAO MG"]
    },
    "10392": {
        clienteNome: "WMS SUPERMERCADOS DO BRASIL LTDA",
        endereco: "AV PORTUGAL, Nº 5500. BAIRRO: SÃO TOMAZ. BELO HORIZONTE - MG",
        cdNumero: "LJ 684",
        cdNome: "PAMPULHA",
        networks: ["ATACADAO MG"]
    },
    "10391": {
        clienteNome: "WMS SUPERMERCADOS DO BRASIL LTDA",
        endereco: "AV GENERAL DAVID SARNOFF, Nº 5230. BAIRRO: CIDADE INDUSTRIAL. CONTAGEM - MG",
        cdNumero: "LJ 672",
        cdNome: "CONTAGEM SHOPPING",
        networks: ["ATACADAO MG"]
    }
};
