/**
 * Internacionalização compartilhada entre Main (Electron) e Renderer (React).
 * Dicionários em PT-BR (padrão), EN e ES. Módulo isomórfico: sem Node/Electron.
 *
 * Uso no renderer: `const t = useT()` (hooks/useT.ts)
 * Uso no main:     `const t = (k, v) => translate(storage.getSettings().language, k, v)`
 */

export type Language = 'pt' | 'en' | 'es'

export interface LanguageOption {
  id: Language
  label: string
  /** Locale usado em datas/horas (Intl). */
  locale: string
}

export const LANGUAGES: LanguageOption[] = [
  { id: 'pt', label: 'Português (Brasil)', locale: 'pt-BR' },
  { id: 'en', label: 'English', locale: 'en-US' },
  { id: 'es', label: 'Español', locale: 'es-ES' }
]

export const DEFAULT_LANGUAGE: Language = 'pt'

export function localeOf(language: Language | undefined): string {
  return LANGUAGES.find((l) => l.id === language)?.locale ?? 'pt-BR'
}

/** Idioma corrente do processo (usado por helpers sem acesso ao store). */
let runtimeLanguage: Language = DEFAULT_LANGUAGE
export function setRuntimeLanguage(language: Language | undefined): void {
  runtimeLanguage = language ?? DEFAULT_LANGUAGE
}
export function getRuntimeLanguage(): Language {
  return runtimeLanguage
}

type Dict = Record<string, string>

