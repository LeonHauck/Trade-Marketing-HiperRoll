from pathlib import Path
import re

path = Path('data.js')
text = path.read_text(encoding='utf-8')

names = {
    '924 ATACADAO - ALAGOINHAS',
    '926 ATACADAO - BARREIRAS',
    '845 ATACADAO - CAMAÇARI CENTRO',
    '915 ATACADAO - CAMAÇARI VIA PARAFUSO',
    '911 ATACADAO - EUNAPOLIS',
    '830 ATACADAO - FEIRA PEDRA DESCANSO',
    '908 ATACADAO - FEIRA SUBAE',
    '914 ATACADAO - FEIRA MORADA DAS ARVORES',
    '906 ATACADAO - ILHEUS BR',
    '932 ATACADAO - ILHEUS PRAIA',
    '913 ATACADAO - IRECE',
    '887 ATACADAO - JUAZEIRO',
    '824 ATACADAO - LAURO DE FREITAS CAJI',
    '902 ATACADAO - SANTO ANTONIO DE JESUS',
    '909 ATACADAO - SIMOES FILHO',
    '910 ATACADAO - TEXEIRA DE FREITAS',
    '896 ATACADAO - VALENCA',
    '741 ATACADAO - ITAPARICA',
    '820 ATACADAO - VITORIA DA CONQUISTA BRUMADO',
    '894 ATACADAO - VITORIA CONQUISTA AV PRES DUTRA - BR',
    '68 ATACADAO - ARACAJU BR',
    '862 ATACADAO - ARACAJU GONÇALO PRADO'
}

pattern = re.compile(r'(\{[\s\S]*?"name":\s*"([^"]+)"[\s\S]*?\})')


def remove_ids(block: str) -> str:
    lines = block.splitlines(keepends=True)
    out = []
    in_product = False
    for line in lines:
        if in_product:
            if re.match(r'\s*\],', line) or re.match(r'\s*\]', line):
                in_product = False
                out.append(line)
                continue
            if re.search(r'\b(122|123)\b', line):
                continue
            out.append(line)
            continue
        if '"productIds"' in line:
            in_product = True
            out.append(line)
            continue
        out.append(line)
    return ''.join(out)

result = []
start = 0
for m in pattern.finditer(text):
    full = m.group(1)
    name = m.group(2)
    result.append(text[start:m.start(1)])
    if name in names:
        result.append(remove_ids(full))
    else:
        result.append(full)
    start = m.end(1)
result.append(text[start:])

path.write_text(''.join(result), encoding='utf-8')
print('done')
