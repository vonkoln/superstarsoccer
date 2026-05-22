/**
 * ONDE PASSA O JOGO? — Bot Google Apps Script
 * ------------------------------------------------
 * Este script deve ser colado em Extensões > Apps Script
 * dentro de uma Google Sheets.
 *
 * Funções principais:
 * - setupPlanilha(): cria abas e cabeçalhos.
 * - salvarChaveBrave(): salva a chave da Brave Search API nas propriedades do script.
 * - atualizarTransmissoes(): busca web e atualiza a aba Transmissoes.
 * - doGet(): publica a planilha em formato JSON para o site consumir.
 * - criarGatilhoDiario(): agenda atualização automática diária.
 */

const SHEETS = {
  JOGOS: 'Jogos',
  TRANSMISSOES: 'Transmissoes',
  CANAIS: 'Canais',
  LOG: 'Log'
};

const HEADERS = {
  JOGOS: [
    'id',
    'date',
    'time',
    'league',
    'home',
    'away',
    'stadium',
    'status',
    'region',
    'active'
  ],
  TRANSMISSOES: [
    'gameId',
    'type',
    'name',
    'details',
    'url',
    'sourceTitle',
    'sourceUrl',
    'confidence',
    'reviewStatus',
    'updatedAt'
  ],
  CANAIS: [
    'type',
    'name',
    'aliases',
    'detailsDefault'
  ],
  LOG: [
    'dataHora',
    'acao',
    'detalhes'
  ]
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Onde Passa o Jogo')
    .addItem('1. Configurar planilha', 'setupPlanilha')
    .addItem('2. Salvar chave Brave API', 'salvarChaveBrave')
    .addItem('3. Atualizar transmissões agora', 'atualizarTransmissoes')
    .addItem('4. Criar gatilho diário', 'criarGatilhoDiario')
    .addItem('5. Mostrar URL do JSON', 'mostrarUrlJson')
    .addToUi();
}

function setupPlanilha() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheet(ss, SHEETS.JOGOS, HEADERS.JOGOS);
  ensureSheet(ss, SHEETS.TRANSMISSOES, HEADERS.TRANSMISSOES);
  ensureSheet(ss, SHEETS.CANAIS, HEADERS.CANAIS);
  ensureSheet(ss, SHEETS.LOG, HEADERS.LOG);

  seedJogos();
  seedCanais();

  logAcao('setupPlanilha', 'Planilha configurada com abas, cabeçalhos e exemplos.');
  SpreadsheetApp.getUi().alert('Planilha configurada com sucesso.');
}

function ensureSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeaders = firstRow.some(value => String(value || '').trim() !== '');

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
}

function seedJogos() {
  const sheet = getSheet(SHEETS.JOGOS);

  if (sheet.getLastRow() > 1) return;

  const rows = [
    [1, '2026-05-22', '19:00', 'Brasileirão Série A', 'Cruzeiro', 'Flamengo', 'Mineirão', 'Hoje', 'Brasil', true],
    [2, '2026-05-22', '21:30', 'Copa do Brasil', 'Corinthians', 'Grêmio', 'Neo Química Arena', 'Hoje', 'Brasil', true],
    [3, '2026-05-23', '16:00', 'Premier League', 'Manchester City', 'Liverpool', 'Etihad Stadium', 'Amanhã', 'Internacional', true]
  ];

  sheet.getRange(2, 1, rows.length, HEADERS.JOGOS.length).setValues(rows);
}

function seedCanais() {
  const sheet = getSheet(SHEETS.CANAIS);

  if (sheet.getLastRow() > 1) return;

  const rows = [
    ['TV', 'TV Globo', 'globo,tv globo,rede globo,ge tv', 'Transmissão em TV aberta, sujeita à praça local.'],
    ['TV', 'SporTV', 'sportv,sportv2,sportv 2', 'TV fechada para assinantes.'],
    ['TV', 'Premiere', 'premiere,canal premiere,pay-per-view,ppv', 'Pay-per-view para assinantes.'],
    ['TV', 'ESPN', 'espn,espn brasil', 'Canal de TV fechada.'],
    ['Streaming', 'Globoplay', 'globoplay,globoplay canais,globoplay + canais', 'Streaming mediante assinatura compatível.'],
    ['Streaming', 'Disney+', 'disney+,disney plus,star+', 'Streaming mediante assinatura.'],
    ['Streaming', 'Prime Video', 'prime video,amazon prime video', 'Streaming mediante assinatura.'],
    ['Streaming', 'Paramount+', 'paramount+,paramount plus', 'Streaming mediante assinatura.'],
    ['Streaming', 'YouTube', 'youtube,canal youtube,ao vivo no youtube', 'Transmissão online quando disponível.'],
    ['Rádio', 'Rádio Itatiaia', 'itatiaia,rádio itatiaia,radio itatiaia', 'Narração ao vivo em rádio e internet.'],
    ['Rádio', 'Rádio Gaúcha', 'gauchazh,rádio gaúcha,radio gaucha', 'Cobertura ao vivo via rádio e internet.'],
    ['Rádio', 'Rádio Bandeirantes', 'rádio bandeirantes,radio bandeirantes,bandnews', 'Cobertura esportiva ao vivo.'],
    ['Casa de aposta', 'Betano', 'betano', 'Possível transmissão em plataforma de aposta. Verificar autorização, idade mínima e disponibilidade regional.'],
    ['Casa de aposta', 'bet365', 'bet365', 'Possível transmissão em plataforma de aposta. Verificar autorização, idade mínima e disponibilidade regional.'],
    ['Casa de aposta', 'Sportingbet', 'sportingbet', 'Possível transmissão em plataforma de aposta. Verificar autorização, idade mínima e disponibilidade regional.']
  ];

  sheet.getRange(2, 1, rows.length, HEADERS.CANAIS.length).setValues(rows);
}

