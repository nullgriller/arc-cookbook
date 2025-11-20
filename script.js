const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRTkcgTI-Sr63QI8AruuEhhki1PMzF5pFV2eRw-h6PgydS6499aiTZ7iGcqaW3sppjpTZfEGCoPNN6-/pub?output=csv";

const ITEMS_PER_PAGE = 6;

let allRows = [];     
let filteredRows = []; 
let currentPage = 1;
let headers = [];


function showStatus(msg) {
  const s = document.getElementById("status");
  if (s) s.textContent = msg;
}

function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseCSV(text) {
  text = text.replace(/\r\n/g, "\n");
  const rows = [];
  let cur = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      row.push(cur);
      cur = "";
    } else if (ch === '\n' && !inQuotes) {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }

  const filtered = rows.filter(r => r.some(cell => cell && String(cell).trim().length > 0));
  if (filtered.length === 0) return { headers: [], data: [] };

  const rawHeaders = filtered[0].map(h => String(h || "").trim());
  const dataRows = filtered.slice(1).map(r => {
    const obj = {};
    for (let i = 0; i < rawHeaders.length; i++) {
      obj[rawHeaders[i]] = String(r[i] || "");
    }
    return obj;
  });

  return { headers: rawHeaders, data: dataRows };
}

function getFieldFromRow(row, nameVariants) {
  if (!row) return "";
  const keys = Object.keys(row);
  for (const target of nameVariants) {
    const t = target.trim().toLowerCase();
    for (const k of keys) {
      if (k.trim().toLowerCase() === t) return row[k] || "";
    }
  }
  return "";
}


function renderCards(page = 1) {
  const container = document.getElementById("recipes");
  container.innerHTML = "";

  const rows = filteredRows;
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  currentPage = page;

  const start = (page - 1) * ITEMS_PER_PAGE;
  const slice = rows.slice(start, start + ITEMS_PER_PAGE);

  if (slice.length === 0) {
    container.innerHTML = "<p>No recipes found.</p>";
  }

  slice.forEach((rowObj, idx) => {
    const globalIndex = allRows.indexOf(rowObj); 
    const name = escapeHtml(getFieldFromRow(rowObj, ["Name of the recipe", "name of the recipe", "recipe", "title"]));
    const person = escapeHtml(getFieldFromRow(rowObj, ["Name of the person", "name of the person", "submitter", "person"]));
    const ingredients = escapeHtml(getFieldFromRow(rowObj, ["Ingredients list", "ingredients list", "ingredients"]));

    const card = document.createElement("article");
    card.className = "recipe-card";
    card.innerHTML = `
      <h2>${name || "(Unnamed recipe)"}</h2>
      <p class="meta">Submitted by ${person || "Anonymous"}</p>
      <p class="preview">${ingredients ? (ingredients.length > 180 ? ingredients.slice(0,180) + "…" : ingredients) : ""}</p>
    `;
    card.addEventListener("click", () => {

      if (globalIndex >= 0) {
        window.location.href = `recipe.html?id=${encodeURIComponent(globalIndex)}`;
      } else {
        console.warn("Could not find global index for row", rowObj);
      }
    });
    container.appendChild(card);
  });

  renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
  const nav = document.getElementById("pagination");
  nav.innerHTML = "";

  if (totalPages <= 1) return;

  const prev = document.createElement("button");
  prev.textContent = "Previous";
  prev.disabled = currentPage <= 1;
  prev.addEventListener("click", () => renderCards(currentPage - 1));

  const next = document.createElement("button");
  next.textContent = "Next";
  next.disabled = currentPage >= totalPages;
  next.addEventListener("click", () => renderCards(currentPage + 1));

  const info = document.createElement("span");
  info.textContent = ` Page ${currentPage} of ${totalPages} `;

  nav.appendChild(prev);
  nav.appendChild(info);
  nav.appendChild(next);
}


function applyFilterAndSort() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  const sortType = document.getElementById("sortSelect").value;
  const languageFilter = document.getElementById("languageFilter").value;
  function getLanguage(row) {
  return getFieldFromRow(row, ["Language", "language", "Lang", "lang"])
    .trim()
    .toLowerCase();
}

  filteredRows = allRows.filter(row => {
  const lang = getLanguage(row);
  if (languageFilter !== "all" && lang !== languageFilter) return false;

  if (!q) return true;

  const hay = [
    getFieldFromRow(row, ["Name of the recipe", "recipe", "title"]),
    getFieldFromRow(row, ["Name of the person", "submitter", "person"]),
    getFieldFromRow(row, ["Ingredients list", "ingredients"]),
    getFieldFromRow(row, ["Story or Memory behind the recipe", "story", "memory"])
  ].join(" ").toLowerCase();
  return hay.includes(q);
});


  if (sortType === "name") {
    filteredRows.sort((a, b) => {
      const an = getFieldFromRow(a, ["Name of the recipe"]).toLowerCase();
      const bn = getFieldFromRow(b, ["Name of the recipe"]).toLowerCase();
      return an.localeCompare(bn);
    });
  } else if (sortType === "newest") {

    filteredRows.sort((a, b) => {
      const at = getFieldFromRow(a, ["Timestamp", "timestamp"]);
      const bt = getFieldFromRow(b, ["Timestamp", "timestamp"]);
      const ad = new Date(at || 0);
      const bd = new Date(bt || 0);
      return bd - ad;
    });
  }

  currentPage = 1;
  renderCards(currentPage);
}

async function loadSheet() {
  showStatus("Loading recipes...");
  try {
    const resp = await fetch(SHEET_CSV_URL);
    if (!resp.ok) throw new Error("Network response not ok: " + resp.status);
    const text = await resp.text();

    const parsed = parseCSV(text);
    headers = parsed.headers;
   allRows = parsed.data.filter(row => {
  const approvedValue = getFieldFromRow(row, ["Approved", "approved", "Approve", "approved?"]).trim().toLowerCase();
  return approvedValue === "true" || approvedValue === "yes" || approvedValue === "1";
});

    if (!Array.isArray(allRows)) allRows = [];

    filteredRows = allRows.slice();

    applyFilterAndSort();
    setupControls();
    showStatus("");
  } catch (err) {
    console.error("Failed to load sheet:", err);
    showStatus("Error loading recipes. Make sure the sheet URL is published (CSV) and reachable. See console for details.");
    document.getElementById("recipes").innerHTML = "<p class=\"error\">Unable to load recipes.</p>";
  }
}

function setupControls() {
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");

  searchInput.addEventListener("input", () => {
    applyFilterAndSort();
  });

  sortSelect.addEventListener("change", () => {
    applyFilterAndSort();
  });
}

const languageFilter = document.getElementById("languageFilter");
languageFilter.addEventListener("change", () => {
  applyFilterAndSort();
});

document.addEventListener("DOMContentLoaded", () => {
  loadSheet();
});






