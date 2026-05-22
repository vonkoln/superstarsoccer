/*
  Onde Passa o Jogo?
  ------------------
  Para usar com Google Apps Script:
  1. Publique o Apps Script como Web App.
  2. Copie a URL de implantação.
  3. Cole abaixo em DATA_SOURCE_URL.

  Enquanto DATA_SOURCE_URL estiver vazio, o site tenta carregar dados.json local.
*/

const DATA_SOURCE_URL = "https://script.google.com/macros/s/AKfycbz58VAUqPys9xlpxxUFFeCd7ZgPpI7N69QaIFytsk0zEeAUhHmdPm1Eqi5O1aVjGZ9W_Q/exec"; // Exemplo: "https://script.google.com/macros/s/SEU_ID/exec"

let games = [];
let selectedGameId = null;
let quickFilter = "all";

const icons = {
  TV: "📺",
  Streaming: "💻",
  Rádio: "📻",
  "Casa de aposta": "🎲"
};

const gamesList = document.getElementById("gamesList");
const detailsCard = document.getElementById("detailsCard");
const searchInput = document.getElementById("searchInput");
const dateFilter = document.getElementById("dateFilter");
const typeFilter = document.getElementById("typeFilter");
const searchForm = document.getElementById("searchForm");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const goToGamesBtn = document.getElementById("goToGamesBtn");
const updateStatus = document.getElementById("updateStatus");

