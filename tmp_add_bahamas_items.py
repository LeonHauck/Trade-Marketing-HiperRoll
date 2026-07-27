from pathlib import Path
import re

path = Path(r'c:\Users\leon.rodrigues\.gemini\antigravity\scratch\trade-marketing-hiperroll\data.js')
text = path.read_text(encoding='utf-8')

new_products = [
    ('LIXO BAHAMAS 30L', 'lixo-bahamas-30l'),
    ('LIXO BAHAMAS 50L', 'lixo-bahamas-50l'),
    ('LIXO BAHAMAS 100L', 'lixo-bahamas-100l'),
]

if '"id":  "lixo-bahamas-30l"' not in text:
    marker = '    {\n        "status":  "ATIVO",\n        "name":  "BOBINA 30X40",\n        "id":  "bobina-30x40",\n        "network":  "BAHAMAS JF"\n    },\n'
    insert = ''.join([
        '    {\n        "status":  "ATIVO",\n        "name":  "' + name + '",\n        "id":  "' + pid + '",\n        "network":  "BAHAMAS"\n    },\n'
        for name, pid in new_products
    ])
    text = text.replace(marker, marker + '\n' + insert, 1)

pattern = re.compile(r'("network":\s*"(BAHAMAS(?: JF)?)",\s*"productIds":\s*\[)(?P<body>.*?)(\n\s*\],)', re.S)

def repl(match):
    body = match.group('body')
    current_ids = re.findall(r'"([^"]+)"', body)
    for _, pid in new_products:
        if pid not in current_ids:
            current_ids.append(pid)
    lines = [f'                           "{item_id}"' + (',' if idx < len(current_ids) - 1 else '') for idx, item_id in enumerate(current_ids)]
    return match.group(1) + '\n' + '\n'.join(lines) + '\n                       ]'

text = pattern.sub(repl, text)
path.write_text(text, encoding='utf-8')
print('updated')
