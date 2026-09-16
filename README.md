# Nosso Chá — convites, presença e presentes

Sistema para um chá de panela/noivado, com convite individual sem login e administração protegida. React, Vite, TypeScript, Material UI, FastAPI, SQLAlchemy e SQLite. Interface em português, branco e azul, com detalhes inspirados em azulejos portugueses.

## Executar localmente

Requisitos: Node.js 22.12+ e Python 3.11+. Execute os comandos a partir da pasta indicada. No Windows, `npm.cmd` evita depender da política de execução de scripts do PowerShell.

### API — terminal 1

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock
.\.venv\Scripts\python.exe setup_env.py
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --no-access-log
```

O comando `setup_env.py` gera uma senha e uma chave aleatórias em `backend/.env`, sem sobrescrever configurações existentes. O usuário inicial é `pedro`; consulte `ADMIN_PASSWORD` nesse arquivo para entrar. A senha não é versionada e apenas seu hash scrypt é salvo no SQLite. Você também pode copiar `.env.example` e definir os valores manualmente (senha com pelo menos 12 caracteres e chave com pelo menos 32).

No Linux/macOS, use `python3`, `.venv/bin/python` e `npm` nos comandos equivalentes.

### Interface — terminal 2

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Abra **http://localhost:5173/admin**. Use sempre `localhost` no navegador, como configurado em `FRONTEND_ORIGIN`.

Neste workspace, foi instalado Python por meio de uma cópia local do uv em `.tools/uv/uv.exe`. O ambiente `backend/.venv` já está preparado. Se o Python não estiver no PATH, execute diretamente `backend/.venv/Scripts/python.exe`.

## Primeiro uso

1. Entre em `/admin` e abra **Configurações**. Informe nome do casal, evento, data, horário, endereço e link do Maps. Os dados de data/local começam em branco.
2. Habilite acompanhantes se necessário. Desabilitar a opção zera as quantidades anteriores, conforme informado na tela.
3. Cadastre o nome do convite, por exemplo **Madrinha e família**. Esse único campo forma a saudação **Olá, Madrinha e família!** e o link **/convite/madrinha-e-familia**. Para uma família, clique em **Adicionar família** e preencha todas as pessoas em **Pessoa 1**, **Pessoa 2**, etc., inclusive a titular. Copie e compartilhe um único link.
4. Cadastre presentes, quantidade desejada e URLs externas de imagem e produto. Nenhuma imagem de produto é armazenada no projeto.
5. Acompanhe confirmações, total de pessoas e presentes completos no painel.

A raiz `/` apresenta o evento. A confirmação e a lista ficam em `/convite/{nome-do-convite}`. Nomes repetidos recebem sufixos (`-2`, `-3`, etc.). Os links antigos por token continuam aceitos. Não há convidados ou compras fictícias no banco de uso real.

Ao tocar em **Confirmar presença**, o convidado vê somente os nomes daquele convite e seleciona quem vai. Os nomes não selecionados ficam como “não vão”. Depois de salvar, a página exibe o resumo e **Alterar resposta**; não mantém um botão para salvar novamente. O painel conta cada pessoa selecionada, sem assumir que a titular vai. Famílias com nomes cadastrados funcionam mesmo com a opção de acompanhantes desabilitada; a contagem livre de acompanhantes continua disponível apenas nos convites individuais quando habilitada.

## Comportamento e segurança

- O nome cadastrado forma o endereço e a saudação. Editar esse nome gera outro endereço; regenerar invalida tanto o endereço anterior quanto o token antigo. Endereços revogados são reservados para não serem atribuídos a outra família. Os tokens antigos são mantidos apenas por compatibilidade até a regeneração.
- Cookie JWT HttpOnly, SameSite Strict, duração de 12 horas; alterações de senha no ambiente invalidam tokens antigos após reiniciar a API. Todas as rotas administrativas, exceto o login, exigem autenticação.
- Senha inicial vinda do ambiente, hash scrypt no banco, validação de URLs http/https sem credenciais, CORS com origem explícita e verificação de origem nas escritas.
- O link é a credencial do convite: quem conhecer ou adivinhar o endereço por nome pode abrir a lista daquela família e responder por ela. O endereço legível não oferece o sigilo de um token aleatório. Não há autenticação adicional do convidado.
- Compras ficam em tabela separada; quantidades são calculadas com `SUM`. `BEGIN IMMEDIATE` serializa a verificação e a gravação no SQLite, incluindo alterações da quantidade desejada.
- Não é possível registrar acima do restante ou reduzir a quantidade desejada abaixo do total comprado. Na lista de presentes, o convidado vê apenas totais, sem compradores. Na confirmação, vê apenas os nomes vinculados ao próprio convite. O servidor rejeita IDs de outras famílias e listas de pessoas desatualizadas.
- Desativar presentes preserva o histórico. Excluir convidados remove seu convite e mantém as compras, sem vínculo com o cadastro excluído.
- Imagens externas usam carregamento sob demanda, proporção fixa e placeholder em caso de falha. A política de referrer impede enviar o token a sites externos.
- Não há envio automático de mensagens, pagamentos, upload de imagens ou cadastro público.

## Testes

```powershell
cd backend
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest -q
```

Os testes usam um SQLite temporário isolado, incluindo uma corrida entre duas compras da última unidade, autenticação, privacidade, mudanças de presença, regeneração de links e preservação do histórico.

```powershell
cd frontend
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Os testes de navegador iniciam sua própria API, com banco temporário e credenciais de teste, além do Vite em uma porta separada. Não usam o banco do evento. Cobrem administração e convite em desktop e celular de 375px.

