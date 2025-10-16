const API = "https://api.tcgdex.net/v2/en";
let sets = [];
let currentCards = [];
let currentSort = "collector";
let currentDirection = "asc";

// Rarity order for sorting (Diamond 1-4, then Star 1-3, then Crown)
const rarityOrder = {
  "One Diamond": 1,
  "Two Diamond": 2,
  "Three Diamond": 3,
  "Four Diamond": 4,
  "One Star": 5,
  "Two Star": 6,
  "Three Star": 7,
  Crown: 8,
};

async function fetchSets() {
  try {
    const data = await fetch(`${API}/series/tcgp`).then((r) => r.json());
    sets = data.sets;
    const filter = document.getElementById("setFilter");
    sets.forEach((set) => {
      const option = document.createElement("option");
      option.value = set.id;
      option.textContent = set.name;
      filter.appendChild(option);
    });
  } catch (error) {
    console.error("Error fetching sets:", error);
  }
}

async function fetchCardDetails(cardId) {
  try {
    const data = await fetch(`${API}/cards/${cardId}`).then((r) => r.json());
    return data;
  } catch (error) {
    console.error(`Error fetching card ${cardId}:`, error);
    return null;
  }
}

async function fetchCards(setId) {
  const grid = document.getElementById("cardsGrid");
  grid.innerHTML = '<div class="loading">Loading cards...</div>';

  try {
    const url = `${API}/sets/${setId || sets[0].id}`;
    const data = await fetch(url).then((r) => r.json());
    const basicCards = data.cards || [];

    if (basicCards.length === 0) {
      grid.innerHTML = '<div class="error">No cards found.</div>';
      return;
    }

    // Fetch full details for all cards
    grid.innerHTML = '<div class="loading">Loading card details...</div>';
    const detailPromises = basicCards.map((card) => fetchCardDetails(card.id));
    const detailedCards = await Promise.all(detailPromises);

    // Filter out any failed fetches and add expansion index
    currentCards = detailedCards
      .filter((card) => card !== null)
      .map((card) => ({
        ...card,
        expansionIndex: sets.findIndex((set) => set.id === card.set.id),
      }));

    displayCards();
  } catch (error) {
    grid.innerHTML = '<div class="error">Error loading cards.</div>';
    console.error("Error fetching cards:", error);
  }
}

function sortCards(cards, sortType, direction) {
  const sorted = [...cards];

  switch (sortType) {
    case "collector":
      sorted.sort((a, b) => {
        const numA = parseInt(a.localId);
        const numB = parseInt(b.localId);
        return direction === "asc" ? numA - numB : numB - numA;
      });
      break;

    case "type":
      sorted.sort((a, b) => {
        const categoryA = a.category || "";
        const categoryB = b.category || "";
        if (categoryA === categoryB) {
          return parseInt(a.localId) - parseInt(b.localId);
        }
        const comparison = categoryA.localeCompare(categoryB);
        return direction === "asc" ? comparison : -comparison;
      });
      break;

    case "rarity":
      sorted.sort((a, b) => {
        const rarityA = rarityOrder[a.rarity] || 999;
        const rarityB = rarityOrder[b.rarity] || 999;
        if (rarityA === rarityB) {
          return parseInt(a.localId) - parseInt(b.localId);
        }
        return direction === "asc" ? rarityA - rarityB : rarityB - rarityA;
      });
      break;

    case "expansion":
      sorted.sort((a, b) => {
        if (a.expansionIndex === b.expansionIndex) {
          return parseInt(a.localId) - parseInt(b.localId);
        }
        return direction === "asc"
          ? a.expansionIndex - b.expansionIndex
          : b.expansionIndex - a.expansionIndex;
      });
      break;
  }

  return sorted;
}

function displayCards() {
  const grid = document.getElementById("cardsGrid");
  const sortedCards = sortCards(currentCards, currentSort, currentDirection);

  if (sortedCards.length === 0) {
    grid.innerHTML = '<div class="error">No cards found.</div>';
    return;
  }

  grid.innerHTML = sortedCards
    .map(
      (card) => `
        <div class="card">
            <img src="${card.image}/high.webp" alt="${card.name}" class="card-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22250%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22250%22/%3E%3C/svg%3E'">
        </div>
    `
    )
    .join("");
}

function updateToggleButtons() {
  const ascBtn = document.getElementById("sortAsc");
  const descBtn = document.getElementById("sortDesc");

  if (currentDirection === "asc") {
    ascBtn.classList.add("active");
    descBtn.classList.remove("active");
  } else {
    descBtn.classList.add("active");
    ascBtn.classList.remove("active");
  }
}

document
  .getElementById("setFilter")
  .addEventListener("change", (e) => fetchCards(e.target.value));

document.getElementById("sortFilter").addEventListener("change", (e) => {
  currentSort = e.target.value;
  if (currentCards.length > 0) {
    displayCards();
  }
});

document.getElementById("sortAsc").addEventListener("click", () => {
  currentDirection = "asc";
  updateToggleButtons();
  if (currentCards.length > 0) {
    displayCards();
  }
});

document.getElementById("sortDesc").addEventListener("click", () => {
  currentDirection = "desc";
  updateToggleButtons();
  if (currentCards.length > 0) {
    displayCards();
  }
});

fetchSets().then(() => sets.length > 0 && fetchCards(sets[0].id));
