const API = "https://api.tcgdex.net/v2/en";
const BATCH_SIZE = 100; // Smaller batches for faster initial display
const DISPLAY_BATCH_SIZE = 50; // Display cards in smaller groups

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
let currentSort = "rarity";
let currentDirection = "desc";
let isLoading = false;

// Initialize app
async function init() {
  try {
    await fetchSets();
    setupEventListeners();
    updateToggleButtons();
    // Fetch all sets immediately on app load
    await fetchCards("");
  } catch (error) {
    console.error("Initialization error:", error);
    showError("Failed to initialize application");
  }
}

// Fetch available sets
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

// Fetch cards from selected set or all sets
async function fetchCards(setId) {
  if (isLoading) return;
  isLoading = true;

  showLoading("Loading cards...", 0);

  try {
    const cards = setId ? await fetchFromSet(setId) : await fetchFromAllSets();

    if (!cards.length) {
      showError("No cards found");
      isLoading = false;
      return;
    }

    currentCards = await loadCardDetails(cards);
    displayCards();
  } catch (error) {
    console.error("Fetch error:", error);
    showError("Error loading cards. Please try again.");
  } finally {
    isLoading = false;
  }
}

// Fetch cards from a specific set
async function fetchFromSet(setId) {
  const data = await fetch(`${API}/sets/${setId}`).then((r) => r.json());
  return data.cards || [];
}

// Fetch cards from all sets
async function fetchFromAllSets() {
  const allCards = [];
  for (const set of sets) {
    const cards = await fetchFromSet(set.id);
    allCards.push(...cards);
  }
  return allCards;
}

// Load detailed information for all cards in batches
async function loadCardDetails(basicCards) {
  const allDetails = [];
  const total = basicCards.length;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = basicCards.slice(i, i + BATCH_SIZE);
    const progress = Math.min(i + BATCH_SIZE, total);
    const progressPercent = Math.round((progress / total) * 100);
    showLoading(
      `Loading card details... ${progress}/${total}`,
      progressPercent
    );

    const promises = batch.map((card) =>
      fetch(`${API}/cards/${card.id}`)
        .then((r) => r.json())
        .catch((err) => {
          console.error(`Failed to load card ${card.id}:`, err);
          return null;
        })
    );

    const results = await Promise.all(promises);
    allDetails.push(...results.filter(Boolean));

    // Display cards progressively as batches complete
    if (allDetails.length > 0 && i + BATCH_SIZE < total) {
      currentCards = allDetails.map((card) => ({
        ...card,
        expansionIndex: sets.findIndex((s) => s.id === card.set.id),
      }));
      displayCardsProgressive();
    }
  }

  // Add expansion index for sorting
  return allDetails.map((card) => ({
    ...card,
    expansionIndex: sets.findIndex((s) => s.id === card.set.id),
  }));
}

// Sort cards based on current settings
function sortCards(cards) {
  return [...cards].sort((a, b) => {
    // Handle "None" rarity
    if (a.rarity === "None" && b.rarity !== "None") return 1;
    if (a.rarity !== "None" && b.rarity === "None") return -1;

    let comparison = 0;

    switch (currentSort) {
      case "type":
        comparison = (a.category || "").localeCompare(b.category || "");
        if (comparison === 0) {
          comparison = compareByCollectorNumber(a, b);
        }
        break;

      case "collector":
        comparison = compareByCollectorNumber(a, b);
        break;

      case "rarity":
        comparison =
          (RARITY_ORDER[a.rarity] || 999) - (RARITY_ORDER[b.rarity] || 999);
        if (comparison === 0) {
          comparison = parseInt(a.localId) - parseInt(b.localId);
        }
        if (comparison === 0) {
          comparison = a.expansionIndex - b.expansionIndex;
        }
        break;

      case "expansion":
        comparison = a.expansionIndex - b.expansionIndex;
        if (comparison === 0) {
          comparison = parseInt(a.localId) - parseInt(b.localId);
        }
        break;
    }

    return currentDirection === "asc" ? comparison : -comparison;
  });
}

// Compare cards by collector number (expansion + local ID)
function compareByCollectorNumber(a, b) {
  if (a.expansionIndex !== b.expansionIndex) {
    return a.expansionIndex - b.expansionIndex;
  }
  return parseInt(a.localId) - parseInt(b.localId);
}

// Display cards progressively while loading
function displayCardsProgressive() {
  const grid = document.getElementById("cardsGrid");
  const sorted = sortCards(currentCards);

  if (!sorted.length) return;

  grid.innerHTML = sorted
    .map(
      (card) => `
    <div class="card">
      <img 
        src="${card.image}/high.webp" 
        alt="${card.name}" 
        class="card-image"
        onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22250%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22250%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23666%22%3EImage unavailable%3C/text%3E%3C/svg%3E'"
        loading="lazy"
      >
    </div>
  `
    )
    .join("");
}

// Display cards in grid
function displayCards() {
  const grid = document.getElementById("cardsGrid");
  const sorted = sortCards(currentCards);

  if (!sorted.length) {
    showError("No cards to display");
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
        onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22250%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22250%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23666%22%3EImage unavailable%3C/text%3E%3C/svg%3E'"
        loading="lazy"
      >
    </div>
  `
    )
    .join("");
}

// Show loading message with progress bar
function showLoading(message, progress = 0) {
  document.getElementById("cardsGrid").innerHTML = `
    <div class="loading">
      <div class="loading-text">${message}</div>
      <div class="progress-bar-container">
        <div class="progress-bar" style="width: ${progress}%"></div>
      </div>
    </div>
  `;
}

// Show error message
function showError(message) {
  document.getElementById(
    "cardsGrid"
  ).innerHTML = `<div class="error">${message}</div>`;
}

// Set up event listeners
function setupEventListeners() {
  document.getElementById("setFilter").addEventListener("change", (e) => {
    fetchCards(e.target.value);
  });

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

// Update toggle button active states
function updateToggleButtons() {
  document
    .getElementById("sortAsc")
    .classList.toggle("active", currentDirection === "asc");
  document
    .getElementById("sortDesc")
    .classList.toggle("active", currentDirection === "desc");
}

// Start the application
init();
