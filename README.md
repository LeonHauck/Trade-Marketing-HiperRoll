# 📊 Trade Marketing HiperRoll Dashboard

Um **dashboard web integrado e robusto** para gerenciar visitas comerciais, monitorar rupturas e analisar dados de desempenho em redes varejistas.

Desenvolvido com foco em **produtividade operacional**, **integridade de dados** e **experiência do usuário** para a @HiperRoll Embalagens.

---

## 🎯 Visão Geral

A plataforma centraliza todo o workflow de trade marketing:
- ✅ Gerenciamento completo de visitas às lojas com rastreamento em tempo real
- ✅ Identificação e validação inteligente de rupturas (produtos fora de estoque)
- ✅ Captura de evidências fotográficas com otimização de cache
- ✅ Análise visual com gráficos interativos (composição por rede, distribuição de status)
- ✅ Geração automatizada de relatórios em PDF com KPIs e percentuais
- ✅ Sistema persistente de dados com sincronização local
- ✅ Autenticação segura com gerenciamento de sessão
- ✅ Sincronização com API backend para consolidação de dados

---

## 🚀 Começando

### Pré-requisitos

- Navegador moderno (Chrome, Firefox, Safari, Edge)
- PHP 7.4+ (para o backend)
- Servidor web (HostGator, Vercel, Netlify, ou local)

### Instalação Local

1. **Clone o repositório:**
```bash
git clone https://github.com/seu-usuario/trade-marketing-hiperroll.git
cd trade-marketing-hiperroll
```

2. **Configure as credenciais:**
```bash
cp backend/config.example.php backend/config.php
```
Edite `backend/config.php` com seu token e credenciais.

3. **Abra no navegador:**
```
file:///caminho/para/trade-marketing-hiperroll/index.html
```

### Deploy em Produção

1. Faça upload de todos os arquivos para seu servidor
2. Configure `backend/config.php` com credenciais de produção
3. Acesse via `https://seu-dominio.com`

---

## 📁 Estrutura do Projeto

```
trade-marketing-hiperroll/
├── index.html              # Interface principal
├── app.js                  # Lógica da aplicação (state, eventos, renderização)
├── data.js                 # Dados de produtos e lojas
├── storage.js              # Gerenciamento de localStorage
├── style.css               # Estilos CSS responsivos
│
├── backend/
│   ├── api.php             # API REST para sincronização de dados
│   ├── config.example.php  # Template de configuração (não commit!)
│   ├── test_write.php      # Teste de escrita de dados
│   └── uploads/            # Pasta para armazenar arquivos
│
├── .gitignore              # Arquivos ignorados pelo Git
├── .env.example            # Template de variáveis de ambiente
├── SECURITY.md             # Guia de segurança e credenciais
└── README.md               # Este arquivo
```

---

## 🛠️ Stack Tecnológico

### Frontend
- **HTML5** — Semântica estruturada
- **CSS3** — Design responsivo e moderno
- **JavaScript Vanilla** — State management e DOM manipulation
- **Chart.js** — Gráficos interativos e responsivos
- **Font Awesome** — Ícones profissionais

### Backend
- **PHP 7.4+** — API RESTful
- **JSON** — Serialização de dados

### Arquitetura & Performance
- **PWA-ready** — Funciona offline com service workers
- **Lazy Loading** — Carregamento otimizado de imagens
- **Cache Inteligente** — Gerenciamento eficiente de memória
- **localStorage** — Persistência de dados no navegador
- **Sincronização Dual** — Client + Server

---

## 📊 Funcionalidades Principais

### 1. Dashboard Principal
- Visão geral de todas as visitas
- Estatísticas em tempo real (total de lojas, rupturas, taxa de sucesso)
- Filtros por rede e status
- Exportação de dados

### 2. Gestão de Visitas
- Registro de visitas com data/hora automática
- Captura de fotos como evidência
- Validação de rupturas (2 ou mais produtos fora de estoque)
- Histórico completo de cada loja
- Status: Pendente, Visitado, Ruptura detectada

