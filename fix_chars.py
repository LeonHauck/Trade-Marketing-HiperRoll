import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Count how many FFFD chars before fix
count_before = content.count('\ufffd')
print(f"Found {count_before} replacement characters (U+FFFD)")

# Define all replacements as (pattern, replacement) tuples
replacements = [
    # UI-visible strings
    ('A\ufffd\ufffdes', 'Ações'),
    
    # Comments - complete contextual replacements
    ('Fun\ufffdo de Notifica\ufffdo Visual', 'Função de Notificação Visual'),
    ('Sincroniza\ufffdo com o Servidor HostGator (se dispon\ufffdvel)', 'Sincronização com o Servidor HostGator (se disponível)'),
    ('Mant\ufffdm propor\ufffdo da imagem', 'Mantém proporção da imagem'),
    ('modo edi\ufffdo ao fechar', 'modo edição ao fechar'),
    ('N\ufffdO \ufffd mais persistido', 'NÃO é mais persistido'),
    ('S\ufffd gera score se tiver pelo menos um motivo de aten\ufffdo', 'Só gera score se tiver pelo menos um motivo de atenção'),
    ('requer aten\ufffdo', 'requer atenção'),
    ('visita h\ufffd ', 'visita há '),
    ('no m\ufffdximo 60 dias para n\ufffdo sobrecarregar o gr\ufffdfico', 'no máximo 60 dias para não sobrecarregar o gráfico'),
    ('rede para o gr\ufffdfico', 'rede para o gráfico'),
    ('Persist\ufffdncia e sincroniza\ufffdo', 'Persistência e sincronização'),
    ('Valida\ufffdo simples', 'Validação simples'),
    ("N\ufffdo h\ufffd dados filtrados", "Não há dados filtrados"),
    ('Op\ufffdo 2: Apenas itens daquela loja espec\ufffdfica', 'Opção 2: Apenas itens daquela loja específica'),
    ('EDI\ufffdAO: sobrep\ufffde', 'EDIÇÃO: sobrepõe'),
    ('DESMARCADAS nesta edi\ufffdo', 'DESMARCADAS nesta edição'),
    ("salvar edi\ufffdo:'", "salvar edição:'"),
    ('salvar a edi\ufffdo. Tente', 'salvar a edição. Tente'),
    ('para valida\ufffdo (em lote', 'para validação (em lote'),
    ('para demonstra\ufffdo,', 'para demonstração,'),
    ('bot\ufffdo de valida\ufffdo', 'botão de validação'),
    ('Fun\ufffdo chamada pelo input', 'Função chamada pelo input'),
    ('H\ufffd ${days}d', 'Há ${days}d'),
    ('H\ufffd ${hours}h', 'Há ${hours}h'),
    ('H\ufffd ${minutes}min', 'Há ${minutes}min'),
    ('modo edi\ufffdo)', 'modo edição)'),
    ('modo edi\ufffdo se existir', 'modo edição se existir'),
    ('pr\ufffd-populado com os dados da visita para edi\ufffdo', 'pré-populado com os dados da visita para edição'),
    ('edi\ufffdo ANTES de qualquer renderiza\ufffdo', 'edição ANTES de qualquer renderização'),
    ('t\ufffdtulo e bot\ufffdo para indicar modo edi\ufffdo', 'título e botão para indicar modo edição'),
    ('edi\ufffdo para evitar inconsist\ufffdncia', 'edição para evitar inconsistência'),
    ('Pr\ufffd-preenche observa\ufffdes', 'Pré-preenche observações'),
    ('j\ufffd foi resolvido (se o produto N\ufffdO est\ufffd mais', 'já foi resolvido (se o produto NÃO está mais'),
]

# Also fix the visitCount line with ª
replacements.append(('${visitCount}\ufffd visita', '${visitCount}ª visita'))

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print(f"  Fixed: {new[:50]}...")

count_after = content.count('\ufffd')
print(f"\nRemaining replacement characters: {count_after}")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done! File saved.")