const pt: Dict = {
  // ---------------- menu lateral ----------------
  'sidebar.home': 'Início',
  'sidebar.live': 'Canais',
  'sidebar.movies': 'Filmes',
  'sidebar.series': 'Séries',
  'sidebar.settings': 'Ajustes',
  'sidebar.hintNav': '↑↓ navegar · Enter abrir',
  'sidebar.hintBack': '← voltar ao menu',

  // ---------------- topo ----------------
  'top.title.home': 'Início',
  'top.title.live': 'Canais ao Vivo',
  'top.title.movies': 'Filmes',
  'top.title.series': 'Séries',
  'top.title.settings': 'Configurações',
  'top.channelsLoaded': '{count} canais carregados',
  'top.searchHint': 'Digite para buscar…',
  'top.searchClear': 'Limpar busca',
  'top.epgOn': 'EPG ativo',
  'top.epgOff': 'Sem EPG',
  'top.epgOnTitle': 'Guia de programação ativo',
  'top.epgOffTitle': 'Sem EPG carregado',

  // ---------------- geral ----------------
  'app.loading': 'Carregando suas listas…',
  'kind.live': 'Ao vivo',
  'kind.movie': 'Filme',
  'kind.series': 'Série',
  'empty.hint': 'Navegue com as setas do teclado ou use o mouse · Enter para abrir · Esc para voltar',
  'category.all': 'Todos',
  'category.selected': 'selecionado',

  // ---------------- início ----------------
  'home.welcome': 'Bem-vindo ao MMZ IPTV PLAYER',
  'home.welcomeDesc':
    'Adicione sua primeira lista M3U/M3U8 (e, opcionalmente, um guia de programação XMLTV) em Configurações. Depois disso, tudo funciona offline pelo cache local.',
  'home.addPlaylist': 'Adicionar lista M3U',
  'home.featured': 'Em destaque',
  'home.featuredName': 'Canal em destaque',
  'home.noSynopsis': 'Sem sinopse disponível.',
  'home.watchNow': 'Assistir agora',
  'home.seeAll': 'Ver todos',
  'home.emptyLive': 'Nenhum canal ao vivo disponível. Adicione listas em Configurações.',

  // ---------------- telas de conteúdo ----------------
  'content.emptyMovies': 'Nenhum filme encontrado',
  'content.emptySeries': 'Nenhuma série encontrada',
  'content.emptyLive': 'Nenhum canal encontrado',
  'content.emptyDescLive':
    'Esta seção é preenchida automaticamente a partir dos grupos (group-title) das suas listas M3U. Adicione uma lista em Configurações para começar.',
  'content.emptyDescVod':
    'Aqui só aparece conteúdo identificado como filme/série. Se a sua lista não tiver VOD, a aba fica vazia — a preferência em Ajustes → Preferências pode liberar canais lineares desses grupos.',
  'content.goSettings': 'Ir para Configurações',
  'content.noResults': 'Nenhum resultado para “{query}”. Pressione Esc para limpar a busca.',

  // ---------------- player ----------------
  'player.loading': 'Carregando “{name}”…',
  'player.errorTitle': 'Sinal indisponível',
  'player.errorDesc':
    'Não foi possível reproduzir “{name}”. O stream pode estar fora do ar ou sua conexão instável.',
  'player.retrying': 'Tentando reconectar automaticamente… (tentativa {attempts} de {max})',
  'player.retry': 'Tentar novamente',
  'player.back': 'Voltar',
  'player.channelNumber': 'Canal {number} · {group}',
  'player.upNext': 'A seguir',
  'player.noGuide':
    'Sem guia de programação para este canal. Carregue um EPG em Configurações.',
  'player.hintZap': '↑ ↓ trocar de canal',
  'player.hintSeek': '← → avançar / voltar',
  'player.hintKeys': 'G guia · I info · M mudo',
  'player.hintChannel': 'trocar canal',
  'player.hintSpace': 'Espaço play/pause',
  'player.hintGuide': 'G guia',
  'player.hintExit': 'Esc sair',
  'player.btnPlayPause': 'Reproduzir/Pausar (Espaço)',
  'player.btnRestart': 'Reiniciar stream',
  'player.btnMute': 'Mudo (M)',
  'player.btnInfo': 'Informações (I)',
  'player.btnGuide': 'Guia EPG (G)',
  'player.btnFullscreen': 'Tela cheia (F)',
  'player.btnClose': 'Fechar (Esc)',
  'player.volume': 'Volume',

  // ---------------- guia EPG ----------------
  'guide.title': 'Guia de programação',
  'guide.emptyTitle': 'Sem programação disponível',
  'guide.emptyDescA': 'Este canal não possui',
  'guide.emptyDescB':
    'na lista ou não há EPG correspondente. Carregue um XMLTV em Configurações.',
  'guide.footer': '↑ ↓ navegar · G ou Esc fechar · {clock}',

  // ---------------- configurações ----------------
  'settings.listTitle': 'Listas M3U',
  'settings.listDesc':
    'Adicione qualquer URL que sirva uma lista M3U/M3U8 — com ou sem extensão (ex.: pastebin raw, Google Drive, servidor local). O app faz o parse automático (canal, logo, grupo e stream) e guarda um cache local para funcionar offline.',
  'settings.fieldListName': 'Nome da lista',
  'settings.fieldListNamePh': 'Ex.: Minha TV',
  'settings.fieldListUrl': 'URL da lista (M3U/M3U8)',
  'settings.fieldListUrlPh': 'https://exemplo.com/playlist.m3u ou https://pastebin.com/raw/abc123',
  'settings.addList': 'Adicionar lista',
  'settings.adding': 'Adicionando…',
  'settings.pickFile': 'Selecionar arquivo local',
  'settings.noLists': 'Nenhuma lista adicionada ainda.',
  'settings.channelsCount': '{count} canais',
  'settings.srcLocal': 'arquivo local',
  'settings.srcRemote': 'URL remota',
  'settings.updatedAt': 'atualizada em {date}',
  'settings.refresh': 'Atualizar',
  'settings.remove': 'Remover',
  'settings.refreshTitle': 'Atualizar lista',
  'settings.epgTitle': 'Guia de programação (EPG)',
  'settings.epgDescA':
    'Carregue um arquivo XMLTV (URL ou arquivo local). Os programas são cruzados com os canais pelo',
  'settings.fieldEpgName': 'Nome da fonte',
  'settings.fieldEpgNamePh': 'Ex.: EPG Brasil',
  'settings.fieldEpgUrl': 'URL do XMLTV',
  'settings.fieldEpgUrlPh': 'https://exemplo.com/epg.xml.gz',
  'settings.loadEpg': 'Carregar EPG',
  'settings.loadingEpg': 'Carregando EPG…',
  'settings.clearEpg': 'Limpar EPG',
  'settings.status': 'Status:',
  'settings.statusLoaded': 'carregado',
  'settings.statusNotLoaded': 'não carregado',
  'settings.epgChannels': '{count} canais no guia',
  'settings.epgPrograms': '{count} programas',
  'settings.epgUpdated': 'Atualizado em {date}',
  'settings.prefs': 'Preferências',
  'settings.autoRefresh': 'Atualizar listas automaticamente ao abrir o app',
  'settings.language': 'Idioma do app',
  'settings.vodLinearLabel':
    'Exibir também canais lineares cujo grupo indica filme/série',
  'settings.vodLinearHint':
    'Por padrão as abas Filmes e Séries mostram apenas conteúdo sob demanda (VOD). Ative para incluir canais ao vivo agrupados em categorias de filme/série (ex.: grupos “Filmes e Séries” com streams .m3u8).',
  'settings.about': 'Sobre',
  'settings.aboutDesc':
    'Player de IPTV para Windows e Linux. As listas e o EPG ficam salvos no diretório de dados do usuário (userData), permitindo uso offline após o primeiro carregamento.',
  'settings.aboutKeys':
    'Atalhos: setas para navegar · Enter para abrir · Esc para voltar · ↑ ↓ trocar de canal no player · G para o guia · F para tela cheia.',
  'settings.errListUrl': 'Informe a URL (ou caminho) da lista M3U.',
  'settings.errEpgUrl': 'Informe a URL (ou caminho) do arquivo XMLTV.',
  'settings.filterPlaylist': 'Listas M3U',
  'settings.filterEpg': 'Guia XMLTV',
  'settings.filterAll': 'Todos os arquivos',

  // ---------------- avisos (store) ----------------
  'toast.playlistAdded': 'Lista “{name}” adicionada com {count} canais.',
  'toast.playlistRemoved': 'Lista removida.',
  'toast.playlistUpdated': 'Lista “{name}” atualizada ({count} canais).',
  'toast.epgLoaded': 'EPG carregado: {channels} canais e {programs} programas.',
  'toast.epgCleared': 'Guia de programação (EPG) limpo.',
  'toast.addFailed': 'Falha desconhecida ao adicionar a lista.',
  'toast.epgFailed': 'Falha ao carregar o EPG.',

  // ---------------- tempo ----------------
  'time.ending': 'Encerrando',
  'time.minLeft': '{minutes} min restantes',
  'time.hoursLeft': '{time} restantes',

  // ---------------- erros (processo principal) ----------------
  'err.fileNotFound': 'Arquivo não encontrado: {path}',
  'err.httpStatus': 'O servidor respondeu {status} {statusText}',
  'err.timeout': 'Tempo esgotado ao baixar o arquivo (timeout). Tente novamente.',
  'err.connect': 'Não foi possível conectar ao servidor. Verifique a URL e sua conexão.',
  'err.download': 'Falha desconhecida ao baixar o arquivo.',
  'err.badSource':
    'Endereço não reconhecido. Use uma URL começando com http:// ou https://, ou informe o caminho de um arquivo local.',
  'err.notM3u':
    'A URL respondeu, mas o conteúdo não parece uma lista M3U/M3U8 (começa com “{preview}”). Use o endereço direto (raw) da lista.',
  'err.noChannels':
    'Nenhum canal encontrado. Confirme se a URL aponta para uma lista M3U/M3U8 válida.',
  'err.playlistNotFound': 'Lista não encontrada.',
  'err.refreshNoChannels':
    'A lista atualizada não contém canais. Mantendo a versão anterior.',
  'err.invalidXml': 'Arquivo XML inválido: tag <tv> não encontrada.',
  'err.noPrograms':
    'O XMLTV foi lido, mas nenhum programa foi encontrado. Verifique o arquivo/URL.',
  'err.untitled': 'Sem título',
  'parser.noName': 'Sem nome'
}

