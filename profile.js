/**
 * @typedef {"light" | "dark"} ThemeName
 */

/**
 * @typedef {Object} IconCatalogItem
 * @property {string} icon - Emoji displayed for the icon.
 * @property {string} name - Human-readable item name.
 * @property {number} cost - Credit cost to unlock the icon.
 */

/**
 * @typedef {Object} PlayerProfile
 * @property {string} name - Saved display name.
 * @property {string} selectedIcon - Equipped icon.
 * @property {string[]} ownedIcons - Icons unlocked on this device.
 */

const { animate } = window.Motion;
const { startingTokens } = window.SLOT_CONFIG;

const rootElement = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const profileTokenCount = document.getElementById("profileTokenCount");
const profileIconDisplay = document.getElementById("profileIconDisplay");
const profileNameDisplay = document.getElementById("profileNameDisplay");
const playerNameInput = document.getElementById("playerNameInput");
const saveNameButton = document.getElementById("saveNameButton");
const playerNameStatus = document.getElementById("playerNameStatus");
const iconShopList = document.getElementById("iconShopList");

const themeStorageKey = "prompt-drop-theme-v1";
const playerProfileStorageKey = "prompt-drop-player-profile-v1";
const walletStorageKey = "prompt-drop-wallet-v1";
const defaultPlayerIcon = "🙂";
const iconCatalog = [
  { icon: "🙂", name: "Starter Smile", cost: 0 },
  { icon: "🤖", name: "Bot Buddy", cost: 350 },
  { icon: "💎", name: "Diamond Drop", cost: 700 },
  { icon: "🚀", name: "Launch Mode", cost: 1100 },
  { icon: "👑", name: "Crown Signal", cost: 1800 },
  { icon: "🌟", name: "Star Surge", cost: 2400 },
];

/** @type {number} */
let tokens = startingTokens;
/** @type {PlayerProfile} */
let playerProfile = {
  name: "Guest",
  selectedIcon: defaultPlayerIcon,
  ownedIcons: [defaultPlayerIcon],
};

/**
 * Formats a number for display in the profile UI.
 *
 * @param {number} value - Numeric value to format.
 * @returns {string} A localized number string.
 */
function formatNumber(value) {
  return value.toLocaleString();
}

/**
 * Reads a local-storage value and normalizes it to a supported theme name.
 *
 * @returns {ThemeName} The stored theme, or `"light"` when unavailable.
 */
function readStoredTheme() {
  try {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    return storedTheme === "dark" ? "dark" : "light";
  } catch (error) {
    return "light";
  }
}

/**
 * Persists the selected theme for future visits.
 *
 * @param {ThemeName} theme - Theme to store.
 * @returns {void}
 */
function persistTheme(theme) {
  try {
    window.localStorage.setItem(themeStorageKey, theme);
  } catch (error) {
    return;
  }
}

/**
 * Applies the selected theme and updates the toggle button label.
 *
 * @param {ThemeName} theme - Theme to apply.
 * @returns {void}
 */
function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  const nextLabel = nextTheme === "dark" ? "Light Mode" : "Dark Mode";

  rootElement.dataset.theme = nextTheme;
  themeToggle.textContent = nextLabel;
  themeToggle.setAttribute("aria-pressed", String(nextTheme === "dark"));
  themeToggle.setAttribute("aria-label", `Switch to ${nextLabel.toLowerCase()}`);
}

/**
 * Switches between light and dark mode.
 *
 * @returns {void}
 */
function toggleTheme() {
  const nextTheme = rootElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  persistTheme(nextTheme);
}

/**
 * Fades a single element into view.
 *
 * @param {Element | null | undefined} element - Element to animate.
 * @returns {void}
 */
function fadeInElement(element) {
  if (!element) {
    return;
  }

  animate(element, { opacity: [0, 1], y: [12, 0] }, { duration: 0.35, ease: "easeOut" });
}

/**
 * Normalizes a player name for local persistence and display.
 *
 * @param {unknown} name - Raw name value from storage or user input.
 * @returns {string} A trimmed, bounded display name.
 */
function sanitizePlayerName(name) {
  const cleanName = String(name || "").trim().replace(/\s+/g, " ").slice(0, 18);

  return cleanName || "Guest";
}

/**
 * Reads the shared wallet balance from local storage.
 *
 * @returns {number | null} The stored token balance when available.
 */
function readStoredWallet() {
  try {
    const raw = window.localStorage.getItem(walletStorageKey);

    if (!raw) {
      return null;
    }

    const storedWallet = JSON.parse(raw);

    return Number.isFinite(storedWallet?.tokens) ? storedWallet.tokens : null;
  } catch (error) {
    return null;
  }
}

/**
 * Persists the current wallet balance.
 *
 * @returns {void}
 */
function persistWallet() {
  try {
    window.localStorage.setItem(walletStorageKey, JSON.stringify({ tokens }));
  } catch (error) {
    return;
  }
}