### 3. Análise de Dados
- Gráficos de composição por rede
- Distribuição de rupturas vs. sem ruptura
- Relatórios PDF automáticos com cálculos de percentual
- Filtros por período e rede

### 4. Segurança
- Autenticação por login/senha
- Token de API para comunicação backend
- `.gitignore` para proteção de credenciais
- CORS e validação de requisições

---

## 🔒 Segurança

**IMPORTANTE:** Este projeto contém dados sensíveis (tokens, senhas). 

### Proteção de Credenciais

- ✅ `backend/config.php` está no `.gitignore` (não é versionado)
- ✅ Use `.env` ou arquivos de configuração locais
- ✅ Nunca commit senhas ou tokens
- ✅ Revise o `SECURITY.md` antes de fazer deploy

**Leia [SECURITY.md](./SECURITY.md) para instruções completas.**

---

## 📈 Otimizações Implementadas

### Performance
- **Cache de Memória:** Gerenciamento eficiente de fotos (não persiste no localStorage)
- **Lazy Loading:** Imagens carregam sob demanda
- **Compressão de Dados:** Apenas metadados são persistidos
- **Fallbacks Robustos:** Tratamento de erros e localStorage bloqueado

### Arquitetura
- **Padrão de Atualizações Leves:** Apenas campos voláteis sincronizam
- **Separação de Camadas:** Frontend (app.js) e Backend (api.php)
- **State Management:** Sincronização automática de localStorage
- **Validação Dual:** Client-side + Server-side

### UX/UI
- **Responsivo:** Funciona em desktop, tablet e mobile
- **PWA-Ready:** Acesso offline
- **Acessibilidade:** Semântica HTML e contraste adequado
- **Gráficos Interativos:** Charts responsivos com dados atualizados

---

## 🧪 Testes

Para validar a instalação:

1. **Abra o console do navegador** (F12)
2. **Verifique se há erros** de CORS ou carregamento
3. **Teste o login** com credenciais definidas em `backend/config.php`
4. **Tente gerar um relatório PDF** para validar a renderização

---

## 📝 Uso Prático

### Fluxo Típico de um Agente

1. **Login** com usuário e senha
2. **Selecionar loja** para visitar
3. **Registrar visita** com data/hora automática
4. **Tirar fotos** como evidência
5. **Validar rupturas** se houver (2+ produtos fora de estoque)
6. **Sincronizar dados** com o backend
7. **Gerar relatório** em PDF para análise gerencial

### Geração de Relatórios

O sistema gera PDFs com:
- ✅ Gráficos de composição por rede
- ✅ Distribuição de rupturas vs. sem ruptura
- ✅ Percentuais de sucesso
- ✅ Data e hora de geração
- ✅ Formatação profissional pronta para apresentações

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| "CORS Error" | Configure `Access-Control-Allow-Origin` no `backend/api.php` |
| Fotos não aparecem | Verifique permissões da pasta `backend/uploads/` |
| Relatório vazio | Limpe cache do navegador (Ctrl+Shift+Delete) |
| localStorage cheio | O app limpa cache automaticamente, mas você pode limpar manualmente |
| Login não funciona | Confirme token em `backend/config.php` |

---

## 📚 Documentação Adicional

- **[SECURITY.md](./SECURITY.md)** — Guia de segurança e credenciais
- **[.env.example](./.env.example)** — Template de variáveis de ambiente
- **[backend/config.example.php](./backend/config.example.php)** — Template de configuração backend

---

## 🤝 Contribuindo

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📝 Licença

Este projeto é propriedade da **HiperRoll Embalagens**. Uso interno apenas.

---

## 👤 Autor

Desenvolvido por **Leon Rodrigues**  
Empresa: **HiperRoll Embalagens**  
Data: Junho 2026

---

**Made with ❤️ for HiperRoll Embalagens**
