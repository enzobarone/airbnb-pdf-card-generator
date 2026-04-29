// Traduzioni IT / EN
const T = {
  it: {
    overview:      "Panoramica",
    host:          "Host",
    period:        "Periodo prenotazione",
    description:   "Descrizione",
    location:      "Posizione",
    reviews:       "recensioni",
    nights:        "notti",
    estPrice:      "prezzo stimato",
    print:         "Stampa / Salva PDF",
    noData:        "Nessun dato trovato. Torna sulla pagina Airbnb e clicca l'icona dell'estensione.",
  },
  en: {
    overview:      "Overview",
    host:          "Host",
    period:        "Stay",
    description:   "Description",
    location:      "Location",
    reviews:       "reviews",
    nights:        "nights",
    estPrice:      "estimated price",
    print:         "Print / Save PDF",
    noData:        "No data found. Go back to the Airbnb listing and click the extension icon.",
  },
};

// Icone SVG inline (Feather Icons, stroke-based)
const ICONS = {
  globe: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  user:  `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  cal:   `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  text:  `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>`,
  pin:   `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
};

function label(icon, text) {
  return `<div class="section-label">${ICONS[icon]}<span>${text}</span></div>`;
}

async function render() {
  const result = await chrome.storage.local.get("airbnbCardData");
  const d = result.airbnbCardData;
  const t = T[(d?.lang || "en").toLowerCase().startsWith("it") ? "it" : "en"];

  if (!d) {
    document.getElementById("card").innerHTML =
      `<p style='padding:24px;color:#c00'>${t.noData}</p>`;
    return;
  }

  const stats = d.amenities.map(a => a.replace(/^·\s*/, "").trim());

  const photoSlots = [0, 1, 2].map(i => {
    const src = d.photos[i];
    return src
      ? `<img src="${escHtml(src)}" alt="Foto ${i + 1}" data-photo-idx="${i}" />`
      : `<div class="photo-placeholder"></div>`;
  });

  // Badge stelle
  const starsHtml = d.reviews?.rating
    ? `<span class="stars">★ ${d.reviews.rating}</span>`
    : "";
  const reviewsHtml = d.reviews?.count
    ? `<span class="reviews-count">${d.reviews.count} ${t.reviews}</span>`
    : "";

  // Date prenotazione — notti in grande
  let datesHtml = "";
  if (d.checkIn && d.checkOut) {
    datesHtml = `
      <div class="dates-row">
        <div class="date-block">
          <div class="date-label">Check-in</div>
          <div class="date-value">${escHtml(d.checkIn)}</div>
        </div>
        <div class="date-arrow">→</div>
        <div class="date-block">
          <div class="date-label">Check-out</div>
          <div class="date-value">${escHtml(d.checkOut)}</div>
        </div>
        ${d.nights ? `<div class="date-nights"><span class="nights-num">${d.nights}</span><span class="nights-word"> ${t.nights}</span></div>` : ""}
      </div>`;
  }

  // Descrizione
  const descHtml = d.description
    ? `<div class="full-width">
         ${label("text", t.description)}
         <div class="description-text">${escHtml(d.description)}</div>
       </div>`
    : "";

  // Mappa OSM composita
  let mapHtml = "";
  if (d.coords) {
    try {
      const mapSrc = await buildMap(d.coords.lat, d.coords.lng);
      mapHtml = `<div class="map-container"><img class="map-image" src="${mapSrc}" alt="Mappa" /></div>`;
    } catch (e) {
      console.warn("Mappa non generata:", e);
    }
  }

  // Città / paese
  const cityHtml = d.city ? `<span class="city-tag">${escHtml(d.city)}</span>` : "";

  document.getElementById("card").innerHTML = `
    <div class="card-header">
      <div class="header-left">
        <h1>${escHtml(d.title)}</h1>
        <div class="header-meta">
          ${cityHtml}
          ${starsHtml}
          ${reviewsHtml}
        </div>
      </div>
      <div class="price-badge">
        <span class="price-value">${escHtml(d.price)}</span>
        <span class="price-label">${t.estPrice}</span>
      </div>
    </div>

    <div class="photos">
      ${photoSlots.join("")}
    </div>

    <div class="card-body">
      <div>
        ${label("globe", t.overview)}
        <div class="overview-stats">
          ${stats.map(s => `<span class="stat-chip">${escHtml(s)}</span>`).join("")}
        </div>
      </div>

      <div>
        ${label("user", t.host)}
        <div class="host-name">${escHtml(d.host)}</div>
      </div>

      ${d.checkIn ? `<div class="full-width">
        ${label("cal", t.period)}
        ${datesHtml}
      </div>` : ""}

      <div class="divider"></div>

      ${descHtml}

      <div class="full-width">
        ${label("pin", t.location)}
        ${mapHtml}
        <div class="location-text">${escHtml(d.location)}</div>
      </div>
    </div>

    <div class="card-footer">
      <span class="url-text">${escHtml(shortUrl(d.url))}</span>
      <span class="signature">Airbnb PDF Card Generator &middot; Enzo Barone &middot; 2026</span>
      <button class="print-btn" id="printBtn">${t.print}</button>
    </div>
  `;

  // Nome file PDF = titolo annuncio (fallback: room ID)
  const roomId = d.url.match(/\/rooms\/(\d+)/)?.[1];
  const fileName = d.title && d.title !== "(titolo non trovato)"
    ? d.title.replace(/[/\\?%*:|"<>]/g, "-").slice(0, 80)
    : roomId ? `airbnb-${roomId}` : "airbnb-card";
  document.title = fileName;

  document.getElementById("printBtn").addEventListener("click", () => window.print());
  const btnTop = document.getElementById("printBtnTop");
  btnTop.textContent = t.print;
  btnTop.addEventListener("click", () => window.print());

  const bwTooltip = (navigator.language || "en").toLowerCase().startsWith("it") ? "Risparmia inchiostro" : "Save ink";
  document.getElementById("modeBW").title = bwTooltip;

  document.getElementById("modeBW").addEventListener("click", () => {
    document.body.classList.remove("color-print");
    document.getElementById("modeBW").classList.add("active");
    document.getElementById("modeColor").classList.remove("active");
  });
  document.getElementById("modeColor").addEventListener("click", () => {
    document.body.classList.add("color-print");
    document.getElementById("modeColor").classList.add("active");
    document.getElementById("modeBW").classList.remove("active");
  });

  // --- A+ / A- : scala solo i caratteri ---
  let fontSize = 13;
  const card = document.getElementById("card");
  const zoomLabel = document.getElementById("zoomLabel");

  function applyFontSize() {
    card.style.fontSize = fontSize + "px";
    zoomLabel.textContent = fontSize + "px";
  }

  document.getElementById("zoomIn").addEventListener("click", () => {
    fontSize = Math.min(22, fontSize + 1);
    applyFontSize();
  });
  document.getElementById("zoomOut").addEventListener("click", () => {
    fontSize = Math.max(9, fontSize - 1);
    applyFontSize();
  });

  document.querySelectorAll("img[data-photo-idx]").forEach(img => {
    img.addEventListener("error", () => {
      img.style.background = "#ddd";
      img.removeAttribute("src");
    });
  });
}

async function buildMap(lat, lng) {
  const zoom = 8, W = 700, H = 180, TILE = 256;
  const n = Math.pow(2, zoom);

  // Coordinate tile con parte frazionaria
  const tileXF = (lng + 180) / 360 * n;
  const latR   = lat * Math.PI / 180;
  const tileYF = (1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n;

  const cTX = Math.floor(tileXF), cTY = Math.floor(tileYF);
  const fracX = tileXF - cTX, fracY = tileYF - cTY;

  // Griglia di tile necessaria
  const numTX = Math.ceil(W / TILE) + 2;
  const numTY = Math.ceil(H / TILE) + 2;
  const startTX = cTX - Math.floor(numTX / 2);
  const startTY = cTY - Math.floor(numTY / 2);

  // Offset di disegno: il punto GPS finisce al centro del canvas
  const offX = W / 2 - (Math.floor(numTX / 2) + fracX) * TILE;
  const offY = H / 2 - (Math.floor(numTY / 2) + fracY) * TILE;

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#e8e0d8";
  ctx.fillRect(0, 0, W, H);

  // Carica tile in parallelo via fetch (CORS: OSM ha Access-Control-Allow-Origin: *)
  await Promise.all(
    Array.from({ length: numTX }, (_, tx) =>
      Array.from({ length: numTY }, (_, ty) => {
        // ESRI ArcGIS tiles: gratuiti, no API key, CORS enabled — formato {z}/{y}/{x}
        const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${startTY + ty}/${startTX + tx}`;
        const dx = Math.round(offX + tx * TILE);
        const dy = Math.round(offY + ty * TILE);
        return fetch(url)
          .then(r => r.blob())
          .then(b => createImageBitmap(b))
          .then(bmp => ctx.drawImage(bmp, dx, dy))
          .catch(() => {});
      })
    ).flat()
  );

  // Pin centrato
  ctx.font = "bold 26px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 3;
  ctx.fillText("📍", W / 2, H / 2 + 6);

  return canvas.toDataURL("image/jpeg", 0.92);
}

function shortUrl(url) {
  try {
    const u = new URL(url);
    const roomId = u.pathname.match(/\/rooms\/(\d+)/)?.[1];
    return roomId ? `${u.hostname}/rooms/${roomId}` : u.hostname + u.pathname;
  } catch { return url; }
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

render();
