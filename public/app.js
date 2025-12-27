const btn = document.getElementById("btnLoad");
const statusEl = document.getElementById("status");
const errorEl = document.getElementById("error");

const userCard = document.getElementById("userCard");
const countryCard = document.getElementById("countryCard");
const exchangeCard = document.getElementById("exchangeCard");
const newsGrid = document.getElementById("newsGrid");

function setStatus(text) {
  statusEl.textContent = text || "";
}

function showError(text) {
  if (!text) {
    errorEl.classList.add("hidden");
    errorEl.textContent = "";
    return;
  }
  errorEl.classList.remove("hidden");
  errorEl.textContent = text;
}

function safe(v, fallback = "—") {
  return v === null || v === undefined || v === "" ? fallback : v;
}

function renderUser(u) {
  userCard.innerHTML = `
    <h2>User</h2>
    <div class="userRow">
      <img class="avatar" src="${safe(u.picture, "")}" alt="User photo" />
      <div class="kv">
        <div><span>First name:</span> ${safe(u.firstName)}</div>
        <div><span>Last name:</span> ${safe(u.lastName)}</div>
        <div><span>Gender:</span> ${safe(u.gender)}</div>
        <div><span>Age:</span> ${safe(u.age)}</div>
        <div><span>Date of birth:</span> ${safe(u.dateOfBirth)}</div>
        <div><span>City:</span> ${safe(u.city)}</div>
        <div><span>Country:</span> ${safe(u.country)}</div>
        <div><span>Address:</span> ${safe(u.fullAddress)}</div>
      </div>
    </div>
  `;
}

function renderCountry(c) {
  const langs = Array.isArray(c.languages) && c.languages.length ? c.languages.join(", ") : "—";
  const note = c.ok ? "" : `<div class="note">⚠ ${safe(c.message)}</div>`;

  countryCard.innerHTML = `
    <h2>Country</h2>
    ${note}
    <div class="countryRow">
      <div class="kv">
        <div><span>Country name:</span> ${safe(c.name)}</div>
        <div><span>Capital:</span> ${safe(c.capital)}</div>
        <div><span>Official language(s):</span> ${langs}</div>
        <div><span>Currency:</span> ${safe(c.currencyCode)}</div>
      </div>
      ${c.flag ? `<img class="flag" src="${c.flag}" alt="Flag" />` : ""}
    </div>
  `;
}

function renderExchange(x) {
  const note = x.ok ? "" : `<div class="note">⚠ ${safe(x.message)}</div>`;

  function fmt(n) {
    if (typeof n !== "number") return "—";
    return n.toFixed(2);
  }

  exchangeCard.innerHTML = `
    <h2>Exchange Rates</h2>
    ${note}
    <div class="kv">
      <div><span>Base currency:</span> ${safe(x.base)}</div>
      <div><span>1 ${safe(x.base)} =</span> ${fmt(x.usd)} USD</div>
      <div><span>1 ${safe(x.base)} =</span> ${fmt(x.kzt)} KZT</div>
      <div class="small"><span>Provider:</span> ${safe(x.provider)}</div>
      <div class="small"><span>Updated:</span> ${safe(x.updatedUTC)}</div>
    </div>
  `;
}

function renderNews(news) {
  const note = news.ok ? "" : `<div class="note">⚠ ${safe(news.message)}</div>`;
  const list = Array.isArray(news.articles) ? news.articles : [];

  if (list.length === 0) {
    newsGrid.innerHTML = `${note}<div class="empty">No articles found for: ${safe(news.country)}</div>`;
    return;
  }

  newsGrid.innerHTML =
    note +
    list
      .map((a) => {
        const img = a.image
          ? `<img class="newsImg" src="${a.image}" alt="news image" />`
          : `<div class="newsImg placeholder">No image</div>`;

        const desc = a.description ? a.description : "—";
        const src = a.source ? a.source : "Unknown";

        return `
        <article class="newsCard">
          ${img}
          <div class="newsBody">
            <h3 class="newsTitle">${safe(a.title)}</h3>
            <p class="newsDesc">${desc}</p>
            <div class="newsFooter">
              <span class="source">${src}</span>
              ${a.url ? `<a class="link" href="${a.url}" target="_blank" rel="noopener noreferrer">Open</a>` : ""}
            </div>
          </div>
        </article>
      `;
      })
      .join("");
}

async function loadProfile() {
  showError("");
  setStatus("Loading...");
  btn.disabled = true;

  userCard.innerHTML = `<div class="skeleton">Loading user...</div>`;
  countryCard.innerHTML = `<div class="skeleton">Loading country...</div>`;
  exchangeCard.innerHTML = `<div class="skeleton">Loading exchange...</div>`;
  newsGrid.innerHTML = `<div class="skeleton">Loading news...</div>`;

  try {
    const res = await fetch("/api/profile");
    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Server error");
    }

    renderUser(data.user);
    renderCountry(data.country);
    renderExchange(data.exchange);
    renderNews(data.news);

    setStatus("Done ✅");
  } catch (err) {
    showError(err.message);
    setStatus("Failed ❌");
    userCard.innerHTML = "";
    countryCard.innerHTML = "";
    exchangeCard.innerHTML = "";
    newsGrid.innerHTML = "";
  } finally {
    btn.disabled = false;
    setTimeout(() => setStatus(""), 2500);
  }
}

btn.addEventListener("click", loadProfile);
