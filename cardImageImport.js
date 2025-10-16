const API = "https://api.tcgdex.net/v2/en";
let sets = [];

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

async function fetchCards(setId) {
  const grid = document.getElementById("cardsGrid");
  grid.innerHTML = '<div class="loading">Loading cards...</div>';

  try {
    const url = `${API}/sets/${setId || sets[0].id}`;
    const data = await fetch(url).then((r) => r.json());
    const cards = data.cards || [];

    if (cards.length === 0) {
      grid.innerHTML = '<div class="error">No cards found.</div>';
      return;
    }

    grid.innerHTML = cards
      .map(
        (card) => `
            <div class="card">
                <img src="${card.image}/high.webp" alt="${card.name}" class="card-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22250%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22250%22/%3E%3C/svg%3E'">
            </div>
        `
      )
      .join("");
  } catch (error) {
    grid.innerHTML = '<div class="error">Error loading cards.</div>';
    console.error("Error fetching cards:", error);
  }
}

document
  .getElementById("setFilter")
  .addEventListener("change", (e) => fetchCards(e.target.value));

fetchSets().then(() => sets.length > 0 && fetchCards(sets[0].id));
