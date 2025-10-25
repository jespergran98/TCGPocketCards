const TCGDEX_API = "https://api.tcgdex.net/v2/en";
const POCKET_DB_API = "https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist";
// Try jsdelivr CDN which is more reliable for GitHub content
const POCKET_DB_IMAGES = "https://cdn.jsdelivr.net/gh/flibustier/pokemon-tcg-exchange@main/public/images/cards";
// Fallback to raw GitHub
const POCKET_DB_IMAGES_FALLBACK = "https://raw.githubusercontent.com/flibustier/pokemon-tcg-exchange/main/public/images/cards";

const BATCH_SIZE = 500;

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
  // Pocket DB rarities
  Common: 1,
  Uncommon: 2,
  Rare: 3,
  "Double Rare": 4,
  "Super Rare": 5,
  "Art Rare": 6,
  "Special Art Rare": 7,
  "Immersive Rare": 8,
  "Crown Rare": 9,
};

let sets = [];
let currentCards = [];
let currentSort = "rarity";
let currentDirection = "desc";
let isLoading = false;
let currentAPI = "tcgdex"; // 'tcgdex' or 'pocketdb'
let pocketDBCache = null; // Cache for Pocket DB data

// Initialize app
async function init() {
  try {
    await fetchSets();
    setupEventListeners();
    updateToggleButtons();
    updateAPIButtons();
    await fetchCards("");
  } catch (error) {
    console.error("Initialization error:", error);
    showError("Failed to initialize application");
  }
}

// Fetch available sets
async function fetchSets() {
  try {
    if (currentAPI === "tcgdex") {
      const data = await fetch(`${TCGDEX_API}/series/tcgp`).then((r) =>
        r.json()
      );
      sets = data.sets || [];
    } else {
      const data = await fetch(`${POCKET_DB_API}/sets.json`).then((r) =>
        r.json()
      );
      // Transform Pocket DB sets to match expected format
      sets = data
        .map((set) => ({
          id: set.code,
          name: set.label.en || set.label.eng || set.code,
          releaseDate: set.releaseDate,
          count: set.count,
          packs: set.packs || [],
        }))
        .sort((a, b) => new Date(a.releaseDate) - new Date(b.releaseDate));
    }

    updateSetFilter();
  } catch (error) {
    console.error("Failed to fetch sets:", error);
    throw error;
  }
}

// Update set filter dropdown
function updateSetFilter() {
  const filter = document.getElementById("setFilter");
  filter.innerHTML = '<option value="" selected>All Sets</option>';

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
    let cards;
    if (currentAPI === "tcgdex") {
      cards = setId
        ? await fetchFromSetTCGDex(setId)
        : await fetchFromAllSetsTCGDex();
      currentCards = await loadCardDetailsTCGDex(cards);
    } else {
      // For Pocket DB, load all cards once and cache
      if (!pocketDBCache) {
        showLoading("Loading card database...", 30);
        pocketDBCache = await fetch(`${POCKET_DB_API}/cards.json`).then((r) =>
          r.json()
        );
      }
      cards = setId
        ? pocketDBCache.filter((card) => card.set === setId)
        : pocketDBCache;
      currentCards = processCardsPocketDB(cards);
    }

    if (!currentCards.length) {
      showError("No cards found");
      return;
    }

    // Use the search filter if searchbar.js is loaded
    if (typeof filterAndDisplayCards === "function") {
      filterAndDisplayCards();
    } else {
      displayCards();
    }
  } catch (error) {
    console.error("Fetch error:", error);
    showError("Error loading cards. Please try again.");
  } finally {
    isLoading = false;
  }
}

// TCGDex API functions
async function fetchFromSetTCGDex(setId) {
  const data = await fetch(`${TCGDEX_API}/sets/${setId}`).then((r) =>
    r.json()
  );
  return data.cards || [];
}

async function fetchFromAllSetsTCGDex() {
  const allCards = [];
  let loaded = 0;
  const total = sets.length;

  for (const set of sets) {
    const cards = await fetchFromSetTCGDex(set.id);
    allCards.push(...cards);
    loaded++;
    showLoading(
      `Loading sets... ${loaded}/${total}`,
      Math.round((loaded / total) * 50)
    );
  }
  return allCards;
}

async function loadCardDetailsTCGDex(basicCards) {
  const allDetails = [];
  const total = basicCards.length;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = basicCards.slice(i, i + BATCH_SIZE);
    const progress = Math.min(i + BATCH_SIZE, total);
    const progressPercent = Math.round(50 + (progress / total) * 50);

    showLoading(
      `Loading card details... ${progress}/${total}`,
      progressPercent
    );

    const promises = batch.map((card) =>
      fetch(`${TCGDEX_API}/cards/${card.id}`)
        .then((r) => r.json())
        .catch((err) => {
          console.error(`Failed to load card ${card.id}:`, err);
          return null;
        })
    );

    const results = await Promise.all(promises);
    allDetails.push(...results.filter(Boolean));
  }

  // Add expansion index for sorting
  return allDetails.map((card) => ({
    ...card,
    expansionIndex: sets.findIndex((s) => s.id === card.set.id),
  }));
}

// Pocket DB API functions
function processCardsPocketDB(cards) {
  showLoading("Processing cards...", 80);

  // Transform Pocket DB cards to match expected format
  return cards.map((card) => {
    const setInfo = sets.find((s) => s.id === card.set);
    return {
      id: `${card.set}-${card.number}`,
      localId: card.number.toString(),
      name: card.label.eng || card.label.en || "Unknown",
      // Provide both CDN and fallback image URLs
      image: card.imageName ? card.imageName : null,
      rarity: card.rarity,
      rarityCode: card.rarityCode,
      category: card.packs && card.packs.length > 0 ? card.packs[0] : "Unknown",
      set: {
        id: card.set,
        name: setInfo ? setInfo.name : card.set,
      },
      expansionIndex: sets.findIndex((s) => s.id === card.set),
      packs: card.packs || [],
    };
  });
}

