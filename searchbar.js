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

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSearch);
} else {
  initSearch();
}