/**
 * Reads the stored profile snapshot from local storage.
 *
 * @returns {Partial<PlayerProfile> | null} The stored profile when available.
 */
function readStoredPlayerProfile() {
  try {
    const raw = window.localStorage.getItem(playerProfileStorageKey);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

/**
 * Persists the current profile state.
 *
 * @returns {void}
 */
function persistPlayerProfile() {
  try {
    window.localStorage.setItem(playerProfileStorageKey, JSON.stringify(playerProfile));
  } catch (error) {
    return;
  }
}

/**
 * Updates the inline profile status message.
 *
 * @param {string} text - Status text to display.
 * @returns {void}
 */
function setStatus(text) {
  playerNameStatus.textContent = text;
  fadeInElement(playerNameStatus);
}

/**
 * Synchronizes the visible profile summary with the current local state.
 *
 * @returns {void}
 */
function updateProfileDisplay() {
  profileTokenCount.textContent = formatNumber(tokens);
  profileIconDisplay.textContent = playerProfile.selectedIcon;
  profileNameDisplay.textContent = playerProfile.name;

  if (document.activeElement !== playerNameInput) {
    playerNameInput.value = playerProfile.name === "Guest" ? "" : playerProfile.name;
  }
}

/**
 * Renders the icon shop buttons from the configured catalog.
 *
 * @returns {void}
 */
function renderIconShop() {
  iconShopList.textContent = "";

  iconCatalog.forEach((iconOption) => {
    const owned = playerProfile.ownedIcons.includes(iconOption.icon);
    const selected = playerProfile.selectedIcon === iconOption.icon;
    const button = document.createElement("button");
    const icon = document.createElement("span");
    const label = document.createElement("span");
    const meta = document.createElement("span");

    button.className = "icon-shop-button";
    button.type = "button";
    button.disabled = !owned && tokens < iconOption.cost;
    button.classList.toggle("is-owned", owned);
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));

    icon.className = "icon-shop-symbol";
    icon.textContent = iconOption.icon;
    label.className = "icon-shop-name";
    label.textContent = iconOption.name;
    meta.className = "icon-shop-meta";
    meta.textContent = selected
      ? "Equipped"
      : owned
        ? "Equip"
        : `${formatNumber(iconOption.cost)} credits`;

    button.append(icon, label, meta);
    button.addEventListener("click", () => {
      purchaseOrEquipIcon(iconOption);
    });
    iconShopList.append(button);
  });
}

/**
 * Saves the current player name input to local storage.
 *
 * @returns {void}
 */
function savePlayerName() {
  playerProfile.name = sanitizePlayerName(playerNameInput.value);
  persistPlayerProfile();
  updateProfileDisplay();
  setStatus(`Welcome, ${playerProfile.name}.`);
}

/**
 * Unlocks or equips an icon shop item.
 *
 * @param {IconCatalogItem} iconOption - The icon shop entry to process.
 * @returns {void}
 */
function purchaseOrEquipIcon(iconOption) {
  const owned = playerProfile.ownedIcons.includes(iconOption.icon);

  if (!owned && tokens < iconOption.cost) {
    setStatus(`Need ${formatNumber(iconOption.cost)} credits for ${iconOption.name}.`);
    return;
  }

  if (!owned) {
    tokens -= iconOption.cost;
    playerProfile.ownedIcons.push(iconOption.icon);
    setStatus(`${iconOption.name} purchased and equipped.`);
  } else {
    setStatus(`${iconOption.name} equipped.`);
  }

  playerProfile.selectedIcon = iconOption.icon;
  persistWallet();
  persistPlayerProfile();
  updateProfileDisplay();
  renderIconShop();
}

/**
 * Restores the wallet balance or falls back to the configured starting balance.
 *
 * @returns {void}
 */
function initializeWallet() {
  const storedTokens = readStoredWallet();
  tokens = Number.isFinite(storedTokens) ? Math.max(0, storedTokens) : startingTokens;
  persistWallet();
}

/**
 * Restores the saved player profile and normalizes owned/equipped icons.
 *
 * @returns {void}
 */
function initializePlayerProfile() {
  const storedProfile = readStoredPlayerProfile();
  const ownedIcons = Array.isArray(storedProfile?.ownedIcons)
    ? [...new Set([defaultPlayerIcon, ...storedProfile.ownedIcons])]
    : [defaultPlayerIcon];
  const selectedIcon = ownedIcons.includes(storedProfile?.selectedIcon)
    ? storedProfile.selectedIcon
    : defaultPlayerIcon;

  playerProfile = {
    name: sanitizePlayerName(storedProfile?.name),
    selectedIcon,
    ownedIcons,
  };

  persistPlayerProfile();
  updateProfileDisplay();
  renderIconShop();
}

applyTheme(readStoredTheme());
initializeWallet();
initializePlayerProfile();

themeToggle.addEventListener("click", toggleTheme);
saveNameButton.addEventListener("click", savePlayerName);
playerNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    savePlayerName();
  }
});
