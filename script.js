const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRTkcgTI-Sr63QI8AruuEhhki1PMzF5pFV2eRw-h6PgydS6499aiTZ7iGcqaW3sppjpTZfEGCoPNN6-/pub?output=csv";

let currentPage = 1;
const recipesPerPage = 6;

let allRecipes = []; 

async function loadRecipes() {
    const res = await fetch(sheetUrl);
    const csvText = await res.text();
    const rows = csvText.split("\n").map(r => r.split(","));

    allRecipes = rows.slice(1).map((cells, index) => {
        const cleaned = cells.map(c => c.replace(/"/g, ""));
        return {
            id: index,
            nameOfPerson: cleaned[0],
            nameOfRecipe: cleaned[1],
            ingredients: cleaned[2],
            instructions: cleaned[3],
            allergens: cleaned[4],
            story: cleaned[5]
        };
    });

    renderRecipes();
    setupSearch();
}

function renderRecipes(filtered = null) {
    const recipeContainer = document.getElementById("recipeContainer");
    const paginationDiv = document.getElementById("pagination");

    const data = filtered || allRecipes;

    const start = (currentPage - 1) * recipesPerPage;
    const end = start + recipesPerPage;
    const paginated = data.slice(start, end);

    recipeContainer.innerHTML = "";

    paginated.forEach(r => {
        const card = document.createElement("div");
        card.classList.add("recipe-card");
        card.innerHTML = `
            <h2>${r.nameOfRecipe}</h2>
            <p><strong>Submitted by:</strong> ${r.nameOfPerson}</p>
        `;
        card.onclick = () => {
            window.location.href = `recipe.html?id=${r.id}`;
        };
        recipeContainer.appendChild(card);
    });

    const totalPages = Math.ceil(data.length / recipesPerPage);

    paginationDiv.innerHTML = `
        <button onclick="prevPage()" ${currentPage === 1 ? "disabled" : ""}>Previous</button>
        <span> Page ${currentPage} of ${totalPages} </span>
        <button onclick="nextPage(${totalPages})" ${currentPage === totalPages ? "disabled" : ""}>Next</button>
    `;
}

function nextPage(total) {
    if (currentPage < total) {
        currentPage++;
        renderRecipes();
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderRecipes();
    }
}

function setupSearch() {
    const searchBar = document.getElementById("searchBar");

    searchBar.addEventListener("input", () => {
        const query = searchBar.value.toLowerCase();

        currentPage = 1;

        const filtered = allRecipes.filter(r =>
            r.nameOfRecipe.toLowerCase().includes(query) ||
            r.ingredients.toLowerCase().includes(query) ||
            r.nameOfPerson.toLowerCase().includes(query)
        );

        renderRecipes(filtered);
    });
}

loadRecipes();
