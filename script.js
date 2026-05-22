/*
  Onde Passa o Jogo?
  ------------------
  Agora os jogos ficam no arquivo dados.json.

  Importante:
  - Ao abrir diretamente com duplo clique no index.html, alguns navegadores podem bloquear o fetch do JSON.
  - Use Live Server no VS Code, Netlify, GitHub Pages, Vercel ou qualquer servidor local.
*/

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
    const response = await fetch("dados.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Não foi possível carregar dados.json");
    }

    games = await response.json();

    updateStatus.textContent = "Agenda carregada pelo dados.json";
    renderGames();
  } catch (error) {
    console.error(error);

    gamesList.innerHTML = `
      <div class="empty-state">
        Não foi possível carregar o arquivo <strong>dados.json</strong>.
        Abra o projeto usando Live Server, Netlify, GitHub Pages ou outro servidor local.
      </div>
    `;

    updateStatus.textContent = "Erro ao carregar dados.json";
    renderStats([]);
  }
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(year, month - 1, day));
}

function getInitials(team) {
  return team
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function normalizeText(text) {
  return text
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
    ...game.transmissions.map((item) => `${item.type} ${item.name} ${item.details}`)
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

  return game.transmissions.some((item) => item.type === activeType);
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
    games.flatMap((game) => game.transmissions.map((item) => item.name))
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
        Nenhum jogo encontrado com esses filtros. Tente buscar por outro time, canal ou competição.
      </div>
    `;
    return;
  }

  gamesList.innerHTML = filteredGames
    .map((game) => {
      const channelChips = game.transmissions
        .map(
          (item) => `
            <span class="channel-chip">
              ${icons[item.type] || "•"} ${item.name}
            </span>
          `
        )
        .join("");

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

  const game = games.find((item) => item.id === id);

  if (!game) return;

  const transmissions = game.transmissions
    .map(
      (item) => `
        <div class="transmission-item">
          <strong>
            <span>${icons[item.type] || "•"} ${item.name}</span>
            <span>${item.type}</span>
          </strong>
          <small>${item.details}</small>
        </div>
      `
    )
    .join("");

  detailsCard.innerHTML = `
    <div class="details-header">
      <span class="confidence">Alta relevância para ${game.region}</span>
      <h2>${game.home} x ${game.away}</h2>
      <p class="details-muted">
        ${game.league} • ${formatDate(game.date)} • ${game.time} • ${game.stadium}
      </p>
    </div>

    <div class="transmission-list">
      ${transmissions}
    </div>

    <div class="notice">
      Antes de exibir links reais, valide contrato, praça de transmissão, bloqueio regional
      e regras de publicidade para casas de aposta.
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
      Casas de aposta devem aparecer apenas quando houver transmissão autorizada e público legalmente permitido.
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
