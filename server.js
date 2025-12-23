const express = require("express");
const path = require("path");
const axios = require("axios");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// 1) Health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 2) Random user endpoint
app.get("/api/random-user", async (req, res) => {
  try {
    const response = await axios.get("https://randomuser.me/api/");
    const u = response.data.results[0];

    const firstName = u.name.first;
    const lastName = u.name.last;
    const gender = u.gender;
    const picture = u.picture.large;
    const age = u.dob.age;

    // Сделаем дату рождения красивой (YYYY-MM-DD)
    const dateOfBirth = new Date(u.dob.date).toISOString().slice(0, 10);

    const city = u.location.city;
    const country = u.location.country;
    const streetName = u.location.street.name;
    const streetNumber = u.location.street.number;
    const fullAddress = `${streetNumber} ${streetName}`;

    res.json({
      firstName,
      lastName,
      gender,
      picture,
      age,
      dateOfBirth,
      city,
      country,
      fullAddress,
    });
  } catch (err) {
    // Чтобы реально понимать ошибку, логнем в консоль
    console.error("RandomUser API error:", err.message);
    res.status(500).json({ error: "Failed to fetch random user" });
  }
});

// 3) Country info endpoint (CountryLayer)
app.get("/api/country-info", async (req, res) => {
  try {
    const countryName = req.query.country;
    if (!countryName) {
      return res
        .status(400)
        .json({ error: "Query param 'country' is required" });
    }

    const key = process.env.COUNTRYLAYER_KEY;
    if (!key) {
      return res
        .status(500)
        .json({ error: "COUNTRYLAYER_KEY is missing in .env" });
    }

    // CountryLayer endpoint: /v2/name/{name}?access_key=KEY
    const url =
      "http://api.countrylayer.com/v2/name/" +
      encodeURIComponent(countryName) +
      "?access_key=" +
      encodeURIComponent(key);

    const response = await axios.get(url);

    // CountryLayer возвращает массив стран
    const c = Array.isArray(response.data) ? response.data[0] : null;
    if (!c) {
      return res.status(404).json({ error: "Country not found" });
    }

    const capital = c.capital || "";
    const flag = c.flag || "";

    // currencies -> массив объектов, берем имена + коды
    let currency = "";
    if (Array.isArray(c.currencies) && c.currencies.length > 0) {
      currency = c.currencies
        .map((x) => {
          const name = x.name || "";
          const code = x.code || "";
          return (name + (code ? ` (${code})` : "")).trim();
        })
        .filter(Boolean)
        .join(", ");
    }

    // languages -> массив объектов, берем names
    let languages = "";
    if (Array.isArray(c.languages) && c.languages.length > 0) {
      languages = c.languages
        .map((x) => x.name)
        .filter(Boolean)
        .join(", ");
    }

    res.json({
      country: c.name || countryName,
      capital,
      currency,
      languages,
      flag,
    });
  } catch (err) {
    console.error("CountryLayer API error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch country info" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});
