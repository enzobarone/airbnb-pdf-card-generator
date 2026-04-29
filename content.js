(function () {
  // Airbnb redesigns their DOM regularly. This tries multiple selectors so we
  // don't have to ship a hotfix every time they move a div three pixels to the left.
  function findFirst(...selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function getTitle() {
    const el = findFirst('h1', '[data-section-id="TITLE_DEFAULT"] h1');
    return el ? el.innerText.trim() : "(title not found)";
  }

  function getPriceAndDates() {
    const url = new URL(window.location.href);
    const checkInRaw  = url.searchParams.get("check_in");
    const checkOutRaw = url.searchParams.get("check_out");
    let checkIn = null, checkOut = null, nights = null;

    if (checkInRaw && checkOutRaw) {
      const d1 = new Date(checkInRaw);
      const d2 = new Date(checkOutRaw);
      nights = Math.round((d2 - d1) / 86400000);
      const fmt = (d) => d.toLocaleDateString(navigator.language || "it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
      checkIn  = fmt(d1);
      checkOut = fmt(d2);
    } else {
      // No dates in the URL — user is just browsing. Try the sidebar.
      const sidebar = document.querySelector('[data-section-id="BOOK_IT_SIDEBAR"]');
      if (sidebar) {
        const t = sidebar.innerText;
        const inM  = t.match(/CHECK-IN\s+([\d/]+)/i);
        const outM = t.match(/CHECK-OUT\s+([\d/]+)/i);
        if (inM)  checkIn  = inM[1];
        if (outM) checkOut = outM[1];
      }
    }

    // Supports €, $, £, ¥ — because not everyone pays in euros (unfortunately).
    let price = null;
    const sidebar = document.querySelector('[data-section-id="BOOK_IT_SIDEBAR"]');
    if (sidebar) {
      const t = sidebar.innerText;
      const m = t.match(/[\d.,]+\s*[€$£¥]\s*(?:in\s+totale|total)/i)
             || t.match(/[€$£¥]\s*[\d.,]+\s*(?:total|in\s+totale)/i)
             || t.match(/[\d.,]+\s*[€$£¥]\s*(?:a\s*notte|per\s*night|\/\s*night)/i)
             || t.match(/[€$£¥]\s*[\d.,]+\s*(?:per\s*night|a\s*notte|\/\s*night)/i)
             || t.match(/[€$£¥]\s*[\d.,]+/)
             || t.match(/[\d.,]+\s*[€$£¥]/);
      if (m) price = m[0].trim();
    }
    if (!price) {
      // Sidebar failed — scan the whole body. Desperate but effective.
      const allText = document.body.innerText;
      const m = allText.match(/[\d.,]+\s*[€$£¥]\s*(?:in\s+totale|total)/i)
             || allText.match(/[€$£¥]\s*[\d.,]+\s*(?:total|in\s+totale)/i)
             || allText.match(/[\d.,]+\s*[€$£¥]\s*(?:a\s*notte|per\s*night)/i)
             || allText.match(/[€$£¥]\s*[\d.,]+\s*(?:per\s*night|a\s*notte)/i);
      if (m) price = m[0].trim();
    }

    return { price: price ?? "(price not found)", checkIn, checkOut, nights };
  }

  function getHost() {
    const section = document.querySelector('[data-section-id="HOST_OVERVIEW_DEFAULT"]');
    if (section) {
      const match = section.innerText.match(/nome dell'host:\s*(.+)/i) ||
                    section.innerText.match(/host name:\s*(.+)/i);
      if (match) return match[1].trim();
    }
    const meetSection = document.querySelector('[data-section-id="MEET_YOUR_HOST"]');
    if (meetSection) {
      const lines = meetSection.innerText.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length >= 2) return lines[1];
    }
    return "(host not found)";
  }

  function getAmenities() {
    const section = document.querySelector(
      '[data-section-id="AMENITIES_DEFAULT"], [data-section-id="OVERVIEW_DEFAULT_V2"]'
    );
    if (!section) return [];
    const items = section.querySelectorAll('div[class*="amenity"], li, [class*="_1nlbjeu"]');
    const amenities = [];
    items.forEach(item => {
      const text = item.innerText.trim();
      if (text && text.length > 1 && text.length < 60 && !amenities.includes(text)) {
        amenities.push(text);
      }
    });
    return amenities.slice(0, 12);
  }

  function getReviews() {
    const section = document.querySelector('[data-section-id="OVERVIEW_DEFAULT_V2"]');
    if (section) {
      const text = section.innerText;
      const ratingM = text.match(/(\d+[,.]\d+)\s*stelle\s*su\s*5/i) ||
                      text.match(/(\d+[,.]\d+)\s*out\s*of\s*5\s*stars?/i) ||
                      text.match(/valutazione\s+di\s+(\d+[,.]\d+)/i) ||
                      text.match(/rated\s+(\d+[,.]\d+)/i) ||
                      text.match(/(\d+[,.]\d+)\s*stars?/i);
      const countM  = text.match(/(\d[\d,]*)\s*recensioni/i) ||
                      text.match(/(\d[\d,]*)\s*reviews?/i);
      return {
        rating: ratingM ? ratingM[1].replace(",", ".") : null,
        count:  countM  ? parseInt(countM[1])           : null,
      };
    }
    return { rating: null, count: null };
  }

  function getCity() {
    // OVERVIEW_DEFAULT_V2 starts with something like "Italy. Entire home: house" — grab before the dot.
    const section = document.querySelector('[data-section-id="OVERVIEW_DEFAULT_V2"]');
    if (section) {
      const firstLine = section.innerText.trim().split("\n")[0];
      const m = firstLine.match(/^([^.]+)\./);
      if (m) return m[1].trim();
    }
    const breadcrumb = document.querySelector('nav[aria-label*="breadcrumb"]');
    if (breadcrumb) {
      return breadcrumb.innerText.trim().replace(/\n+/g, " › ").slice(0, 80);
    }
    return null;
  }

  function getCoordinates() {
    // Airbnb hides coordinates in inline script tags like Easter eggs.
    // We dig through all of them until we find a valid lat/lng pair.
    const scripts = [...document.querySelectorAll("script")];
    const patterns = [
      /"lat"\s*:\s*(-?\d{1,3}\.\d+)[^{}\]]{0,60}"lng"\s*:\s*(-?\d{1,3}\.\d+)/,
      /"latitude"\s*:\s*(-?\d{1,3}\.\d+)[^{}\]]{0,60}"longitude"\s*:\s*(-?\d{1,3}\.\d+)/,
      /"_lat"\s*:\s*(-?\d{1,3}\.\d+)[^{}\]]{0,60}"_lng"\s*:\s*(-?\d{1,3}\.\d+)/,
    ];
    for (const script of scripts) {
      const text = script.textContent || "";
      if (text.length < 50) continue;
      for (const pat of patterns) {
        const m = text.match(pat);
        if (m) {
          const lat = parseFloat(m[1]);
          const lng = parseFloat(m[2]);
          if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
              && !(lat === 0 && lng === 0)) {
            return { lat, lng };
          }
        }
      }
    }
    return null;
  }

  function getDescription() {
    const section = document.querySelector('[data-section-id="DESCRIPTION_DEFAULT"]');
    if (!section) return null;
    const candidates = [...section.querySelectorAll("p, span, div")];
    for (const el of candidates) {
      if (el.closest("h1, h2, h3, h4")) continue;
      if (el.children.length > 0) continue;
      const text = el.innerText?.trim() || "";
      if (text.length > 40) return text.slice(0, 500);
    }
    const full = section.innerText.trim();
    return full.length > 10 ? full.slice(0, 500) : null;
  }

  function getLocation() {
    const section = document.querySelector('[data-section-id="LOCATION_DEFAULT"]');
    if (section) {
      const candidates = [...section.querySelectorAll("p, span, div")];
      for (const el of candidates) {
        if (el.closest("h2, h3, figure, canvas, [aria-label*='mappa'], [aria-label*='map']")) continue;
        if (el.children.length > 0) continue;
        const text = el.innerText?.trim() || "";
        if (text.length > 15 &&
            !/^dove sarai$/i.test(text) &&
            !/^where you'll be$/i.test(text)) {
          return text.slice(0, 250);
        }
      }
    }
    const breadcrumb = document.querySelector('nav[aria-label*="breadcrumb"]');
    if (breadcrumb) {
      const text = breadcrumb.innerText.trim().replace(/\n+/g, " › ");
      if (text.length > 3) return text;
    }
    return "(location not found)";
  }

  function getPhotos() {
    // Skip avatars, icons, and thumbnails. We want actual room photos.
    const imgs = [];
    const allImgs = [...document.querySelectorAll('img[src*="muscache.com"], img[src*="airbnb.com"]')];
    for (const img of allImgs) {
      let src = img.src;
      if (img.naturalWidth < 100 || img.naturalHeight < 100) continue;
      if (src.includes("profile") || src.includes("avatar") || src.includes("user")) continue;
      if (src.includes("AirbnbPlatformAssets") || src.includes("search-bar") || src.includes("icons")) continue;
      src = src.replace(/im_w=\d+/, "im_w=720");
      if (!imgs.includes(src)) imgs.push(src);
      if (imgs.length >= 3) break;
    }
    return imgs;
  }

  const { price, checkIn, checkOut, nights } = getPriceAndDates();

  return {
    url:         window.location.href,
    lang:        document.documentElement.lang || "en",
    title:       getTitle(),
    price,
    checkIn,
    checkOut,
    nights,
    host:        getHost(),
    amenities:   getAmenities(),
    reviews:     getReviews(),
    city:        getCity(),
    description: getDescription(),
    location:    getLocation(),
    photos:      getPhotos(),
    coords:      getCoordinates(),
  };
})();