async function loadGames() {
  try {
    const source = DATA_SOURCE_URL || "dados.json";
    const separator = source.includes("?") ? "&" : "?";
    const url = source.startsWith("http") ? `${source}${separator}t=${Date.now()}` : source;

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}`);
    }

    games = await response.json();

    updateStatus.textContent = DATA_SOURCE_URL
      ? "Agenda carregada via Google Apps Script"
      : "Agenda carregada pelo dados.json local";

    renderGames();
  } catch (error) {
    console.error(error);

    gamesList.innerHTML = `
      <div class="empty-state">
        Não foi possível carregar a agenda. Verifique se a URL do Google Apps Script está publicada
        ou se o arquivo dados.json existe no projeto.
      </div>
    `;

    updateStatus.textContent = "Erro ao carregar agenda";
    renderStats([]);
  }
}

function formatDate(dateString) {
  const [year, month, day] = String(dateString).split("-").map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(year, month - 1, day));
}

function getInitials(team) {
  return String(team)
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function normalizeText(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function gameMatchesSearch(game, searchTerm) {
  if (!searchTerm) return true;

  const searchable = [
    game.league,
    game.home,
    game.away,
    game.stadium,
    game.region,
    ...(game.transmissions || []).map((item) => `${item.type} ${item.name} ${item.details}`)
  ].join(" ");

  return normalizeText(searchable).includes(normalizeText(searchTerm));
}

function gameMatchesDate(game, dateValue) {
  if (dateValue === "all") return true;
  if (dateValue === "today") return game.status === "Hoje";
  if (dateValue === "tomorrow") return game.status === "Amanhã";
  if (dateValue === "week") return ["Hoje", "Amanhã", "Próximos 7 dias"].includes(game.status);

  return true;
}

function gameMatchesType(game, typeValue) {
  const activeType = quickFilter !== "all" ? quickFilter : typeValue;

  if (activeType === "all") return true;

  return (game.transmissions || []).some((item) => item.type === activeType);
}

function getFilteredGames() {
  const searchTerm = searchInput.value.trim();
  const dateValue = dateFilter.value;
  const typeValue = typeFilter.value;

  return games.filter(
    (game) =>
      gameMatchesSearch(game, searchTerm) &&
      gameMatchesDate(game, dateValue) &&
      gameMatchesType(game, typeValue)
  );
}

function renderStats(filteredGames = games) {
  const allChannels = new Set(
    games.flatMap((game) => (game.transmissions || []).map((item) => item.name))
  );

  document.getElementById("totalGames").textContent = filteredGames.length;
  document.getElementById("totalChannels").textContent = allChannels.size;
  document.getElementById("liveNow").textContent = games.filter((game) =>
    ["Hoje", "Amanhã"].includes(game.status)
  ).length;
}

function renderGames() {
  const filteredGames = getFilteredGames();

  renderStats(filteredGames);

  if (!filteredGames.length) {
    gamesList.innerHTML = `
      <div class="empty-state">
        Nenhum jogo encontrado com esses filtros.
      </div>
    `;
    return;
  }

  gamesList.innerHTML = filteredGames
    .map((game) => {
      const transmissions = game.transmissions || [];

      const channelChips = transmissions.length
        ? transmissions
            .map(
              (item) => `
                <span class="channel-chip">
                  ${icons[item.type] || "•"} ${item.name}
                </span>
              `
            )
            .join("")
        : `<span class="channel-chip">A confirmar</span>`;

      return `
        <article
          class="game-card ${selectedGameId === game.id ? "selected" : ""}"
          data-game-id="${game.id}"
          tabindex="0"
          role="button"
          aria-label="Ver transmissão de ${game.home} contra ${game.away}"
        >
          <div class="game-top">
            <div>
              <div class="league">${game.league}</div>
              <div class="meta-row">
                <span>${formatDate(game.date)}</span>
                <span>•</span>
                <span>${game.stadium}</span>
              </div>
            </div>
            <div class="game-time">${game.time}</div>
          </div>

          <div class="teams">
            <div class="team-line">
              <span class="team-badge">${getInitials(game.home)}</span>
              ${game.home}
            </div>

            <div class="team-line">
              <span class="team-badge">${getInitials(game.away)}</span>
              ${game.away}
            </div>
          </div>

          <div class="channels">${channelChips}</div>
        </article>
      `;
    })
    .join("");

  bindGameCards();
}

function bindGameCards() {
  document.querySelectorAll(".game-card").forEach((card) => {
    card.addEventListener("click", () => {
      selectGame(Number(card.dataset.gameId));
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectGame(Number(card.dataset.gameId));
      }
    });
  });
}

function selectGame(id) {
  selectedGameId = id;

  const game = games.find((item) => Number(item.id) === Number(id));

  if (!game) return;

  const transmissions = (game.transmissions || []).length
    ? game.transmissions
        .map(
          (item) => `
            <div class="transmission-item">
              <strong>
                <span>${icons[item.type] || "•"} ${item.name}</span>
                <span>${item.type}</span>
              </strong>
              <small>${item.details || ""}</small>
              ${
                item.sourceUrl
                  ? `<a class="source-link" href="${item.sourceUrl}" target="_blank" rel="noopener noreferrer">Ver fonte</a>`
                  : ""
              }
            </div>
          `
        )
        .join("")
    : `<div class="empty-state">Transmissão ainda não confirmada.</div>`;

  detailsCard.innerHTML = `
    <div class="details-header">
      <span class="confidence">${game.region || "Região não informada"}</span>
      <h2>${game.home} x ${game.away}</h2>
      <p class="details-muted">
        ${game.league} • ${formatDate(game.date)} • ${game.time} • ${game.stadium}
      </p>
    </div>

    <div class="transmission-list">
      ${transmissions}
    </div>

    <div class="notice">
      Confirme sempre a disponibilidade regional, direitos de transmissão e alterações de última hora.
    </div>
  `;

  renderGames();
}

function resetFilters() {
  searchInput.value = "";
  dateFilter.value = "all";
  typeFilter.value = "all";
  quickFilter = "all";
  selectedGameId = null;

  document.querySelectorAll(".pill").forEach((pill) => {
    pill.classList.toggle("active", pill.dataset.quick === "all");
  });

  detailsCard.innerHTML = `
    <div class="details-header">
      <span class="confidence">Selecione um jogo</span>
      <h2>Detalhes da transmissão</h2>
      <p class="details-muted">
        Clique em qualquer partida para visualizar TV, rádio, streaming e observações.
      </p>
    </div>

    <div class="notice">
      Para uso real, confirme direitos de transmissão, disponibilidade regional e links oficiais.
    </div>
  `;

  renderGames();
}

function scrollToGames() {
  document.getElementById("gamesSection").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

document.querySelectorAll(".pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    quickFilter = pill.dataset.quick;

    document.querySelectorAll(".pill").forEach((item) => {
      item.classList.remove("active");
    });

    pill.classList.add("active");
    renderGames();
  });
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  renderGames();
});

[searchInput, dateFilter, typeFilter].forEach((element) => {
  element.addEventListener("input", renderGames);
  element.addEventListener("change", renderGames);
});

clearFiltersBtn.addEventListener("click", resetFilters);
goToGamesBtn.addEventListener("click", scrollToGames);

loadGames();
