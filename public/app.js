const out = document.getElementById("out");
const btnHealth = document.getElementById("btnHealth");
const btnUser = document.getElementById("btnUser");

const userCard = document.getElementById("userCard");
const countryCard = document.getElementById("countryCard");

function showJson(obj) {
  out.textContent = JSON.stringify(obj, null, 2);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderUser(u) {
  userCard.classList.remove("hidden");
  userCard.innerHTML = `
    <div class="user">
      <img class="avatar" src="${escapeHtml(u.picture)}" alt="Profile"/>
      <div class="userInfo">
        <h2>${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)}</h2>
        <p><b>Gender:</b> ${escapeHtml(u.gender)}</p>
        <p><b>Age:</b> ${escapeHtml(u.age)}</p>
        <p><b>Date of birth:</b> ${escapeHtml(u.dateOfBirth)}</p>
        <p><b>City:</b> ${escapeHtml(u.city)}</p>
        <p><b>Country:</b> ${escapeHtml(u.country)}</p>
        <p><b>Full address:</b> ${escapeHtml(u.fullAddress)}</p>
      </div>
    </div>
  `;
}

function renderCountry(c) {
  countryCard.classList.remove("hidden");
  countryCard.innerHTML = `
    <h2>Country Info</h2>
    <p><b>Country:</b> ${escapeHtml(c.country)}</p>
    <p><b>Capital:</b> ${escapeHtml(c.capital)}</p>
    <p><b>Currency:</b> ${escapeHtml(c.currency)}</p>
    <p><b>Languages:</b> ${escapeHtml(c.languages)}</p>
    ${
      c.flag
        ? `<img class="flag" src="${escapeHtml(c.flag)}" alt="Flag"/>`
        : ""
    }
  `;
}

btnHealth.addEventListener("click", async () => {
  out.textContent = "Loading...";
  userCard.classList.add("hidden");
  countryCard.classList.add("hidden");

  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    showJson(data);
  } catch (err) {
    out.textContent = "Error: " + err.message;
  }
});

btnUser.addEventListener("click", async () => {
  out.textContent = "Loading random user...";
  userCard.classList.add("hidden");
  countryCard.classList.add("hidden");

  try {
    // 1) random user
    const resUser = await fetch("/api/random-user");
    const user = await resUser.json();

    if (!resUser.ok) {
      showJson(user);
      return;
    }

    renderUser(user);
    showJson(user);

    // 2) country info (by user.country)
    out.textContent = "Loading country info...";
    const resCountry = await fetch(
      "/api/country-info?country=" + encodeURIComponent(user.country)
    );
    const country = await resCountry.json();

    if (!resCountry.ok) {
      // покажем ошибку, но пользователя оставим
      showJson(country);
      return;
    }

    renderCountry(country);
    showJson({ user, country });
  } catch (err) {
    out.textContent = "Error: " + err.message;
  }
});
