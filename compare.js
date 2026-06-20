// Developer Comparison Logic
document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const user1Input = document.getElementById("user1-input");
  const user2Input = document.getElementById("user2-input");
  const btnCompare = document.getElementById("btn-compare");
  const compareError = document.getElementById("compare-error");
  const compareLoading = document.getElementById("compare-loading");
  const compareResults = document.getElementById("compare-results");
  const compareApiError = document.getElementById("compare-api-error");
  const themeToggleBtn = document.getElementById("theme-toggle-btn");

  // --- Theme Toggle (Reuse from main dashboard) ---
  const savedTheme = localStorage.getItem("dashboard_theme") || "dark";
  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "light" ? "dark" : "light";
      applyTheme(newTheme);
      localStorage.setItem("dashboard_theme", newTheme);
    });
  }

  function applyTheme(themeName) {
    document.documentElement.setAttribute("data-theme", themeName);
    if (themeToggleBtn) {
      themeToggleBtn.textContent =
        themeName === "light" ? "🌙 Dark Mode" : "☀️ Light Mode";
    }
  }

  // --- URL Parameters Support ---
  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      user1: params.get("user1"),
      user2: params.get("user2"),
    };
  }

  const urlParams = getUrlParams();
  if (urlParams.user1) {
    if (user1Input) user1Input.value = urlParams.user1;
    if (urlParams.user2) {
      if (user2Input) user2Input.value = urlParams.user2;
      compareUsers(urlParams.user1, urlParams.user2);
    } else {
      // Auto-focus User 2 input when only User 1 is pre-filled
      if (user2Input) user2Input.focus();
    }
  }

  // --- Event Listeners ---
  if (btnCompare) {
    btnCompare.addEventListener("click", () => {
      const username1 = user1Input ? user1Input.value.trim() : "";
      const username2 = user2Input ? user2Input.value.trim() : "";

      if (!username1 || !username2) {
        showCompareError("Both usernames are required.");
        return;
      }

      clearCompareError();
      compareUsers(username1, username2);
    });
  }

  // Allow Enter key to trigger comparison
  if (user1Input && user2Input) {
    [user1Input, user2Input].forEach((input) => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && btnCompare) {
          btnCompare.click();
        }
      });
    });
  }

  // --- Helper Functions ---

  function showCompareError(message) {
    if (compareError) {
      compareError.textContent = message;
      compareError.classList.remove("hidden");
    }
  }

  function clearCompareError() {
    if (compareError) {
      compareError.textContent = "";
      compareError.classList.add("hidden");
    }
  }

  function formatNumber(num) {
    if (num === undefined || num === null) return "0";
    return num >= 1000 ? (num / 1000).toFixed(1) + "k" : num;
  }

  function formatDate(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatDateShort(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // --- Core Comparison Function ---

  async function compareUsers(username1, username2) {
    // Hide previous results and errors
    if (compareResults) compareResults.classList.add("hidden");
    if (compareApiError) compareApiError.classList.add("hidden");
    clearCompareError();

    // Show loading
    if (compareLoading) compareLoading.classList.remove("hidden");

    try {
      const user1Url = `https://api.github.com/users/${username1}`;
      const user2Url = `https://api.github.com/users/${username2}`;
      const repos1Url = `https://api.github.com/users/${username1}/repos?per_page=100`;
      const repos2Url = `https://api.github.com/users/${username2}/repos?per_page=100`;

      // Fetch both users and their repos in parallel
      const [user1Response, user2Response, repos1Response, repos2Response] = await Promise.all([
        fetch(user1Url),
        fetch(user2Url),
        fetch(repos1Url),
        fetch(repos2Url),
      ]);

      // Check if both users exist
      if (!user1Response.ok || !user2Response.ok) {
        throw new Error("One or both users not found");
      }

      const user1Data = await user1Response.json();
      const user2Data = await user2Response.json();
      const repos1Data = await repos1Response.json();
      const repos2Data = await repos2Response.json();

      // Update URL parameters without reloading
      const newUrl = `compare.html?user1=${username1}&user2=${username2}`;
      window.history.pushState({ user1: username1, user2: username2 }, "", newUrl);

      // Render all comparison sections
      renderProfileComparison(user1Data, user2Data);
      renderMetricWinners(user1Data, user2Data);
      renderRepositoryAnalytics(user1Data, user2Data, repos1Data, repos2Data);
      renderPopularityComparison(user1Data, user2Data, repos1Data, repos2Data);
      renderTopRepoComparison(repos1Data, repos2Data);
      renderTop5Repositories(repos1Data, repos2Data);
      renderOverallWinner(user1Data, user2Data, repos1Data, repos2Data);

      // Hide loading, show results
      if (compareLoading) compareLoading.classList.add("hidden");
      if (compareResults) compareResults.classList.remove("hidden");
    } catch (error) {
      if (compareLoading) compareLoading.classList.add("hidden");
      if (compareApiError) compareApiError.classList.remove("hidden");
      console.error("[Compare Error]", error.message);
    }
  }

  // --- 1. Profile Comparison ---

  function renderProfileComparison(user1, user2) {
    // User 1
    setText("user1-name", user1.name || user1.login);
    setText("user1-username", `@${user1.login}`);
    setText("user1-bio", user1.bio || "No bio available.");
    setImage("user1-avatar", user1.avatar_url, `${user1.login}'s avatar`);
    setText("user1-followers", formatNumber(user1.followers));
    setText("user1-following", formatNumber(user1.following));
    setText("user1-public-repos", user1.public_repos);
    setText("user1-public-gists", user1.public_gists);
    setText("user1-location", user1.location || "Not Specified");
    setText("user1-created", formatDate(user1.created_at));

    // User 2
    setText("user2-name", user2.name || user2.login);
    setText("user2-username", `@${user2.login}`);
    setText("user2-bio", user2.bio || "No bio available.");
    setImage("user2-avatar", user2.avatar_url, `${user2.login}'s avatar`);
    setText("user2-followers", formatNumber(user2.followers));
    setText("user2-following", formatNumber(user2.following));
    setText("user2-public-repos", user2.public_repos);
    setText("user2-public-gists", user2.public_gists);
    setText("user2-location", user2.location || "Not Specified");
    setText("user2-created", formatDate(user2.created_at));
  }

  // --- 2. Metric Winners ---

  function renderMetricWinners(user1, user2) {
    const winnersGrid = document.getElementById("winners-grid");
    if (!winnersGrid) return;

    const metrics = [
      { label: "Followers", value1: user1.followers, value2: user2.followers, unit: "" },
      { label: "Public Repositories", value1: user1.public_repos, value2: user2.public_repos, unit: "" },
      { label: "Public Gists", value1: user1.public_gists, value2: user2.public_gists, unit: "" },
    ];

    winnersGrid.innerHTML = "";

    metrics.forEach((metric) => {
      const card = document.createElement("div");
      card.className = "winner-card";

      let winnerUser = "";
      let trophy = "";
      let detail = "";

      if (metric.value1 > metric.value2) {
        winnerUser = (user1.name || user1.login) + " wins";
        trophy = "🏆";
        card.classList.add("winner-highlight");
        detail = `${formatNumber(metric.value1)} ${metric.unit} vs ${formatNumber(metric.value2)} ${metric.unit}`;
      } else if (metric.value2 > metric.value1) {
        winnerUser = (user2.name || user2.login) + " wins";
        trophy = "🏆";
        card.classList.add("winner-highlight");
        detail = `${formatNumber(metric.value2)} ${metric.unit} vs ${formatNumber(metric.value1)} ${metric.unit}`;
      } else {
        winnerUser = "Draw";
        trophy = "🤝";
        card.classList.add("winner-draw");
        detail = `Both have ${formatNumber(metric.value1)} ${metric.unit}`;
      }

      card.innerHTML = `
        <div class="winner-metric">${metric.label}</div>
        <div class="winner-trophy">${trophy}</div>
        <div class="winner-user">${winnerUser}</div>
        <div class="winner-detail">${detail}</div>
      `;

      winnersGrid.appendChild(card);
    });
  }

  // --- 3. Repository Analytics ---

  function renderRepositoryAnalytics(user1, user2, repos1, repos2) {
    const analytics1 = calculateRepoAnalytics(repos1);
    const analytics2 = calculateRepoAnalytics(repos2);

    const u1Name = user1.name || user1.login;
    const u2Name = user2.name || user2.login;

    setText("user1-analytics-name", `${u1Name}'s Analytics`);
    setText("user2-analytics-name", `${u2Name}'s Analytics`);

    // User 1 Analytics
    setText("user1-total-stars", formatNumber(analytics1.totalStars));
    setText("user1-total-repos", analytics1.totalRepos);
    setText("user1-top-repo", analytics1.topRepoName || "No repos");
    setText("user1-avg-stars", analytics1.avgStars.toFixed(1));

    // User 2 Analytics
    setText("user2-total-stars", formatNumber(analytics2.totalStars));
    setText("user2-total-repos", analytics2.totalRepos);
    setText("user2-top-repo", analytics2.topRepoName || "No repos");
    setText("user2-avg-stars", analytics2.avgStars.toFixed(1));
  }

  function calculateRepoAnalytics(repos) {
    if (!repos || repos.length === 0) {
      return {
        totalStars: 0,
        totalRepos: 0,
        avgStars: 0,
        topRepoName: "No repos",
        topRepoStars: 0,
        topRepoUrl: "#",
      };
    }

    const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    const totalRepos = repos.length;
    const avgStars = totalRepos > 0 ? totalStars / totalRepos : 0;

    const sorted = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count);
    const topRepo = sorted[0];

    return {
      totalStars,
      totalRepos,
      avgStars,
      topRepoName: topRepo ? topRepo.name : "No repos",
      topRepoStars: topRepo ? topRepo.stargazers_count : 0,
      topRepoUrl: topRepo ? topRepo.html_url : "#",
    };
  }

  // --- 4. Repository Popularity Comparison ---

  function renderPopularityComparison(user1, user2, repos1, repos2) {
    const analytics1 = calculateRepoAnalytics(repos1);
    const analytics2 = calculateRepoAnalytics(repos2);

    const u1Name = user1.name || user1.login;
    const u2Name = user2.name || user2.login;

    setText("user1-pop-name", u1Name);
    setText("user2-pop-name", u2Name);
    setText("user1-pop-stars", formatNumber(analytics1.totalStars));
    setText("user2-pop-stars", formatNumber(analytics2.totalStars));

    const winnerDiv = document.getElementById("popularity-winner");
    if (!winnerDiv) return;

    if (analytics1.totalStars > analytics2.totalStars) {
      winnerDiv.innerHTML = `🏆 Repository Popularity Winner: <strong>${u1Name}</strong> (${formatNumber(analytics1.totalStars)} stars)`;
    } else if (analytics2.totalStars > analytics1.totalStars) {
      winnerDiv.innerHTML = `🏆 Repository Popularity Winner: <strong>${u2Name}</strong> (${formatNumber(analytics2.totalStars)} stars)`;
    } else {
      winnerDiv.innerHTML = `🤝 It's a draw! Both have ${formatNumber(analytics1.totalStars)} stars.`;
    }
  }

  // --- 5. Most Popular Repository Comparison ---

  function renderTopRepoComparison(repos1, repos2) {
    const analytics1 = calculateRepoAnalytics(repos1);
    const analytics2 = calculateRepoAnalytics(repos2);

    const sorted1 = [...(repos1 || [])].sort((a, b) => b.stargazers_count - a.stargazers_count);
    const sorted2 = [...(repos2 || [])].sort((a, b) => b.stargazers_count - a.stargazers_count);

    const top1 = sorted1[0];
    const top2 = sorted2[0];

    // User 1 Top Repo
    const user1Details = document.getElementById("user1-top-repo-details");
    setText("user1-top-repo-name", top1 ? `${top1.name}` : "No repositories");
    if (user1Details && top1) {
      user1Details.innerHTML = `
        <div class="repo-stat-row">
          <span class="repo-stat-label">⭐ Stars</span>
          <span class="repo-stat-value">${top1.stargazers_count}</span>
        </div>
        <a href="${top1.html_url}" target="_blank" class="top-repo-link">View Repository</a>
      `;
    }

    // User 2 Top Repo
    const user2Details = document.getElementById("user2-top-repo-details");
    setText("user2-top-repo-name", top2 ? `${top2.name}` : "No repositories");
    if (user2Details && top2) {
      user2Details.innerHTML = `
        <div class="repo-stat-row">
          <span class="repo-stat-label">⭐ Stars</span>
          <span class="repo-stat-value">${top2.stargazers_count}</span>
        </div>
        <a href="${top2.html_url}" target="_blank" class="top-repo-link">View Repository</a>
      `;
    }

    // Winner
    const winnerDiv = document.getElementById("top-repo-winner");
    if (!winnerDiv) return;

    const u1Stars = top1 ? top1.stargazers_count : 0;
    const u2Stars = top2 ? top2.stargazers_count : 0;

    if (u1Stars > u2Stars) {
      winnerDiv.innerHTML = `🏆 Most Popular Repo: <strong>${top1.name}</strong> with ${top1.stargazers_count} stars`;
    } else if (u2Stars > u1Stars) {
      winnerDiv.innerHTML = `🏆 Most Popular Repo: <strong>${top2.name}</strong> with ${top2.stargazers_count} stars`;
    } else if (u1Stars === u2Stars && u1Stars > 0) {
      winnerDiv.innerHTML = `🤝 Both repositories have ${u1Stars} stars. It's a tie!`;
    } else {
      winnerDiv.innerHTML = "No repositories to compare.";
    }
  }

  // --- 6. Top 5 Repositories ---

  function renderTop5Repositories(repos1, repos2) {
    const list1 = document.getElementById("user1-top5-list");
    const list2 = document.getElementById("user2-top5-list");
    const label1 = document.getElementById("user1-top5-label");
    const label2 = document.getElementById("user2-top5-label");

    if (!list1 || !list2) return;

    const sorted1 = [...(repos1 || [])].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 5);
    const sorted2 = [...(repos2 || [])].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 5);

    if (label1) label1.textContent = `Top 5 Repos (${repos1 ? repos1.length : 0} total)`;
    if (label2) label2.textContent = `Top 5 Repos (${repos2 ? repos2.length : 0} total)`;

    list1.innerHTML = "";
    list2.innerHTML = "";

    sorted1.forEach((repo) => {
      list1.appendChild(createTop5Card(repo));
    });

    sorted2.forEach((repo) => {
      list2.appendChild(createTop5Card(repo));
    });

    // If no repos found, show placeholder
    if (sorted1.length === 0) {
      list1.innerHTML = '<p class="repo-desc" style="text-align:center;">No repositories available.</p>';
    }
    if (sorted2.length === 0) {
      list2.innerHTML = '<p class="repo-desc" style="text-align:center;">No repositories available.</p>';
    }
  }

  function createTop5Card(repo) {
    const card = document.createElement("div");
    card.className = "top5-repo-card";

    const langClass = repo.language
      ? repo.language.toLowerCase().replace("#", "sharp").replace("++", "plusplus")
      : "markdown";

    card.innerHTML = `
      <div class="top5-repo-header">
        <a href="${repo.html_url}" target="_blank" class="top5-repo-name">${repo.name}</a>
        <span class="top5-repo-stars">⭐ ${repo.stargazers_count}</span>
      </div>
      <div class="top5-repo-desc">${repo.description || "No description provided."}</div>
      <div class="top5-repo-meta">
        <span class="top5-repo-lang">
          <span class="lang-color ${langClass}"></span>
          ${repo.language || "Markdown"}
        </span>
        <span>🍴 ${repo.forks_count}</span>
        <span>📅 ${formatDateShort(repo.updated_at)}</span>
      </div>
      <a href="${repo.html_url}" target="_blank" class="top5-repo-link">View Repository</a>
    `;

    return card;
  }

  // --- 7. Overall Winner with Advanced Score ---

  function renderOverallWinner(user1, user2, repos1, repos2) {
    const analytics1 = calculateRepoAnalytics(repos1);
    const analytics2 = calculateRepoAnalytics(repos2);

    // Score = Followers × 1 + Repositories × 5 + Public Gists × 2 + Total Stars × 10
    const score1 =
      user1.followers * 1 +
      user1.public_repos * 5 +
      user1.public_gists * 2 +
      analytics1.totalStars * 10;

    const score2 =
      user2.followers * 1 +
      user2.public_repos * 5 +
      user2.public_gists * 2 +
      analytics2.totalStars * 10;

    const winnerDiv = document.getElementById("overall-winner-content");
    if (!winnerDiv) return;

    const u1Name = user1.name || user1.login;
    const u2Name = user2.name || user2.login;

    if (score1 > score2) {
      winnerDiv.innerHTML = `
        <div class="winner-name">${u1Name} 🏆</div>
        <div class="winner-score">Score: ${score1.toLocaleString()}</div>
        <div class="winner-details">${u2Name}: ${score2.toLocaleString()} points</div>
        <div class="winner-details">Difference: ${(score1 - score2).toLocaleString()} points</div>
      `;
    } else if (score2 > score1) {
      winnerDiv.innerHTML = `
        <div class="winner-name">${u2Name} 🏆</div>
        <div class="winner-score">Score: ${score2.toLocaleString()}</div>
        <div class="winner-details">${u1Name}: ${score1.toLocaleString()} points</div>
        <div class="winner-details">Difference: ${(score2 - score1).toLocaleString()} points</div>
      `;
    } else {
      winnerDiv.innerHTML = `
        <div class="winner-name">🤝 It's a Draw!</div>
        <div class="winner-score">Both scored ${score1.toLocaleString()} points</div>
      `;
    }
  }

  // --- Utility: Set text content safely ---

  function setText(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = text;
    }
  }

  function setImage(elementId, src, alt) {
    const el = document.getElementById(elementId);
    if (el) {
      el.src = src || "";
      el.alt = alt || "";
    }
  }
});