// Sort cards based on current settings
function sortCards(cards) {
  return [...cards].sort((a, b) => {
    // Handle "None" rarity - always sort to end
    if (a.rarity === "None" && b.rarity !== "None") return 1;
    if (a.rarity !== "None" && b.rarity === "None") return -1;
    if (a.rarity === "None" && b.rarity === "None") return 0;

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
          comparison = parseInt(a.localId || 0) - parseInt(b.localId || 0);
        }
        if (comparison === 0) {
          comparison = a.expansionIndex - b.expansionIndex;
        }
        break;

      case "expansion":
        comparison = a.expansionIndex - b.expansionIndex;
        if (comparison === 0) {
          comparison = parseInt(a.localId || 0) - parseInt(b.localId || 0);
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
  return parseInt(a.localId || 0) - parseInt(b.localId || 0);
}

// Get image URL with fallback for Pocket DB
function getImageUrl(card) {
  if (currentAPI === "tcgdex") {
    return card.image ? `${card.image}/high.webp` : "";
  } else {
    // Pocket DB: try CDN first, then fallback
    if (!card.image) return "";
    return `${POCKET_DB_IMAGES}/${card.image}`;
  }
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
    .map((card) => {
      const imageUrl = getImageUrl(card);
      const fallbackUrl =
        currentAPI === "pocketdb" && card.image
          ? `${POCKET_DB_IMAGES_FALLBACK}/${card.image}`
          : "";
      const cardName = card.name || "Unknown Card";

      return `
        <div class="card">
          <img 
            src="${imageUrl}" 
            alt="${cardName}" 
            class="card-image"
            ${fallbackUrl ? `data-fallback="${fallbackUrl}"` : ""}
            onerror="handleImageError(this)"
            loading="lazy"
          >
        </div>
      `;
    })
    .join("");
}

// Handle image loading errors with fallback
window.handleImageError = function (img) {
  const fallback = img.getAttribute("data-fallback");
  if (fallback && img.src !== fallback) {
    img.src = fallback;
  } else {
    img.src =
      "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22250%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22250%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23666%22 font-size=%2212%22%3EImage unavailable%3C/text%3E%3C/svg%3E";
  }
};

// Show loading message with progress bar
function showLoading(message, progress = 0) {
  const grid = document.getElementById("cardsGrid");
  grid.innerHTML = `
    <div class="loading">
      <div class="loading-text">${message}</div>
      <div class="progress-bar-container">
        <div class="progress-bar" style="width: ${Math.min(
          100,
          Math.max(0, progress)
        )}%"></div>
      </div>
    </div>
  `;
}

// Show error message
function showError(message) {
  const grid = document.getElementById("cardsGrid");
  grid.innerHTML = `<div class="error">${message}</div>`;
}

// Switch API
async function switchAPI(api) {
  if (currentAPI === api || isLoading) return;

  currentAPI = api;
  updateAPIButtons();

  // Reset state
  sets = [];
  currentCards = [];
  pocketDBCache = null; // Clear cache when switching

  // Reset set filter
  const setFilter = document.getElementById("setFilter");
  setFilter.value = "";

  // Reload data
  try {
    await fetchSets();
    await fetchCards("");
  } catch (error) {
    console.error("API switch error:", error);
    showError("Failed to switch API. Please try again.");
  }
}

// Set up event listeners
function setupEventListeners() {
  const setFilter = document.getElementById("setFilter");
  const sortFilter = document.getElementById("sortFilter");
  const sortAsc = document.getElementById("sortAsc");
  const sortDesc = document.getElementById("sortDesc");
  const apiTCGDex = document.getElementById("apiTCGDex");
  const apiPocketDB = document.getElementById("apiPocketDB");

  setFilter.addEventListener("change", (e) => {
    fetchCards(e.target.value);
  });

  sortFilter.addEventListener("change", (e) => {
    currentSort = e.target.value;
    if (currentCards.length) {
      if (typeof filterAndDisplayCards === "function") {
        filterAndDisplayCards();
      } else {
        displayCards();
      }
    }
  });

  sortAsc.addEventListener("click", () => {
    if (currentDirection !== "asc") {
      currentDirection = "asc";
      updateToggleButtons();
      if (currentCards.length) {
        if (typeof filterAndDisplayCards === "function") {
          filterAndDisplayCards();
        } else {
          displayCards();
        }
      }
    }
  });

  sortDesc.addEventListener("click", () => {
    if (currentDirection !== "desc") {
      currentDirection = "desc";
      updateToggleButtons();
      if (currentCards.length) {
        if (typeof filterAndDisplayCards === "function") {
          filterAndDisplayCards();
        } else {
          displayCards();
        }
      }
    }
  });

  apiTCGDex.addEventListener("click", () => {
    switchAPI("tcgdex");
  });

  apiPocketDB.addEventListener("click", () => {
    switchAPI("pocketdb");
  });
}

// Update toggle button active states
function updateToggleButtons() {
  const sortAsc = document.getElementById("sortAsc");
  const sortDesc = document.getElementById("sortDesc");

  sortAsc.classList.toggle("active", currentDirection === "asc");
  sortDesc.classList.toggle("active", currentDirection === "desc");
}

// Update API button active states
function updateAPIButtons() {
  const apiTCGDex = document.getElementById("apiTCGDex");
  const apiPocketDB = document.getElementById("apiPocketDB");

  apiTCGDex.classList.toggle("active", currentAPI === "tcgdex");
  apiPocketDB.classList.toggle("active", currentAPI === "pocketdb");
}

// Start the application
init();