function salvarChaveBrave() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.prompt(
    'Chave Brave Search API',
    'Cole sua chave da Brave Search API. Ela será salva em PropertiesService, não na planilha.',
    ui.ButtonSet.OK_CANCEL
  );

  if (result.getSelectedButton() !== ui.Button.OK) return;

  const key = result.getResponseText().trim();

  if (!key) {
    ui.alert('Nenhuma chave informada.');
    return;
  }

  PropertiesService.getScriptProperties().setProperty('BRAVE_API_KEY', key);
  logAcao('salvarChaveBrave', 'Chave Brave API salva em Script Properties.');
  ui.alert('Chave salva com sucesso.');
}

function atualizarTransmissoes() {
  setupSemAlertas();

  const jogos = getJogosAtivos();
  const canais = getCanais();
  const output = [];
  const agora = new Date().toISOString();

  jogos.forEach((jogo, index) => {
    const query = montarQuery(jogo);
    const resultados = buscarBrave(query);
    const encontrados = detectarCanais(resultados, canais);

    encontrados.forEach(item => {
      output.push([
        jogo.id,
        item.type,
        item.name,
        item.details,
        item.url,
        item.sourceTitle,
        item.sourceUrl,
        item.confidence,
        item.reviewStatus,
        agora
      ]);
    });

    logAcao(
      'atualizarTransmissoes',
      `${jogo.home} x ${jogo.away}: ${encontrados.length} transmissão(ões) detectada(s).`
    );

    // Pequena pausa para respeitar limites da API e evitar chamadas muito agressivas.
    if (index < jogos.length - 1) {
      Utilities.sleep(1200);
    }
  });

  const sheet = getSheet(SHEETS.TRANSMISSOES);
  clearDataRows(sheet, HEADERS.TRANSMISSOES.length);

  if (output.length) {
    sheet.getRange(2, 1, output.length, HEADERS.TRANSMISSOES.length).setValues(output);
  }

  sheet.autoResizeColumns(1, HEADERS.TRANSMISSOES.length);
  logAcao('atualizarTransmissoes', `Atualização concluída. Linhas geradas: ${output.length}.`);
}

function setupSemAlertas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheet(ss, SHEETS.JOGOS, HEADERS.JOGOS);
  ensureSheet(ss, SHEETS.TRANSMISSOES, HEADERS.TRANSMISSOES);
  ensureSheet(ss, SHEETS.CANAIS, HEADERS.CANAIS);
  ensureSheet(ss, SHEETS.LOG, HEADERS.LOG);
}

function montarQuery(jogo) {
  return [
    `"${jogo.home}"`,
    `"${jogo.away}"`,
    jogo.league,
    'onde assistir',
    'transmissão',
    'TV',
    'streaming',
    'rádio'
  ].join(' ');
}

function buscarBrave(query) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('BRAVE_API_KEY');

  if (!apiKey) {
    throw new Error('BRAVE_API_KEY não configurada. Use o menu "Salvar chave Brave API".');
  }

  const params = {
    q: query,
    country: 'BR',
    search_lang: 'pt-br',
    count: '8',
    safesearch: 'moderate'
  };

  const url = 'https://api.search.brave.com/res/v1/web/search?' + toQueryString(params);

  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': apiKey
    }
  });

  const status = response.getResponseCode();
  const text = response.getContentText();

  if (status < 200 || status >= 300) {
    logAcao('buscarBrave.erro', `HTTP ${status}: ${text.slice(0, 300)}`);
    return [];
  }

  const json = JSON.parse(text);
  return (json.web && json.web.results) ? json.web.results : [];
}