## Produção

```powershell
cd frontend
npm.cmd ci
npm.cmd run build
cd ../backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

A API serve o build do React e o fallback das rotas. Coloque-a atrás de um proxy HTTPS. Configure `FRONTEND_ORIGIN=https://seu-dominio` e `COOKIE_SECURE=true`. Reinicie a API após compilar a interface. Não exponha o servidor Vite em produção.

O HTML servido pela API inclui Open Graph com os nomes configurados e imagem PNG de azulejos gerada em memória em `/api/og-image.png`. A imagem não contém informações dos convidados. A prévia exige uma URL pública acessível ao serviço de mensagens; sua atualização pode depender do cache desse serviço. Durante o desenvolvimento pelo Vite, a substituição das tags acontece apenas ao servir o build pela API.

Mantenha `database.db` em armazenamento persistente (ou configure um caminho absoluto em `DATABASE_URL=sqlite:////caminho/database.db` no Linux). Não use instâncias com discos efêmeros nem múltiplas réplicas com arquivos SQLite independentes. Não versione o banco, `.env` ou backups. Nesta atualização, a inicialização cria as tabelas `convidado_membros` e `convite_links` e gera os endereços por nome para cadastros existentes, preservando tokens, respostas e compras. Convites antigos continuam individuais até que a família seja cadastrada. Mudanças futuras em colunas existentes exigem migração específica.

### Backup sem interromper o evento

```powershell
cd backend
.\.venv\Scripts\python.exe backup.py backups/evento-2026-10-18.db
```

Use um nome novo a cada execução. O script utiliza o mecanismo de backup do SQLite, incluindo os dados que estão no WAL. Agende uma execução diária no Agendador de Tarefas ou cron e copie os arquivos para outro local seguro. Para restaurar, pare a API, preserve o banco atual e seus arquivos WAL/SHM em outro diretório, coloque o backup no caminho configurado e reinicie.

## Estrutura

```text
backend/
  app/          Configuração, modelos, validação, autenticação e rotas
  tests/        Testes da API com SQLite temporário
  setup_env.py  Geração local de credenciais
  backup.py     Backup online do SQLite
frontend/
  src/pages/    Convite, login e páginas administrativas
  src/          Tema MUI, componentes compartilhados e cliente da API
  e2e/          Testes reais no navegador
```

Referências técnicas: [Material UI](https://mui.com/material-ui/getting-started/installation/) e [transações SQLite no SQLAlchemy](https://docs.sqlalchemy.org/en/20/dialects/sqlite.html).
