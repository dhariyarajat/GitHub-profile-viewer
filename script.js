// Wait until the DOM is fully parsed and loaded
document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const inlineClearBtn = document.getElementById("inline-clear-btn");

  const themeToggleBtn = document.getElementById("theme-toggle-btn");

  const searchForm = document.getElementById("search-form");
  const usernameInput = document.getElementById("username-input");
  const errorMessage = document.getElementById("error-message");

  const loadingState = document.getElementById("loading-state");
  const apiErrorState = document.getElementById("api-error-state");
  const dashboardContent = document.getElementById("dashboard-content");

  // --- [UPDATED] Enhanced Profile Card UI Element Selectors ---
  const profileAvatar = document.getElementById("profile-avatar");
  const profileName = document.querySelector(".profile-name");
  const profileUsername = document.querySelector(".profile-username");
  const profileBio = document.querySelector(".profile-bio");
  const profileLocation = document.getElementById("profile-location");

  // New Text Element References
  const profileCompany = document.getElementById("profile-company");
  const profileBlog = document.getElementById("profile-blog");
  const profileEmail = document.getElementById("profile-email");
  const profileTwitter = document.getElementById("profile-twitter");
  const profileCreated = document.getElementById("profile-created");
  const btnViewGithub = document.getElementById("btn-view-github");

  // New Block Element Row Wrappers
  const metaCompany = document.getElementById("meta-company");
  const metaBlog = document.getElementById("meta-blog");
  const metaEmail = document.getElementById("meta-email");
  const metaTwitter = document.getElementById("meta-twitter");

  // --- Dynamic Metric Elements ---
  const statRepos = document.getElementById("stat-repos");
  const statFollowers = document.getElementById("stat-followers");
  const statFollowing = document.getElementById("stat-following");

  // --- [UPDATED] Dual-Section Repository Elements & Filter Configuration ---
  const popularReposContainer = document.getElementById(
    "popular-repos-container",
  );
  const allReposContainer = document.getElementById("all-repos-container");
  const popularCountBadge = document.getElementById("popular-count-badge");
  const allCountBadge = document.getElementById("all-count-badge");

  // Global array to cache raw repository payloads securely in memory.
  let cachedRepositoriesArray = [];

  const repoFilterInput = document.getElementById("repo-filter-input");
  // --- ADDED: Recent Searches Dynamic Container ---
  const recentTagsContainer = document.getElementById("recent-tags-container");

  // Global tracking variable to apply selected/active styling states across elements
  let activeSearchUser = "";

  // INITIALIZATION FLOW: Render history immediately upon page boot
  renderSearchHistory();
  // ADDED: Matches HTML input id

  // --- Form Event Listener ---
  if (searchForm) {
    searchForm.addEventListener("submit", (event) => {
      // Prevent the default browser form submission (page reload)
      event.preventDefault();

      // Retrieve and trim whitespace from the input value
      const username = usernameInput.value.trim();

      // 1. Client-side Form Validation Check
      if (username === "") {
        showValidationError("Username cannot be empty.");
        return;
      }

      // Clear any previous form validation errors if input is valid
      clearValidationError();

      // 2. Trigger Real GitHub REST API Requests
      fetchGitHubUserData(username);
    });
  }
  // --- ADDED: Inline YouTube-Style Clear Mechanics & Character Monitoring Logic ---
  if (usernameInput && inlineClearBtn) {
    // 1. Text Observer: जब यूजर टाइप करेगा, तब 'x' बटन दिखाई देगा
    usernameInput.addEventListener("input", () => {
      if (usernameInput.value.trim() !== "") {
        inlineClearBtn.classList.remove("hidden");
      } else {
        inlineClearBtn.classList.add("hidden");
      }
    });

    // 2. Click Dispatch: 'x' बटन पर क्लिक करने पर इनपुट बॉक्स खाली हो जाएगा
    inlineClearBtn.addEventListener("click", () => {
      usernameInput.value = "";
      inlineClearBtn.classList.add("hidden");

      // पुरानी एरर बैनर को हटा देगा
      if (typeof clearValidationError === "function") {
        clearValidationError();
      }

      // कर्सर वापस इनपुट बॉक्स में ले जाएगा
      usernameInput.focus();
    });
  }

  // --- [UPDATED] Real-time Repository Filter Input Listener ---
  if (repoFilterInput && allReposContainer) {
    repoFilterInput.addEventListener("input", () => {
      const query = repoFilterInput.value.toLowerCase().trim();
      const allRepoCards = allReposContainer.querySelectorAll(".repo-card");
      let visibleCount = 0;

      allRepoCards.forEach((card) => {
        const repoNameElement = card.querySelector(".repo-name");
        if (repoNameElement) {
          const repoNameText = repoNameElement.textContent.toLowerCase();

          // Search filtering logic: Toggle visibility based on string matches
          if (repoNameText.includes(query)) {
            card.style.display = "flex";
            visibleCount++;
          } else {
            card.style.display = "none";
          }
        }
      });

      // Handle the empty search results state gracefully inside the DOM
      const existingNoMatchMsg =
        allReposContainer.querySelector(".no-match-msg");
      if (visibleCount === 0) {
        if (!existingNoMatchMsg) {
          const noMatchMsg = document.createElement("p");
          noMatchMsg.className = "repo-desc no-match-msg";
          noMatchMsg.style.cssText =
            "grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 20px 0;";
          noMatchMsg.textContent =
            "No repositories found matching your filter text criteria.";
          allReposContainer.appendChild(noMatchMsg);
        }
      } else if (existingNoMatchMsg) {
        existingNoMatchMsg.remove(); // Safely remove the warning if elements become visible again
      }

      // Update the badge count layout tracking parameters live
      if (allCountBadge) {
        allCountBadge.textContent = visibleCount;
      }
    });
  }

  /**
   * Shows a client-side validation error message under the input field.
   * @param {string} message - The text to display.
   */
  function showValidationError(message) {
    if (errorMessage && usernameInput) {
      errorMessage.textContent = message;
      errorMessage.classList.remove("hidden");
      usernameInput.style.borderColor = "var(--error-red)";
    }
  }

  /**
   * Clears client-side validation errors and restores input styling.
   */
  function clearValidationError() {
    if (errorMessage && usernameInput) {
      errorMessage.textContent = "";
      errorMessage.classList.add("hidden");
      usernameInput.style.borderColor = "var(--border-color)";
    }
  }

  /**
   * Core application logic coordinating profile and repository requests simultaneously.
   * @param {string} username - Target username typed by the user.
   */
  async function fetchGitHubUserData(username) {
    // Reset and hide old interface results before executing fresh connections
    if (dashboardContent) dashboardContent.classList.add("hidden");
    if (apiErrorState) apiErrorState.classList.add("hidden");
    if (repoFilterInput) repoFilterInput.value = ""; // Clear out search text string on clean query sets

    // Render the loading spinner layout on screen
    if (loadingState) loadingState.classList.remove("hidden");

    // Debugging log to track search initialization
    console.log(`[Debug] Initiating GitHub API fetch for user: "${username}"`);

    try {
      // Using safe explicit string concats to avoid tricky backtick character parsing slips entirely
      const profileUrl = `https://api.github.com/users/${username}`;

      const reposUrl = `https://api.github.com/users/${username}/repos?per_page=100`;

      console.log(`[Debug] Requesting Profile URL: ${profileUrl}`);
      console.log(`[Debug] Requesting Repositories URL: ${reposUrl}`);

      // Send requests to both API endpoints concurrently using Promise.all
      const [userResponse, reposResponse] = await Promise.all([
        fetch(profileUrl),
        fetch(reposUrl),
      ]);

      // Debugging logs to track HTTP Status codes
      console.log(
        `[Debug] Profile API Status: ${userResponse.status} ${userResponse.statusText}`,
      );
      console.log(
        `[Debug] Repositories API Status: ${reposResponse.status} ${reposResponse.statusText}`,
      );

      // If the user profile endpoint does not return a successful response code (e.g. 404 Not Found)
      if (!userResponse.ok) {
        throw new Error(
          `GitHub user not found (Status: ${userResponse.status})`,
        );
      }

      // Convert the raw streams into readable JavaScript objects
      const userData = await userResponse.json();
      const reposData = await reposResponse.json();
    
      activeSearchUser = userData.login;
      saveSearchHistory(userData.login);

      // Update Compare Developers button to pass the searched username
      const compareBtn = document.getElementById("btn-compare-nav");
      if (compareBtn) {
        compareBtn.href = `compare.html?user1=${encodeURIComponent(userData.login)}`;
      }

      // Debugging logs to inspect the raw data returned by GitHub
      console.log("[Debug] Received User Profile Data:", userData);
      console.log("[Debug] Received Repositories Data Array:", reposData);

      // Cache the full data array payload in local memory to enable ultra-fast client-side filtering
      cachedRepositoriesArray = reposData;

      updateProfileUI(userData);

      // [UPDATED] Route data payloads out into separate dashboard render blocks
      renderPopularRepositories(reposData);
      renderAllRepositories(reposData);

      // Complete loading transitions and make dashboard grid visible
      if (loadingState) loadingState.classList.add("hidden");
      if (dashboardContent) dashboardContent.classList.remove("hidden");

      console.log("[Debug] Dashboard UI successfully rendered with live data.");
    } catch (error) {
      // Dismiss loading elements and render structural API error notification block
      if (loadingState) loadingState.classList.add("hidden");
      if (apiErrorState) apiErrorState.classList.remove("hidden");

      console.error("[Error] Comprehensive API Fetch Failure:", error.message);
    }
  }

  /**
   * Maps the response properties from the Profile JSON object directly into DOM targets.
   * @param {Object} user - Profile data returned by the API response.
   */
  /**
   * Maps the response properties from the Profile JSON object directly into DOM targets.
   * @param {Object} user - Profile data returned by the API response.
   */
  function updateProfileUI(user) {
    if (profileAvatar) {
      profileAvatar.src = user.avatar_url || "https://unsplash.com";
      profileAvatar.alt = `${user.login}'s profile avatar`;
    }

    if (profileName) profileName.textContent = user.name || user.login;
    if (profileUsername) profileUsername.textContent = `@${user.login}`;
    if (profileBio)
      profileBio.textContent =
        user.bio || "This user has no bio configured yet.";
    if (profileLocation)
      profileLocation.textContent = user.location || "Not Specified";

    // 1. External Profile Action Button: View Profile
    if (btnViewGithub) {
      btnViewGithub.onclick = () => window.open(user.html_url, "_blank");
    }

    // 2. Company Row Validation Check
    if (user.company && user.company.trim() !== "") {
      if (profileCompany) profileCompany.textContent = user.company;
      if (metaCompany) metaCompany.classList.remove("hidden");
    } else {
      if (metaCompany) metaCompany.classList.add("hidden");
    }

    // 3. Blog/Website Link Row Validation Check
    if (user.blog && user.blog.trim() !== "") {
      const formattedUrl = user.blog.startsWith("http")
        ? user.blog
        : "https://" + user.blog;
      if (profileBlog) {
        profileBlog.href = formattedUrl;
        profileBlog.textContent = user.blog;
      }
      if (metaBlog) metaBlog.classList.remove("hidden");
    } else {
      if (metaBlog) metaBlog.classList.add("hidden");
    }

    // 4. Public Email Row Validation Check
    if (user.email && user.email.trim() !== "") {
      if (profileEmail) profileEmail.textContent = user.email;
      if (metaEmail) metaEmail.classList.remove("hidden");
    } else {
      if (metaEmail) metaEmail.classList.add("hidden");
    }

    // 5. Twitter Handle Row Validation Check
    if (user.twitter_username && user.twitter_username.trim() !== "") {
      if (profileTwitter)
        profileTwitter.textContent = "@" + user.twitter_username;
      if (metaTwitter) metaTwitter.classList.remove("hidden");
    } else {
      if (metaTwitter) metaTwitter.classList.add("hidden");
    }

    // 6. User-Friendly Creation Date Parsing
    if (profileCreated && user.created_at) {
      const creationTimestampObject = new Date(user.created_at);
      const optionsConfiguration = {
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      const userFriendlyDateString = creationTimestampObject.toLocaleDateString(
        "en-US",
        optionsConfiguration,
      );

      profileCreated.textContent = "Joined " + userFriendlyDateString;
    }

    // Populate the top metric layouts numbers
    if (statRepos) statRepos.textContent = user.public_repos;
    if (statFollowers) statFollowers.textContent = formatNumber(user.followers);
    if (statFollowing) statFollowing.textContent = formatNumber(user.following);
  }

  /**
   * Builds and inserts HTML repository structural fragments into the dynamic grid container.
   * @param {Array} repos - Collection of user repository objects.
   */
  /**
   * Repository Sorting & Popular Repository Logic:
   * Isolates repositories, sorts them descending by star count, and extracts the top 6 entries.
   * @param {Array} repos - Full collection array of fetched project repositories.
   */
  function renderPopularRepositories(repos) {
    if (!popularReposContainer) return;
    popularReposContainer.innerHTML = "";

    if (!repos || repos.length === 0) {
      popularReposContainer.innerHTML =
        '<p class="repo-desc" style="grid-column: 1/-1; text-align: center;">No project repositories available.</p>';
      return;
    }

    // Sort repositories by star count in descending order (highest stars first)
    const sortedByStars = [...repos].sort(
      (a, b) => b.stargazers_count - a.stargazers_count,
    );

    // Slice out only the top 6 highly-starred public projects to keep the dashboard clean
    const top6Popular = sortedByStars.slice(0, 6);

    // Render the cards dynamically into the Popular grid block section
    top6Popular.forEach((repo) => {
      popularReposContainer.appendChild(createRepositoryCardElement(repo));
    });
  }

  /**
   * All Repositories Processing Routine:
   * Sorts all repositories by their latest modification timestamp and generates the complete archive grid.
   * @param {Array} repos - Full collection array of fetched project repositories.
   */
  function renderAllRepositories(repos) {
    if (!allReposContainer) return;
    allReposContainer.innerHTML = "";

    if (allCountBadge) allCountBadge.textContent = repos.length;

    if (!repos || repos.length === 0) {
      allReposContainer.innerHTML =
        '<p class="repo-desc" style="grid-column: 1/-1; text-align: center;">No public repositories discovered for this profile.</p>';
      return;
    }

    // Sort repositories by their updated_at date strings (most recently modified projects first)
    const sortedByRecent = [...repos].sort(
      (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
    );

    // Render the entire list of projects safely down inside the full archive section block
    sortedByRecent.forEach((repo) => {
      allReposContainer.appendChild(createRepositoryCardElement(repo));
    });
  }

  /**
   * Helper HTML card component node generation utility.
   * Ensures identical UI design structures are applied consistently across both layout sections.
   * @param {Object} repo - Target data packet.
   * @returns {HTMLElement} Prepared structural card node component asset.
   */
  function createRepositoryCardElement(repo) {
    const repoCard = document.createElement("div");
    repoCard.className = "card repo-card";

    const langClass = repo.language
      ? repo.language
          .toLowerCase()
          .replace("#", "sharp")
          .replace("++", "plusplus")
      : "html";

    repoCard.innerHTML = `
        <h4 class="repo-name" onclick="window.open('${repo.html_url}', '_blank')">${repo.name}</h4>
        <p class="repo-desc">${repo.description || "No summary overview description set for this public project archive."}</p>
        <div class="repo-tags">
            <span class="repo-lang">
                <span class="lang-color ${langClass}"></span>
                ${repo.language || "Markdown"}
            </span>
            <span class="repo-stat">⭐ ${repo.stargazers_count}</span>
        </div>
    `;
    return repoCard;
  }

  // FIX: गायब हुआ formatNumber फंक्शन यहाँ वापस जोड़ दिया गया है
  function formatNumber(num) {
    if (num === undefined || num === null) return "0";
    return num >= 1000 ? (num / 1000).toFixed(1) + "k" : num;
  }

  /**
   * ==========================================================================
   * LOCALSTORAGE SEARCH HISTORY FUNCTIONS
   * ==========================================================================
   */
  function saveSearchHistory(username) {
    let history = JSON.parse(localStorage.getItem("recentSearches")) || [];
    history = history.filter(
      (name) => name.toLowerCase() !== username.toLowerCase(),
    );
    history.unshift(username);
    if (history.length > 5) {
      history = history.slice(0, 5);
    }
    localStorage.setItem("recentSearches", JSON.stringify(history));
    renderSearchHistory();
  }

  function renderSearchHistory() {
    if (!recentTagsContainer) return;
    recentTagsContainer.innerHTML = "";
    const history = JSON.parse(localStorage.getItem("recentSearches")) || [];

    if (history.length === 0) {
      recentTagsContainer.innerHTML =
        '<span class="recent-title" style="font-style: italic;">No search history yet.</span>';
      return;
    }

    history.forEach((username) => {
      const tagButton = document.createElement("span");
      tagButton.className = "tag";
      tagButton.textContent = username;

      if (
        typeof activeSearchUser !== "undefined" &&
        username.toLowerCase() === activeSearchUser.toLowerCase()
      ) {
        tagButton.style.borderColor = "#58a6ff";
        tagButton.style.backgroundColor = "rgba(88, 166, 255, 0.1)";
        tagButton.style.color = "#58a6ff";
        tagButton.style.fontWeight = "600";
      }

      tagButton.addEventListener("click", () => {
        if (usernameInput) usernameInput.value = username;
        if (typeof clearValidationError === "function") clearValidationError();
        fetchGitHubUserData(username);
      });

      recentTagsContainer.appendChild(tagButton);
    });
  }
  // ==========================================================================
  // SINGLE-PAGE DYNAMIC LIGHT/DARK THEME MANAGEMENT SWITCHER
  // ==========================================================================

  const savedUserThemeSelection =
    localStorage.getItem("dashboard_theme") || "dark";
  applyAppUiThemeState(savedUserThemeSelection);

  if (themeToggleBtn) {
    // button pr click krte hi theme change ho jayegi
    themeToggleBtn.addEventListener("click", () => {
      const activeCurrentTheme =
        document.documentElement.getAttribute("data-theme");

      // theme togele
      const invertedTargetThemeSetting =
        activeCurrentTheme === "light" ? "dark" : "light";

      // aplly theme
      applyAppUiThemeState(invertedTargetThemeSetting);

      // save theme in storage for next time
      localStorage.setItem("dashboard_theme", invertedTargetThemeSetting);
    });
  }

  // theme button function
  function applyAppUiThemeState(themeName) {
    // set theme on root element
    document.documentElement.setAttribute("data-theme", themeName);

    // change button text as theme
    if (themeToggleBtn) {
      themeToggleBtn.textContent =
        themeName === "light" ? "🌙 Dark Mode" : "☀️ Light Mode";
    }

    console.log(
      `[Theme Manager] Successfully switched view setting state to: ${themeName.toUpperCase()}`,
    );
  }
});
