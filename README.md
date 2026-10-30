![](https://i.ibb.co/35zzbQct/a1.png)


# MMZ IPTV PLAYER

Player de IPTV para **Windows e Linux** construído com **Electron + React + TypeScript**.
Interface escura (Dark Mode) inspirada na experiência da **Claro TV+ / Claro Box TV**, com
navegação **por teclado e controle remoto** (estilo Smart TV / Android TV).

![status](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-blue) ![stack](https://img.shields.io/badge/stack-Electron%20%2B%20React%20%2B%20Vite-orange)

---

## ✨ Funcionalidades

- 📺 **Canais ao Vivo, Filmes (VOD) e Séries** — separados **pelo conteúdo real de cada stream**,
  e não só pelo nome do grupo: extensões de vídeo (`mp4`, `mkv`…) e caminhos `/vod/` viram
  Filmes/Séries, enquanto `m3u8`, `/live/`, `chunklist` etc. continuam ao vivo mesmo que o grupo se
  chame "Filmes e Séries" (caso comum em listas IPTV).
- 🌐 **Multi-idioma** — interface em **Português (Brasil), English e Español**, com datas, horas e
  erros também traduzidos. O idioma fica salvo nas Preferências e é aplicado também nas mensagens
  do processo principal.
- 🖱️ **Mouse de primeira classe** — além do teclado/controle, tudo é clicável: passar o mouse por
  um card já move o anel de foco (clique e setas agem sobre o mesmo item), as linhas da Home e a
  barra de categorias têm barra de rolagem visível e o player ganhou botões de trocar de canal.
  O foco **não é roubado** por um ponteiro parado: ele só acompanha o mouse quando ele se move.
- 📋 **Gerenciador de listas M3U/M3U8** — adicione por URL ou arquivo local; parse automático de
  nome, logo, categoria (`group`) e URL do stream, com **cache local** (funciona offline depois do
  primeiro carregamento). **URLs sem extensão funcionam** (`https://pastebin.com/raw/abc123`), e
  quando algo falha o app explica o motivo (página HTML no lugar da lista, arquivo inexistente,
  endereço sem `http://`, rede fora do ar...).
- 📅 **EPG (XMLTV)** — carregue um guia em XML (URL ou arquivo). Os programas são cruzados com os
  canais pelo `tvg-id`, exibindo **programa atual e próximo** nos cards, no player e no guia
  completo (tecla `G`).
- 🎬 **Player embutido** — HLS/m3u8 via `hls.js` (com worker) e mídia nativa para MP4/MKV, com
  volume, mudo, tela cheia, barra de progresso para VOD e **reconexão automática** em caso de falha
  do stream.
- ⚡ **Zaping rápido** — troque de canal com `↑` / `↓` direto no player, sem sair da tela cheia.
- 🎮 **Navegação Keyboard First** — toda a interface é operada por setas, `Enter` e `Esc`, com
  foco visual claro (anel brilhante), simulando a experiência de Smart TV — e **sem abrir mão do
  mouse**, que executa as mesmas ações.
- 🚀 **Alta performance** — listas com milhares de canais são exibidas com **virtualização**
  (`react-window`), renderizando apenas os cards visíveis.

## 🖥️ Atalhos de teclado

| Tecla | Ação |
| --- | --- |
| `↑ ↓ ← →` | Navegar em menus, categorias e grades |
| `Enter` / `Espaço` | Abrir / reproduzir / pausar |
| `Esc` | Voltar (fecha guia → sai da tela cheia → fecha player → limpa busca → menu lateral) |
| `Tab` (na grade) | Focar o menu lateral |
| Letras + `Backspace` | Busca incremental nos canais |
| `↑ ↓` (no player) | **Zaping** — trocar de canal |
| `← →` (no player, VOD) | Voltar / avançar 10 s |
| `+` / `-` e `M` | Volume e mudo |
| `G` | Guia de programação (EPG) do canal |
| `I` | Informações do canal/programa |
| `F` / `F11` | Tela cheia |

### 🖱️ Uso com mouse

- **Passar o mouse** sobre um card, item do menu ou chip de categoria move o anel de foco — o que
  você aponta é o que `Enter` abre.
- **Clicar** reproduz o canal/filme ou abre a seção, exatamente como `Enter`.
- **Arrastar / rolar** as linhas da Home e a barra de categorias (barras de rolagem visíveis).
- Os botões do player (mudo, volume, tela cheia, informações, trocar de canal) são clicáveis.
- O foco só segue o mouse quando ele **se move**: se você está navegando por teclado/controle e o
  ponteiro fica parado sobre um card, nada muda.

---

## 🌐 Idioma

Em **Ajustes → Preferências → Idioma do app**, escolha **Português (Brasil)**, **English** ou
**Español**. A interface, os erros e as datas/horas são traduzidos imediatamente e a escolha fica
salva para as próximas execuções.

---

## 🛠️ Stack tecnológica

| Camada | Tecnologia |
| --- | --- |
| Core | Electron (latest stable) + electron-vite |
| Frontend | React 18 + TypeScript + Vite |
| Estilo | Tailwind CSS |
| Ícones | lucide-react |
| Player | `hls.js` (HLS/m3u8) + `<video>` nativo |
| Estado | Zustand |
| Parse M3U | `iptv-playlist-parser` (+ parser manual de fallback) |
| Parse XMLTV | `fast-xml-parser` |
| Virtualização | `react-window` |
| Build | electron-builder (NSIS no Windows, AppImage + deb no Linux) |

---

## 📦 Instalação

Requisitos: **Node.js 18+** (recomendado 20 LTS) e **npm**.

```bash
# 1. Clone o repositório
git clone <url-do-repositorio> mmz-iptv-player
cd mmz-iptv-player

# 2. Instale as dependências
npm install
```

## ▶️ Desenvolvimento

```bash
npm run dev
```

Sobe o Electron com Hot Module Replacement (renderer) via `electron-vite`.

Comandos úteis:

```bash
npm run typecheck      # valida tipos (main + renderer)
npm test               # testes de fumaça (parsers M3U/XMLTV + serviços)
npm run test:e2e       # teste visual E2E (abre o app; valida teclado, mouse, VOD e idiomas)
npm run test:e2e -- 9400   # idem, usando outra porta de debug (se 9380 já estiver em uso)
npm run build          # gera o bundle de produção em ./out
npm run start          # executa o bundle gerado (preview)
npm run icon           # regenera build/icon.png (512x512)
```

> 💡 **Modo portátil:** defina a variável de ambiente `MMZ_USER_DATA_DIR` para redirecionar o
> diretório de dados (cache de listas e EPG). Útil para rodar o app de um pendrive ou em testes.

## 📦 Build / Distribuição

```bash
# Windows -> instalador NSIS (.exe) em ./dist
npm run dist:win

# Linux -> AppImage e .deb em ./dist
npm run dist:linux

# Ambas as plataformas (requer ambientes compatíveis)
npm run dist
```

> O build do Windows deve ser feito em uma máquina Windows (ou com Wine configurado).
> O `postinstall` roda `electron-builder install-app-deps`, rebuildando as dependências nativas
> para a versão do Electron utilizada.

---

## 📖 Instruções de uso

### 1. Adicionar uma lista M3U

1. Abra **Ajustes** (ícone de engrenagem no menu lateral).
2. Em **Listas M3U**, informe um nome (opcional) e a **URL** da sua lista
   (`https://servidor.com/playlist.m3u`) — ou clique em **Selecionar arquivo local** para usar um
   `.m3u`/`.m3u8` do seu computador.
   - A URL **não precisa terminar em `.m3u`/`.m3u8`**: endereços de conteúdo cru como
     `https://pastebin.com/raw/VTgpRK2k` ou `https://servidor.com/get.php?...` também funcionam.
   - Se o app não conseguir adicionar, ele diz por quê: resposta que é uma **página HTML** (a URL
     não é a lista em si), **arquivo inexistente**, endereço **sem `http://`**, ou falha de rede.
3. Clique em **Adicionar lista**. O app faz o parse automático e mostra quantos canais foram
   carregados.
4. Os canais aparecem em **Canais ao Vivo**, **Filmes** e **Séries**, agrupados automaticamente
   pelos grupos do arquivo.

> 💡 **Filmes e Séries aparecem só quando a lista realmente tem VOD.** A separação considera o
> formato de cada stream: um canal `m3u8` de transmissão linear continua em **Canais ao Vivo**
> mesmo que esteja dentro de um grupo chamado "Filmes e Séries". Se a sua lista mistura VOD
> "escondido" em grupos de canais ao vivo, ative **Ajustes → Preferências → Exibir também canais
> lineares cujo grupo indica filme/série**.

> 💡 Depois do primeiro carregamento, os dados ficam em cache no diretório de dados do usuário
> (`userData/mmz-data`), então o app continua utilizável **offline**. Use **Atualizar** para
> sincronizar a lista novamente.

### 2. Carregar o EPG (guia de programação)

1. Em **Ajustes → Guia de programação (EPG)**, informe a **URL do XMLTV** (aceita `.xml` e
   `.xml.gz`) ou selecione um arquivo local.
2. Clique em **Carregar EPG**. O app informa a quantidade de canais e programas indexados.
3. Na interface, os cards passam a mostrar o **programa atual**, barra de progresso e o **próximo
   programa**. No player, pressione `I` para os detalhes ou `G` para o guia completo do canal.

> O cruzamento é feito pelo atributo `tvg-id` das tags `<channel>`/`<programme>` do XMLTV e pelo
> `tvg-id` presente nos `#EXTINF` da lista M3U.

### 3. Assistir

- **Início**: banner em destaque + linhas por categoria (navegue com as setas e `Enter`, ou
  aponte e clique com o mouse).
- **Canais/Filmes/Séries**: use `← → ↑ ↓` na barra de categorias e na grade; `Enter` reproduz.
  Com mouse: passe sobre o card e clique.
- No player: `↑ ↓` zapeia os canais (ou use os botões ↕ na barra de controles), `G` abre o guia,
  `Esc` volta.

---

## 🧭 Estrutura do projeto

```
mmz-iptv-player/
├── build/                       # ícone e recursos do instalador
├── scripts/
│   ├── generate-icon.js         # gera o ícone PNG sem dependências
│   ├── run-tests.mjs            # compila e roda os testes de fumaça (npm test)
│   └── _test/                   # testes: parsers.test.ts, services.test.ts, e2e.mjs (visual)
├── src/
│   ├── main/                    # processo MAIN (Electron)
│   │   ├── index.ts             # criação da janela, app lifecycle
│   │   ├── ipc.ts               # registro dos handlers IPC
│   │   ├── services/
│   │   │   ├── storage.ts       # persistência (store.json, cache de canais, EPG gz)
│   │   │   ├── source.ts        # download/leitura de URLs e arquivos locais (+ retry com UA)
│   │   │   ├── playlist.ts      # parse M3U, dedupe e detecção live/VOD/séries
│   │   │   ├── i18n.ts          # tradução das mensagens de erro do processo principal
│   │   │   └── epg.ts           # parse XMLTV, índice now/next e schedule
│   │   └── types/
│   ├── preload/
│   │   ├── index.ts             # contextBridge -> window.mmz
│   │   └── index.d.ts
│   ├── renderer/                # processo RENDERER (React)
│   │   ├── index.html
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── components/
│   │       │   ├── channels/    # ChannelCard, ChannelGrid (virtualizada), CategoryBar
│   │       │   ├── layout/      # Sidebar, TopBar
│   │       │   ├── player/      # PlayerOverlay (hls.js), GuideOverlay (EPG)
│   │       │   └── ui/          # Toast, EmptyState
│   │       ├── hooks/           # useKeyHandler, useAppKeys (teclado global + EPG sync), useT (i18n)
│   │       ├── screens/         # Home, Content (canais/VOD/séries), Settings
│   │       ├── store/           # Zustand + seletores
│   │       └── utils/           # formatação de tempo/EPG
│   └── shared/                  # tipos e utilitários compartilhados (isomórficos)
│       ├── channel.ts           # detecção live/VOD/séries a partir da URL e do grupo
│       ├── i18n.ts              # dicionários pt/en/es + translate()
│       └── types.ts             # tipos de canal, EPG e configurações
├── electron.vite.config.ts
├── electron-builder.yml
├── tailwind.config.js
└── package.json
```

## 🔐 Segurança

- `contextIsolation: true` e `nodeIntegration: false`; o renderer acessa o sistema apenas pela
  ponte `window.mmz` exposta pelo preload.
- Links externos são abertos no navegador padrão do sistema (`setWindowOpenHandler`).
- CSP restritiva no `index.html`.

## ❓ Solução de problemas

| Sintoma | Solução |
| --- | --- |
| Stream não carrega | Confirme se a URL abre em um navegador; muitos servidores exigem rede/VPN específicas. O app tenta reconectar automaticamente 4 vezes. |
| *"A URL respondeu, mas o conteúdo não parece uma lista M3U/M3U8"* | A resposta foi uma **página HTML** (página de login, index ou erro), não o conteúdo da lista. Use o link direto do arquivo (em sites como o Pastebin, o endereço `/raw/`). |
| *"Endereço não reconhecido"* | Informe uma URL completa começando com `http://`/`https://`, ou selecione um arquivo local. |
| *"Arquivo não encontrado"* | O caminho local não existe (o arquivo foi movido/renomeado). Selecione-o novamente. |
| Aba Filmes/Séries vazia | A lista provavelmente não tem VOD — e isso é o esperado. Se os streams VOD estão dentro de grupos de canais ao vivo, ative a preferência **Exibir também canais lineares cujo grupo indica filme/série**. |
| Interface em outro idioma | **Ajustes → Preferências → Idioma do app** (Português (Brasil), English, Español). |
| EPG vazio | Verifique se o `tvg-id` da lista M3U existe entre os `<channel id="...">` do XMLTV. |
| Sem logos | Algumas listas usam URLs quebradas; o app mostra a sigla do canal automaticamente. |
| Lista grande demais | A grade é virtualizada; ainda assim, listas com +20k canais podem demorar alguns segundos no 1º parse. |
| `npm run dist:win` falha com *"Cannot create symbolic link"* | O cache `winCodeSign` do electron-builder extrai symlinks. Ative o **Modo Desenvolvedor** do Windows (Configurações → Privacidades → Para desenvolvedores) ou execute o terminal como Administrador e tente novamente. No Linux isso não ocorre. |

## 📄 Licença

MIT © MMZ
