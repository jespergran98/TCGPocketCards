// Search functionality for card names
let searchTerm = "";

// Initialize search
function initSearch() {
  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearSearch");

  searchInput.addEventListener("input", (e) => {
    searchTerm = e.target.value.toLowerCase().trim();
    clearBtn.style.display = searchTerm ? "block" : "none";
    filterAndDisplayCards();
  });

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchTerm = "";
    clearBtn.style.display = "none";
    filterAndDisplayCards();
  });
}

// Filter cards based on search term
function filterAndDisplayCards() {
  if (!currentCards.length) return;

  const filtered = searchTerm
    ? currentCards.filter((card) =>
        (card.name || "").toLowerCase().includes(searchTerm)
      )
    : currentCards;

  displayFilteredCards(filtered);
}

// Display filtered cards
function displayFilteredCards(cards) {
  const grid = document.getElementById("cardsGrid");
  const sorted = sortCards(cards);

  if (!sorted.length) {
    grid.innerHTML = `<div class="error">No cards found matching "${searchTerm}"</div>`;
    return;
  }

  grid.innerHTML = sorted
    .map((card) => {
      const imageUrl = card.image ? `${card.image}/high.webp` : "";
      const cardName = card.name || "Unknown Card";

      return `
        <div class="card">
          <img 
            src="${imageUrl}" 
            alt="${cardName}" 
            class="card-image"
            onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22250%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22250%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23666%22 font-size=%2212%22%3EImage unavailable%3C/text%3E%3C/svg%3E'"
            loading="lazy"
          >
        </div>
      `;
    })
    .join("");
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSearch);
} else {
  initSearch();
}