const en: Dict = {
  'sidebar.home': 'Home',
  'sidebar.live': 'Channels',
  'sidebar.movies': 'Movies',
  'sidebar.series': 'Series',
  'sidebar.settings': 'Settings',
  'sidebar.hintNav': '↑↓ navigate · Enter open',
  'sidebar.hintBack': '← back to menu',

  'top.title.home': 'Home',
  'top.title.live': 'Live Channels',
  'top.title.movies': 'Movies',
  'top.title.series': 'Series',
  'top.title.settings': 'Settings',
  'top.channelsLoaded': '{count} channels loaded',
  'top.searchHint': 'Type to search…',
  'top.searchClear': 'Clear search',
  'top.epgOn': 'EPG active',
  'top.epgOff': 'No EPG',
  'top.epgOnTitle': 'TV guide active',
  'top.epgOffTitle': 'No EPG loaded',

  'app.loading': 'Loading your lists…',
  'kind.live': 'Live',
  'kind.movie': 'Movie',
  'kind.series': 'Series',
  'empty.hint': 'Navigate with arrow keys or use the mouse · Enter to open · Esc to go back',
  'category.all': 'All',
  'category.selected': 'selected',

  'home.welcome': 'Welcome to MMZ IPTV PLAYER',
  'home.welcomeDesc':
    'Add your first M3U/M3U8 list (and, optionally, an XMLTV TV guide) in Settings. After that, everything works offline from the local cache.',
  'home.addPlaylist': 'Add M3U list',
  'home.featured': 'Featured',
  'home.featuredName': 'Featured channel',
  'home.noSynopsis': 'No synopsis available.',
  'home.watchNow': 'Watch now',
  'home.seeAll': 'See all',
  'home.emptyLive': 'No live channels available. Add lists in Settings.',

  'content.emptyMovies': 'No movies found',
  'content.emptySeries': 'No series found',
  'content.emptyLive': 'No channels found',
  'content.emptyDescLive':
    'This section is filled automatically from the groups (group-title) of your M3U lists. Add a list in Settings to get started.',
  'content.emptyDescVod':
    'Only items identified as movies/series show up here. If your list has no VOD, this tab stays empty — the preference in Settings → Preferences can include linear channels from those groups.',
  'content.goSettings': 'Go to Settings',
  'content.noResults': 'No results for “{query}”. Press Esc to clear the search.',

  'player.loading': 'Loading “{name}”…',
  'player.errorTitle': 'Signal unavailable',
  'player.errorDesc':
    'Could not play “{name}”. The stream may be offline or your connection unstable.',
  'player.retrying': 'Trying to reconnect automatically… (attempt {attempts} of {max})',
  'player.retry': 'Try again',
  'player.back': 'Back',
  'player.channelNumber': 'Channel {number} · {group}',
  'player.upNext': 'Up next',
  'player.noGuide': 'No TV guide for this channel. Load an EPG in Settings.',
  'player.hintZap': '↑ ↓ change channel',
  'player.hintSeek': '← → forward / back',
  'player.hintKeys': 'G guide · I info · M mute',
  'player.hintChannel': 'change channel',
  'player.hintSpace': 'Space play/pause',
  'player.hintGuide': 'G guide',
  'player.hintExit': 'Esc exit',
  'player.btnPlayPause': 'Play/Pause (Space)',
  'player.btnRestart': 'Restart stream',
  'player.btnMute': 'Mute (M)',
  'player.btnInfo': 'Info (I)',
  'player.btnGuide': 'EPG guide (G)',
  'player.btnFullscreen': 'Fullscreen (F)',
  'player.btnClose': 'Close (Esc)',
  'player.volume': 'Volume',

  'guide.title': 'TV guide',
  'guide.emptyTitle': 'No schedule available',
  'guide.emptyDescA': 'This channel has no',
  'guide.emptyDescB':
    'in the list or there is no matching EPG. Load an XMLTV file in Settings.',
  'guide.footer': '↑ ↓ navigate · G or Esc to close · {clock}',

  'settings.listTitle': 'M3U lists',
  'settings.listDesc':
    'Add any URL that serves an M3U/M3U8 list — with or without an extension (e.g. pastebin raw, Google Drive, local server). The app parses it automatically (name, logo, group and stream) and keeps a local cache to work offline.',
  'settings.fieldListName': 'List name',
  'settings.fieldListNamePh': 'e.g. My TV',
  'settings.fieldListUrl': 'List URL (M3U/M3U8)',
  'settings.fieldListUrlPh': 'https://example.com/playlist.m3u or https://pastebin.com/raw/abc123',
  'settings.addList': 'Add list',
  'settings.adding': 'Adding…',
  'settings.pickFile': 'Pick local file',
  'settings.noLists': 'No list added yet.',
  'settings.channelsCount': '{count} channels',
  'settings.srcLocal': 'local file',
  'settings.srcRemote': 'remote URL',
  'settings.updatedAt': 'updated on {date}',
  'settings.refresh': 'Refresh',
  'settings.remove': 'Remove',
  'settings.refreshTitle': 'Refresh list',
  'settings.epgTitle': 'TV guide (EPG)',
  'settings.epgDescA':
    'Load an XMLTV file (URL or local file). Programs are matched to channels by the',
  'settings.fieldEpgName': 'Source name',
  'settings.fieldEpgNamePh': 'e.g. EPG Brazil',
  'settings.fieldEpgUrl': 'XMLTV URL',
  'settings.fieldEpgUrlPh': 'https://example.com/epg.xml.gz',
  'settings.loadEpg': 'Load EPG',
  'settings.loadingEpg': 'Loading EPG…',
  'settings.clearEpg': 'Clear EPG',
  'settings.status': 'Status:',
  'settings.statusLoaded': 'loaded',
  'settings.statusNotLoaded': 'not loaded',
  'settings.epgChannels': '{count} channels in guide',
  'settings.epgPrograms': '{count} programs',
  'settings.epgUpdated': 'Updated on {date}',
  'settings.prefs': 'Preferences',
  'settings.autoRefresh': 'Refresh lists automatically when the app opens',
  'settings.language': 'App language',
  'settings.vodLinearLabel': 'Also show linear channels grouped as movies/series',
  'settings.vodLinearHint':
    'By default the Movies and Series tabs only show on-demand content (VOD). Turn this on to include live channels grouped under movie/series categories (e.g. “Movies and Series” groups with .m3u8 streams).',
  'settings.about': 'About',
  'settings.aboutDesc':
    'IPTV player for Windows and Linux. Lists and EPG are stored in the user data directory (userData), allowing offline use after the first load.',
  'settings.aboutKeys':
    'Shortcuts: arrow keys to navigate · Enter to open · Esc to go back · ↑ ↓ to change channel in the player · G for the guide · F for fullscreen.',
  'settings.errListUrl': 'Enter the URL (or path) of the M3U list.',
  'settings.errEpgUrl': 'Enter the URL (or path) of the XMLTV file.',
  'settings.filterPlaylist': 'M3U lists',
  'settings.filterEpg': 'XMLTV guide',
  'settings.filterAll': 'All files',

  'toast.playlistAdded': 'List “{name}” added with {count} channels.',
  'toast.playlistRemoved': 'List removed.',
  'toast.playlistUpdated': 'List “{name}” refreshed ({count} channels).',
  'toast.epgLoaded': 'EPG loaded: {channels} channels and {programs} programs.',
  'toast.epgCleared': 'TV guide (EPG) cleared.',
  'toast.addFailed': 'Unknown failure while adding the list.',
  'toast.epgFailed': 'Failed to load the EPG.',

  'time.ending': 'Ending now',
  'time.minLeft': '{minutes} min left',
  'time.hoursLeft': '{time} left',

  'err.fileNotFound': 'File not found: {path}',
  'err.httpStatus': 'The server responded {status} {statusText}',
  'err.timeout': 'Timed out while downloading the file. Please try again.',
  'err.connect': 'Could not connect to the server. Check the URL and your connection.',
  'err.download': 'Unknown error while downloading the file.',
  'err.badSource':
    'Unrecognized address. Use a URL starting with http:// or https://, or the path of a local file.',
  'err.notM3u':
    'The URL responded, but the content does not look like an M3U/M3U8 list (starts with “{preview}”). Use the direct (raw) address of the list.',
  'err.noChannels':
    'No channels found. Make sure the URL points to a valid M3U/M3U8 list.',
  'err.playlistNotFound': 'List not found.',
  'err.refreshNoChannels': 'The refreshed list has no channels. Keeping the previous version.',
  'err.invalidXml': 'Invalid XML file: <tv> tag not found.',
  'err.noPrograms': 'The XMLTV was read but no programs were found. Check the file/URL.',
  'err.untitled': 'Untitled',
  'parser.noName': 'Unnamed'
}

