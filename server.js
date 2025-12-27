console.log("SERVER FILE LOADED");

const express = require("express");
const axios = require("axios");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// ---------- helpers ----------
function pickFirst(arr) {
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
}

function normalizeText(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

// ---------- API fetchers ----------
async function fetchRandomUser() {
  const url = "https://randomuser.me/api/";
  const { data } = await axios.get(url, { timeout: 15000 });

  const u = data?.results?.[0];
  if (!u) throw new Error("RandomUser: empty response");

  const streetNumber = u?.location?.street?.number;
  const streetName = u?.location?.street?.name;

  const address = [streetNumber, streetName]
    .filter((x) => x !== undefined && x !== null)
    .join(" ");

  const dobISO = u?.dob?.date;
  const dobDate = dobISO ? new Date(dobISO) : null;

  return {
    firstName: normalizeText(u?.name?.first),
    lastName: normalizeText(u?.name?.last),
    gender: normalizeText(u?.gender),
    picture:
      normalizeText(u?.picture?.large) ||
      normalizeText(u?.picture?.medium) ||
      normalizeText(u?.picture?.thumbnail),
    age: u?.dob?.age ?? null,
    dateOfBirth: dobDate ? dobDate.toISOString().slice(0, 10) : null,
    city: normalizeText(u?.location?.city),
    country: normalizeText(u?.location?.country),
    fullAddress: normalizeText(address) || null,
  };
}

async function fetchCountryInfo(countryName) {
  const key = process.env.COUNTRYLAYER_API_KEY;

  if (!key) {
    return {
      ok: false,
      message: "COUNTRYLAYER_API_KEY is missing in .env",
      name: countryName || null,
      capital: null,
      languages: [],
      currencyCode: null,
      flag: null,
    };
  }

  if (!countryName) {
    return {
      ok: false,
      message: "Country is missing from RandomUser response",
      name: null,
      capital: null,
      languages: [],
      currencyCode: null,
      flag: null,
    };
  }

  const url = `https://api.countrylayer.com/v2/name/${encodeURIComponent(
    countryName
  )}`;

  try {
    const { data } = await axios.get(url, {
      timeout: 15000,
      params: { access_key: key, fullText: true },
    });

    const c = pickFirst(data);

    const languageNames = (c?.languages || [])
      .map((l) => normalizeText(l?.name))
      .filter(Boolean);

    const currencyCode =
      normalizeText(c?.currencies?.[0]?.code) ||
      normalizeText(c?.currencies?.[0]?.name) ||
      null;

    const flag =
      normalizeText(c?.flag) ||
      normalizeText(c?.flags?.png) ||
      normalizeText(c?.flags?.svg) ||
      null;

    return {
      ok: true,
      message: null,
      name: normalizeText(c?.name) || countryName,
      capital: normalizeText(c?.capital),
      languages: languageNames,
      currencyCode,
      flag,
    };
  } catch (err) {
    return {
      ok: false,
      message: `Countrylayer error: ${
        err?.response?.data?.message || err.message
      }`,
      name: countryName,
      capital: null,
      languages: [],
      currencyCode: null,
      flag: null,
    };
  }
}

async function fetchExchange(baseCurrency) {
  if (!baseCurrency) {
    return {
      ok: false,
      message: "No currency code found for this country",
      base: null,
      usd: null,
      kzt: null,
      updatedUTC: null,
      provider: null,
    };
  }

  const key = process.env.EXCHANGE_API_KEY;

  const keyedUrl = key
    ? `https://v6.exchangerate-api.com/v6/${encodeURIComponent(
        key
      )}/latest/${encodeURIComponent(baseCurrency)}`
    : null;

  const fallbackUrl = `https://open.er-api.com/v6/latest/${encodeURIComponent(
    baseCurrency
  )}`;

  try {
    const { data } = await axios.get(keyedUrl || fallbackUrl, {
      timeout: 15000,
    });

    const rates = data?.conversion_rates || data?.rates;
    if (!rates) throw new Error("ExchangeRate: missing rates");

    return {
      ok: true,
      message: null,
      base: baseCurrency,
      usd: typeof rates.USD === "number" ? rates.USD : null,
      kzt: typeof rates.KZT === "number" ? rates.KZT : null,
      updatedUTC: normalizeText(data?.time_last_update_utc) || null,
      provider: keyedUrl
        ? "exchangerate-api.com (keyed)"
        : "open.er-api.com (fallback)",
    };
  } catch (err) {
    return {
      ok: false,
      message: `ExchangeRate error: ${
        err?.response?.data?.["error-type"] || err.message
      }`,
      base: baseCurrency,
      usd: null,
      kzt: null,
      updatedUTC: null,
      provider: key
        ? "exchangerate-api.com (keyed)"
        : "open.er-api.com (fallback)",
    };
  }
}

async function fetchNews(countryName) {
  const key = process.env.NEWS_API_KEY;

  if (!key) {
    return {
      ok: false,
      message: "NEWS_API_KEY is missing in .env",
      country: countryName || null,
      articles: [],
    };
  }

  if (!countryName) {
    return {
      ok: false,
      message: "Country is missing from RandomUser response",
      country: null,
      articles: [],
    };
  }

  const url = "https://newsapi.org/v2/everything";

  try {
    const { data } = await axios.get(url, {
      timeout: 15000,
      params: {
        qInTitle: countryName,
        language: "en",
        pageSize: 15,
        sortBy: "publishedAt",
      },
      headers: { "X-Api-Key": key },
    });

    const list = Array.isArray(data?.articles) ? data.articles : [];
    const countryLower = countryName.toLowerCase();

    const filtered = list.filter((a) =>
      (a?.title || "").toLowerCase().includes(countryLower)
    );

    const top5 = filtered.slice(0, 5);

    const cleaned = top5.map((a) => ({
      title: normalizeText(a?.title),
      image: normalizeText(a?.urlToImage),
      description: normalizeText(a?.description),
      url: normalizeText(a?.url),
      source: normalizeText(a?.source?.name),
    }));

    return { ok: true, message: null, country: countryName, articles: cleaned };
  } catch (err) {
    return {
      ok: false,
      message: `NewsAPI error: ${err?.response?.data?.message || err.message}`,
      country: countryName,
      articles: [],
    };
  }
}

// ---------- routes ----------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

async function profileHandler(req, res) {
  try {
    const user = await fetchRandomUser();
    const country = await fetchCountryInfo(user.country);
    const exchange = await fetchExchange(country.currencyCode);
    const news = await fetchNews(user.country);

    res.json({
      ok: true,
      user,
      country,
      exchange,
      news,
      meta: { generatedAt: new Date().toISOString() },
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}

// ВАЖНО: оба пути работают (чтобы не было 404)
app.get("/api/profile", profileHandler);
app.get("/api/user-info", profileHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
