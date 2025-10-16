const API = "https://api.tcgdex.net/v2/en";
const BATCH_SIZE = 100;

const RARITY_ORDER = {
  "One Diamond": 1,
  "Two Diamond": 2,
  "Three Diamond": 3,
  "Four Diamond": 4,
  "One Star": 5,
  "Two Star": 6,
  "Three Star": 7,
  "One Shiny": 8,
  "Two Shiny": 9,
  Crown: 10,
};

let sets = [];
let currentCards = [];
let currentSort = "collector";
let currentDirection = "asc";

// Initialize
async function init() {
  try {
    await fetchSets();
    setupEventListeners();
  } catch (error) {
    console.error("Init error:", error);
    showError("Failed to initialize");
  }
}

// Fetch and populate sets
async function fetchSets() {
  const data = await fetch(`${API}/series/tcgp`).then((r) => r.json());
  sets = data.sets;

  const filter = document.getElementById("setFilter");
  sets.forEach((set) => {
    const option = document.createElement("option");
    option.value = set.id;
    option.textContent = set.name;
    filter.appendChild(option);
  });
}

// Fetch cards with pagination
async function fetchCards(setId) {
  showLoading("Loading cards...");

  try {
    let basicCards = setId
      ? await fetchFromSet(setId)
      : await fetchFromAllSets();

    if (!basicCards.length) {
      showError("No cards found");
      return;
    }

    currentCards = await loadCardDetails(basicCards);
    displayCards();
  } catch (error) {
    console.error("Fetch error:", error);
    showError("Error loading cards");
  }
}

async function fetchFromSet(setId) {
  const data = await fetch(`${API}/sets/${setId}`).then((r) => r.json());
  return data.cards || [];
}

async function fetchFromAllSets() {
  let allCards = [];
  for (const set of sets) {
    const cards = await fetchFromSet(set.id);
    allCards = allCards.concat(cards);
  }
  return allCards;
}

async function loadCardDetails(basicCards) {
  const detailed = [];

  for (let i = 0; i < basicCards.length; i += BATCH_SIZE) {
    const batch = basicCards.slice(i, i + BATCH_SIZE);
    showLoading(
      `Loading card details... (${Math.min(
        i + BATCH_SIZE,
        basicCards.length
      )}/${basicCards.length})`
    );

    const promises = batch.map((card) =>
      fetch(`${API}/cards/${card.id}`)
        .then((r) => r.json())
        .catch(() => null)
    );
    const results = await Promise.all(promises);
    detailed.push(...results.filter(Boolean));
  }

  return detailed.map((card) => ({
    ...card,
    expansionIndex: sets.findIndex((s) => s.id === card.set.id),
  }));
}

// Sorting functions
function sortCards(cards) {
  const sorted = [...cards];
  sorted.sort((a, b) => {
    // Handle "None" rarity
    if (a.rarity === "None" && b.rarity !== "None") return 1;
    if (a.rarity !== "None" && b.rarity === "None") return -1;
    if (a.rarity === "None" && b.rarity === "None") return 0;

    let comparison = 0;

    switch (currentSort) {
      case "type":
        comparison = (a.category || "").localeCompare(b.category || "");
        if (comparison !== 0) break;
      // Fall through to collector number
      case "collector":
        if (a.expansionIndex !== b.expansionIndex) {
          comparison = a.expansionIndex - b.expansionIndex;
          break;
        }
        comparison = parseInt(a.localId) - parseInt(b.localId);
        break;
      case "rarity":
        comparison =
          (RARITY_ORDER[a.rarity] || 999) - (RARITY_ORDER[b.rarity] || 999);
        if (comparison !== 0) break;
        comparison = parseInt(a.localId) - parseInt(b.localId);
        if (comparison !== 0) break;
        comparison = a.expansionIndex - b.expansionIndex;
        break;
      case "expansion":
        comparison = a.expansionIndex - b.expansionIndex;
        if (comparison !== 0) break;
        comparison = parseInt(a.localId) - parseInt(b.localId);
        break;
    }

    return currentDirection === "asc" ? comparison : -comparison;
  });

  return sorted;
}

// Display
function displayCards() {
  const grid = document.getElementById("cardsGrid");
  const sorted = sortCards(currentCards);

  if (!sorted.length) {
    showError("No cards found");
    return;
  }

  grid.innerHTML = sorted
    .map(
      (card) => `
    <div class="card">
      <img 
        src="${card.image}/high.webp" 
        alt="${card.name}" 
        class="card-image"
        onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22250%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22250%22/%3E%3C/svg%3E'"
        loading="lazy"
      >
    </div>
  `
    )
    .join("");
}

function showLoading(message) {
  document.getElementById(
    "cardsGrid"
  ).innerHTML = `<div class="loading">${message}</div>`;
}

function showError(message) {
  document.getElementById(
    "cardsGrid"
  ).innerHTML = `<div class="error">${message}</div>`;
}

// Event listeners
function setupEventListeners() {
  document
    .getElementById("setFilter")
    .addEventListener("change", (e) => fetchCards(e.target.value));

  document.getElementById("sortFilter").addEventListener("change", (e) => {
    currentSort = e.target.value;
    if (currentCards.length) displayCards();
  });

  document.getElementById("sortAsc").addEventListener("click", () => {
    if (currentDirection !== "asc") {
      currentDirection = "asc";
      updateToggleButtons();
      if (currentCards.length) displayCards();
    }
  });

  document.getElementById("sortDesc").addEventListener("click", () => {
    if (currentDirection !== "desc") {
      currentDirection = "desc";
      updateToggleButtons();
      if (currentCards.length) displayCards();
    }
  });
}

function updateToggleButtons() {
  document
    .getElementById("sortAsc")
    .classList.toggle("active", currentDirection === "asc");
  document
    .getElementById("sortDesc")
    .classList.toggle("active", currentDirection === "desc");
}

init();
