require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

const ROOT_DIR = path.resolve(__dirname, "..");

const FILES = {
  jogos: path.join(__dirname, "jogos-entrada.json"),
  canais: path.join(__dirname, "canais.json"),
  dados: path.join(ROOT_DIR, "dados.json"),
  relatorio: path.join(__dirname, "relatorio-fontes.json")
};

const CONFIG = {
  maxResults: Number(process.env.MAX_RESULTS || 6),
  fetchSourcePages: String(process.env.FETCH_SOURCE_PAGES || "true") === "true",
  maxSourcePages: Number(process.env.MAX_SOURCE_PAGES || 3),
  delayMs: Number(process.env.REQUEST_DELAY_MS || 1500)
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/122.0 Safari/537.36";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizar(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function lerJson(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function escreverJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

function montarQuery(jogo) {
  return [
    `"${jogo.home}"`,
    `"${jogo.away}"`,
    `"${jogo.league}"`,
    "onde assistir",
    "transmissão",
    "TV",
    "streaming",
    "rádio"
  ].join(" ");
}

function limparUrlDuckDuckGo(url) {
  if (!url) return "";

  try {
    if (url.includes("uddg=")) {
      const parsed = new URL(url, "https://duckduckgo.com");
      const uddg = parsed.searchParams.get("uddg");
      return uddg ? decodeURIComponent(uddg) : url;
    }

    if (url.startsWith("//")) {
      return `https:${url}`;
    }

    if (url.startsWith("/")) {
      return `https://duckduckgo.com${url}`;
    }

    return url;
  } catch {
    return url;
  }
}

async function buscarDuckDuckGo(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=br-pt`;

  const response = await axios.get(url, {
    timeout: 15000,
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
    }
  });

  const $ = cheerio.load(response.data);
  const resultados = [];

  $(".result").each((_, element) => {
    if (resultados.length >= CONFIG.maxResults) return;

    const title = $(element).find(".result__a").text().trim();
    const href = $(element).find(".result__a").attr("href");
    const snippet = $(element).find(".result__snippet").text().trim();

    if (!title || !href) return;

    resultados.push({
      title,
      url: limparUrlDuckDuckGo(href),
      snippet
    });
  });

  return resultados;
}

async function baixarTextoFonte(url) {
  try {
    const response = await axios.get(url, {
      timeout: 12000,
      maxRedirects: 3,
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
      }
    });

    const html = String(response.data || "");
    const $ = cheerio.load(html);

    $("script, style, noscript, iframe").remove();

    return $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 50000);
  } catch {
    return "";
  }
}

function detectarCanaisEmTexto(textoOriginal, fonte, canais) {
  const texto = normalizar(textoOriginal);
  const encontrados = [];

  for (const canal of canais) {
    const aliases = canal.aliases || [];

    const aliasesEncontrados = aliases.filter((alias) => {
      return texto.includes(normalizar(alias));
    });

    if (!aliasesEncontrados.length) continue;

    let confidence = 55;

    confidence += Math.min(aliasesEncontrados.length * 10, 25);

    if (normalizar(fonte.title).includes(normalizar(canal.name))) {
      confidence += 15;
    }

    if (texto.includes("onde assistir") || texto.includes("transmissao")) {
      confidence += 5;
    }

    confidence = Math.min(confidence, 98);

    encontrados.push({
      type: canal.type,
      name: canal.name,
      details: canal.detailsDefault,
      url: fonte.url,
      sourceTitle: fonte.title,
      sourceUrl: fonte.url,
      confidence,
      reviewStatus: confidence >= 80 ? "provavel" : "revisar",
      matchedAliases: aliasesEncontrados
    });
  }

  return encontrados;
}

function unirTransmissoes(transmissoes) {
  const mapa = new Map();

  for (const item of transmissoes) {
    const chave = `${item.type}__${item.name}`;

    if (!mapa.has(chave)) {
      mapa.set(chave, item);
      continue;
    }

    const atual = mapa.get(chave);

    if (item.confidence > atual.confidence) {
      mapa.set(chave, item);
    }
  }

  return Array.from(mapa.values()).sort((a, b) => b.confidence - a.confidence);
}

async function processarJogo(jogo, canais) {
  const query = montarQuery(jogo);

  console.log(`\n🔎 Buscando: ${jogo.home} x ${jogo.away}`);
  console.log(`   Query: ${query}`);

  const resultados = await buscarDuckDuckGo(query);

  const relatorio = {
    jogo: `${jogo.home} x ${jogo.away}`,
    query,
    resultados: [],
    transmissoesDetectadas: []
  };

  const transmissoesDetectadas = [];

  for (let i = 0; i < resultados.length; i++) {
    const fonte = resultados[i];

    let textoParaAnalise = `${fonte.title} ${fonte.snippet} ${fonte.url}`;

    if (CONFIG.fetchSourcePages && i < CONFIG.maxSourcePages) {
      console.log(`   Lendo fonte: ${fonte.title}`);
      const textoPagina = await baixarTextoFonte(fonte.url);

      if (textoPagina) {
        textoParaAnalise += ` ${textoPagina}`;
      }

      await sleep(CONFIG.delayMs);
    }

    const encontrados = detectarCanaisEmTexto(textoParaAnalise, fonte, canais);

    transmissoesDetectadas.push(...encontrados);

    relatorio.resultados.push({
      title: fonte.title,
      url: fonte.url,
      snippet: fonte.snippet,
      encontrados: encontrados.map((item) => ({
        type: item.type,
        name: item.name,
        confidence: item.confidence,
        reviewStatus: item.reviewStatus,
        matchedAliases: item.matchedAliases
      }))
    });
  }

  const transmissions = unirTransmissoes(transmissoesDetectadas).map((item) => ({
    type: item.type,
    name: item.name,
    details: item.details,
    url: item.url,
    sourceTitle: item.sourceTitle,
    sourceUrl: item.sourceUrl,
    confidence: item.confidence,
    reviewStatus: item.reviewStatus,
    updatedAt: new Date().toISOString()
  }));

  relatorio.transmissoesDetectadas = transmissions;

  console.log(`   ✅ Detectadas: ${transmissions.length}`);

  return {
    dados: {
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
    },
    relatorio
  };
}

async function main() {
  console.log("🚀 Iniciando bot de atualização do dados.json");

  const jogos = await lerJson(FILES.jogos);
  const canais = await lerJson(FILES.canais);

  const jogosAtivos = jogos.filter((jogo) => jogo.active !== false);

  const dadosFinal = [];
  const relatorioFinal = {
    generatedAt: new Date().toISOString(),
    provider: "DuckDuckGo HTML",
    observacao:
      "Busca sem API paga. Pode falhar, bloquear ou retornar resultados incompletos. Use como pré-curadoria.",
    jogos: []
  };

  for (const jogo of jogosAtivos) {
    try {
      const resultado = await processarJogo(jogo, canais);

      dadosFinal.push(resultado.dados);
      relatorioFinal.jogos.push(resultado.relatorio);

      await sleep(CONFIG.delayMs);
    } catch (error) {
      console.error(`❌ Erro ao processar ${jogo.home} x ${jogo.away}:`, error.message);

      dadosFinal.push({
        id: jogo.id,
        date: jogo.date,
        time: jogo.time,
        league: jogo.league,
        home: jogo.home,
        away: jogo.away,
        stadium: jogo.stadium,
        status: jogo.status,
        region: jogo.region,
        transmissions: []
      });

      relatorioFinal.jogos.push({
        jogo: `${jogo.home} x ${jogo.away}`,
        erro: error.message
      });
    }
  }

  await escreverJson(FILES.dados, dadosFinal);
  await escreverJson(FILES.relatorio, relatorioFinal);

  console.log("\n✅ dados.json atualizado com sucesso.");
  console.log(`📄 Relatório salvo em: ${FILES.relatorio}`);
}

main().catch((error) => {
  console.error("Erro fatal:", error);
  process.exit(1);
});