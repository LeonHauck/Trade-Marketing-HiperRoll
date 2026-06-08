# 🔒 Guia de Segurança — Trade Marketing HiperRoll

## ⚠️ Antes de fazer Push ao GitHub

### 1. Configuração de Credenciais

Este projeto contém dados sensíveis que **NUNCA** devem ser versionados no Git:

- **Tokens de API** (`API_TOKEN`)
- **Senhas de login** (admin/user)
- **Chaves privadas** (.key, .pem)
- **Dados de conexão** (banco de dados, servidores)

### 2. Passos para Proteger suas Credenciais

#### **Passo 1: Criar arquivo de configuração local**

```bash
# No backend, crie seu arquivo config.php (local, não é commitado)
cp backend/config.example.php backend/config.php
```

Edite `backend/config.php` com seus valores reais:
```php
define('API_TOKEN', 'seu_token_secreto_aqui');
define('ADMIN_PASSWORD', 'sua_senha_aqui');
```

#### **Passo 2: Verificar .gitignore**

O arquivo `.gitignore` já está configurado para ignorar:
- ✅ `backend/config.php` (credenciais do backend)
- ✅ `.env` (variáveis de ambiente)
- ✅ `*.key`, `*.pem` (chaves privadas)
- ✅ `config.php` (arquivos de config)

#### **Passo 3: Antes de fazer commit, verifique:**

```bash
# Listar arquivos que serão commitados (não deve incluir credenciais)
git status

# Verificar se há credenciais acidentalmente commitadas
git diff --cached | grep -i "password\|token\|secret"
```

### 3. Se você acidentalmente commitou credenciais:

```bash
# Remover do histórico (perigoso, use com cuidado!)
git filter-branch --tree-filter 'rm -f backend/config.php' HEAD

# Ou use o git-filter-repo (recomendado):
git filter-repo --path backend/config.php --invert-paths
```

### 4. Variáveis de Ambiente (Alternativa)

Se preferir usar `.env`:

```bash
# Crie seu arquivo local
cp .env.example .env
```

Edite `.env` com suas credenciais e deixe fora do git (já está no .gitignore).

---

## 📋 Checklist antes do GitHub

- [ ] `.gitignore` está criado e configurado
- [ ] `backend/config.php` foi criado localmente com suas credenciais
- [ ] `backend/config.php` está no `.gitignore`
- [ ] Rodei `git status` e não vejo arquivos sensíveis
- [ ] `.env` (se usado) está no `.gitignore`
- [ ] Removi qualquer hardcoded de senha/token do código

---

## 🚀 Deploy em Produção

Ao fazer deploy no servidor:

1. Copie `backend/config.example.php` → `backend/config.php`
2. Edite com valores **diferentes** e **seguros** para produção
3. Use senhas fortes (20+ caracteres aleatórios)
4. Revise permissões do arquivo: `chmod 600 backend/config.php`

---

**Segurança é responsabilidade de todos! 🔐**