const es: Dict = {
  'sidebar.home': 'Inicio',
  'sidebar.live': 'Canales',
  'sidebar.movies': 'Películas',
  'sidebar.series': 'Series',
  'sidebar.settings': 'Ajustes',
  'sidebar.hintNav': '↑↓ navegar · Enter abrir',
  'sidebar.hintBack': '← volver al menú',

  'top.title.home': 'Inicio',
  'top.title.live': 'Canales en vivo',
  'top.title.movies': 'Películas',
  'top.title.series': 'Series',
  'top.title.settings': 'Configuración',
  'top.channelsLoaded': '{count} canales cargados',
  'top.searchHint': 'Escribe para buscar…',
  'top.searchClear': 'Limpiar búsqueda',
  'top.epgOn': 'EPG activo',
  'top.epgOff': 'Sin EPG',
  'top.epgOnTitle': 'Guía de programación activa',
  'top.epgOffTitle': 'Sin EPG cargado',

  'app.loading': 'Cargando tus listas…',
  'kind.live': 'En vivo',
  'kind.movie': 'Película',
  'kind.series': 'Serie',
  'empty.hint': 'Navega con las flechas o usa el ratón · Enter para abrir · Esc para volver',
  'category.all': 'Todos',
  'category.selected': 'seleccionado',

  'home.welcome': 'Bienvenido a MMZ IPTV PLAYER',
  'home.welcomeDesc':
    'Añade tu primera lista M3U/M3U8 (y, opcionalmente, una guía XMLTV) en Configuración. Después, todo funciona sin conexión gracias a la caché local.',
  'home.addPlaylist': 'Añadir lista M3U',
  'home.featured': 'Destacado',
  'home.featuredName': 'Canal destacado',
  'home.noSynopsis': 'Sin sinopsis disponible.',
  'home.watchNow': 'Ver ahora',
  'home.seeAll': 'Ver todo',
  'home.emptyLive': 'No hay canales en vivo. Añade listas en Configuración.',

  'content.emptyMovies': 'No se encontraron películas',
  'content.emptySeries': 'No se encontraron series',
  'content.emptyLive': 'No se encontraron canales',
  'content.emptyDescLive':
    'Esta sección se completa automáticamente con los grupos (group-title) de tus listas M3U. Añade una lista en Configuración para empezar.',
  'content.emptyDescVod':
    'Aquí solo aparece contenido identificado como película/serie. Si tu lista no tiene VOD, la pestaña queda vacía — la preferencia en Configuración → Preferencias puede incluir canales lineales de esos grupos.',
  'content.goSettings': 'Ir a Configuración',
  'content.noResults': 'Sin resultados para “{query}”. Pulsa Esc para limpiar la búsqueda.',

  'player.loading': 'Cargando “{name}”…',
  'player.errorTitle': 'Señal no disponible',
  'player.errorDesc':
    'No se pudo reproducir “{name}”. El stream puede estar caído o tu conexión inestable.',
  'player.retrying': 'Intentando reconectar automáticamente… (intento {attempts} de {max})',
  'player.retry': 'Intentar de nuevo',
  'player.back': 'Volver',
  'player.channelNumber': 'Canal {number} · {group}',
  'player.upNext': 'A continuación',
  'player.noGuide': 'Sin guía para este canal. Carga un EPG en Configuración.',
  'player.hintZap': '↑ ↓ cambiar de canal',
  'player.hintSeek': '← → adelantar / retroceder',
  'player.hintKeys': 'G guía · I info · M silencio',
  'player.hintChannel': 'cambiar canal',
  'player.hintSpace': 'Espacio play/pausa',
  'player.hintGuide': 'G guía',
  'player.hintExit': 'Esc salir',
  'player.btnPlayPause': 'Reproducir/Pausa (Espacio)',
  'player.btnRestart': 'Reiniciar stream',
  'player.btnMute': 'Silencio (M)',
  'player.btnInfo': 'Información (I)',
  'player.btnGuide': 'Guía EPG (G)',
  'player.btnFullscreen': 'Pantalla completa (F)',
  'player.btnClose': 'Cerrar (Esc)',
  'player.volume': 'Volumen',

  'guide.title': 'Guía de programación',
  'guide.emptyTitle': 'Sin programación disponible',
  'guide.emptyDescA': 'Este canal no tiene',
  'guide.emptyDescB':
    'en la lista o no hay EPG correspondiente. Carga un XMLTV en Configuración.',
  'guide.footer': '↑ ↓ navegar · G o Esc cerrar · {clock}',

  'settings.listTitle': 'Listas M3U',
  'settings.listDesc':
    'Añade cualquier URL que sirva una lista M3U/M3U8 — con o sin extensión (ej.: pastebin raw, Google Drive, servidor local). La app analiza el contenido automáticamente (canal, logo, grupo y stream) y guarda una caché local para funcionar sin conexión.',
  'settings.fieldListName': 'Nombre de la lista',
  'settings.fieldListNamePh': 'Ej.: Mi TV',
  'settings.fieldListUrl': 'URL de la lista (M3U/M3U8)',
  'settings.fieldListUrlPh': 'https://ejemplo.com/playlist.m3u o https://pastebin.com/raw/abc123',
  'settings.addList': 'Añadir lista',
  'settings.adding': 'Añadiendo…',
  'settings.pickFile': 'Seleccionar archivo local',
  'settings.noLists': 'Aún no hay listas añadidas.',
  'settings.channelsCount': '{count} canales',
  'settings.srcLocal': 'archivo local',
  'settings.srcRemote': 'URL remota',
  'settings.updatedAt': 'actualizada el {date}',
  'settings.refresh': 'Actualizar',
  'settings.remove': 'Quitar',
  'settings.refreshTitle': 'Actualizar lista',
  'settings.epgTitle': 'Guía de programación (EPG)',
  'settings.epgDescA':
    'Carga un archivo XMLTV (URL o archivo local). Los programas se cruzan con los canales por el',
  'settings.fieldEpgName': 'Nombre de la fuente',
  'settings.fieldEpgNamePh': 'Ej.: EPG Brasil',
  'settings.fieldEpgUrl': 'URL del XMLTV',
  'settings.fieldEpgUrlPh': 'https://ejemplo.com/epg.xml.gz',
  'settings.loadEpg': 'Cargar EPG',
  'settings.loadingEpg': 'Cargando EPG…',
  'settings.clearEpg': 'Limpiar EPG',
  'settings.status': 'Estado:',
  'settings.statusLoaded': 'cargado',
  'settings.statusNotLoaded': 'no cargado',
  'settings.epgChannels': '{count} canales en la guía',
  'settings.epgPrograms': '{count} programas',
  'settings.epgUpdated': 'Actualizado el {date}',
  'settings.prefs': 'Preferencias',
  'settings.autoRefresh': 'Actualizar listas automáticamente al abrir la app',
  'settings.language': 'Idioma de la app',
  'settings.vodLinearLabel': 'Mostrar también canales lineales de grupos de películas/series',
  'settings.vodLinearHint':
    'Por defecto, las pestañas Películas y Series solo muestran contenido bajo demanda (VOD). Actívalo para incluir canales en vivo agrupados en categorías de películas/series (ej.: grupos “Películas y Series” con streams .m3u8).',
  'settings.about': 'Acerca de',
  'settings.aboutDesc':
    'Reproductor IPTV para Windows y Linux. Las listas y el EPG se guardan en el directorio de datos del usuario (userData), permitiendo uso sin conexión tras la primera carga.',
  'settings.aboutKeys':
    'Atajos: flechas para navegar · Enter para abrir · Esc para volver · ↑ ↓ cambiar de canal en el reproductor · G para la guía · F para pantalla completa.',
  'settings.errListUrl': 'Indica la URL (o ruta) de la lista M3U.',
  'settings.errEpgUrl': 'Indica la URL (o ruta) del archivo XMLTV.',
  'settings.filterPlaylist': 'Listas M3U',
  'settings.filterEpg': 'Guía XMLTV',
  'settings.filterAll': 'Todos los archivos',

  'toast.playlistAdded': 'Lista “{name}” añadida con {count} canales.',
  'toast.playlistRemoved': 'Lista eliminada.',
  'toast.playlistUpdated': 'Lista “{name}” actualizada ({count} canales).',
  'toast.epgLoaded': 'EPG cargado: {channels} canales y {programs} programas.',
  'toast.epgCleared': 'Guía de programación (EPG) limpiada.',
  'toast.addFailed': 'Fallo desconocido al añadir la lista.',
  'toast.epgFailed': 'No se pudo cargar el EPG.',

  'time.ending': 'Terminando',
  'time.minLeft': 'quedan {minutes} min',
  'time.hoursLeft': 'quedan {time}',

  'err.fileNotFound': 'Archivo no encontrado: {path}',
  'err.httpStatus': 'El servidor respondió {status} {statusText}',
  'err.timeout': 'Tiempo de espera agotado al descargar el archivo. Inténtalo de nuevo.',
  'err.connect': 'No se pudo conectar con el servidor. Revisa la URL y tu conexión.',
  'err.download': 'Fallo desconocido al descargar el archivo.',
  'err.badSource':
    'Dirección no reconocida. Usa una URL que empiece con http:// o https://, o indica la ruta de un archivo local.',
  'err.notM3u':
    'La URL respondió, pero el contenido no parece una lista M3U/M3U8 (empieza con “{preview}”). Usa la dirección directa (raw) de la lista.',
  'err.noChannels':
    'No se encontraron canales. Confirma que la URL apunte a una lista M3U/M3U8 válida.',
  'err.playlistNotFound': 'Lista no encontrada.',
  'err.refreshNoChannels':
    'La lista actualizada no contiene canales. Se mantiene la versión anterior.',
  'err.invalidXml': 'Archivo XML inválido: no se encontró la etiqueta <tv>.',
  'err.noPrograms':
    'Se leyó el XMLTV pero no se encontraron programas. Revisa el archivo/URL.',
  'err.untitled': 'Sin título',
  'parser.noName': 'Sin nombre'
}

const DICTS: Record<Language, Dict> = { pt, en, es }

export type TranslateVars = Record<string, string | number>

/** Traduz `key` usando o idioma informado (com fallback para PT e depois para a própria chave). */
export function translate(
  language: Language | undefined,
  key: string,
  vars?: TranslateVars
): string {
  const dict = DICTS[language ?? DEFAULT_LANGUAGE] ?? pt
  let text = dict[key] ?? pt[key] ?? key
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value))
    }
  }
  return text
}

/** Traduz usando o idioma corrente do processo. */
export function t(key: string, vars?: TranslateVars): string {
  return translate(runtimeLanguage, key, vars)
}

/** Chaves presentes em todos os idiomas (usado pelos testes de sanidade). */
export function missingKeys(): string[] {
  const base = Object.keys(pt)
  const out: string[] = []
  for (const [lang, dict] of Object.entries(DICTS) as [Language, Dict][]) {
    for (const key of base) {
      if (!dict[key]) out.push(`${lang}:${key}`)
    }
    for (const key of Object.keys(dict)) {
      if (!base.includes(key)) out.push(`${lang}:extra:${key}`)
    }
  }
  return out
}