function detectarCanais(resultados, canais) {
  const encontradosPorNome = {};

  resultados.forEach(result => {
    const title = String(result.title || '');
    const description = String(result.description || '');
    const url = String(result.url || '');
    const texto = normalizar(`${title} ${description} ${url}`);

    canais.forEach(canal => {
      const aliases = canal.aliases
        .split(',')
        .map(alias => normalizar(alias.trim()))
        .filter(Boolean);

      const achou = aliases.some(alias => texto.includes(alias));

      if (!achou) return;

      const chave = `${canal.type}__${canal.name}`;

      if (!encontradosPorNome[chave]) {
        encontradosPorNome[chave] = {
          type: canal.type,
          name: canal.name,
          details: canal.detailsDefault,
          url: url,
          sourceTitle: title,
          sourceUrl: url,
          confidence: 55,
          reviewStatus: 'revisar'
        };
      }

      const atual = encontradosPorNome[chave];
      atual.confidence = Math.min(95, atual.confidence + 10);

      if (normalizar(title).includes(normalizar(canal.name))) {
        atual.confidence = Math.min(98, atual.confidence + 10);
      }

      if (atual.confidence >= 75) {
        atual.reviewStatus = 'provavel';
      }
    });
  });

  return Object.values(encontradosPorNome).sort((a, b) => b.confidence - a.confidence);
}

function getJogosAtivos() {
  const rows = sheetToObjects(getSheet(SHEETS.JOGOS));

  return rows
    .filter(row => String(row.active).toLowerCase() !== 'false')
    .map(row => ({
      id: Number(row.id),
      date: String(row.date),
      time: String(row.time),
      league: String(row.league),
      home: String(row.home),
      away: String(row.away),
      stadium: String(row.stadium),
      status: String(row.status),
      region: String(row.region)
    }));
}

function getCanais() {
  return sheetToObjects(getSheet(SHEETS.CANAIS))
    .filter(row => row.name && row.aliases)
    .map(row => ({
      type: String(row.type),
      name: String(row.name),
      aliases: String(row.aliases),
      detailsDefault: String(row.detailsDefault || '')
    }));
}

function montarDadosJson() {
  const jogos = getJogosAtivos();
  const transmissoes = sheetToObjects(getSheet(SHEETS.TRANSMISSOES));

  return jogos.map(jogo => {
    const transmissions = transmissoes
      .filter(item => Number(item.gameId) === Number(jogo.id))
      .map(item => ({
        type: String(item.type || ''),
        name: String(item.name || ''),
        details: String(item.details || ''),
        url: String(item.url || ''),
        sourceTitle: String(item.sourceTitle || ''),
        sourceUrl: String(item.sourceUrl || ''),
        confidence: Number(item.confidence || 0),
        reviewStatus: String(item.reviewStatus || 'revisar'),
        updatedAt: String(item.updatedAt || '')
      }));

    return {
      id: jogo.id,
      date: jogo.date,
      time: jogo.time,
      league: jogo.league,
      home: jogo.home,
      away: jogo.away,
      stadium: jogo.stadium,
      status: jogo.status,
      region: jogo.region,
      transmissions
    };
  });
}

function doGet(e) {
  const data = montarDadosJson();

  return ContentService
    .createTextOutput(JSON.stringify(data, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

function criarGatilhoDiario() {
  apagarGatilhosDaFuncao('atualizarTransmissoes');

  ScriptApp
    .newTrigger('atualizarTransmissoes')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  logAcao('criarGatilhoDiario', 'Gatilho diário criado para atualizarTransmissoes por volta das 08h.');
  SpreadsheetApp.getUi().alert('Gatilho diário criado. O horário pode variar um pouco por decisão do Google Apps Script.');
}

function apagarGatilhosDaFuncao(functionName) {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === functionName) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function mostrarUrlJson() {
  const ui = SpreadsheetApp.getUi();

  ui.alert(
    'URL do JSON',
    'Depois de publicar como Web App, copie a URL de implantação e use no arquivo site/script.js na constante DATA_SOURCE_URL.',
    ui.ButtonSet.OK
  );
}

function sheetToObjects(sheet) {
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) return [];

  const headers = values[0].map(header => String(header).trim());

  return values.slice(1)
    .filter(row => row.some(value => String(value || '').trim() !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
}

function getSheet(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);

  if (!sheet) {
    throw new Error(`A aba "${name}" não existe. Rode setupPlanilha().`);
  }

  return sheet;
}

function clearDataRows(sheet, numberOfColumns) {
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) return;

  sheet.getRange(2, 1, lastRow - 1, numberOfColumns).clearContent();
}

function normalizar(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toQueryString(params) {
  return Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
}

function logAcao(acao, detalhes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.LOG);

  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.LOG);
    sheet.getRange(1, 1, 1, HEADERS.LOG.length).setValues([HEADERS.LOG]);
  }

  sheet.appendRow([new Date(), acao, detalhes]);
}
