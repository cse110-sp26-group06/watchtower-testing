const { animate, stagger } = window.Motion;

const {
  rows,
  reels,
  paylines,
  symbols,
  states,
  startingTokens,
  defaultSpinCost,
  minSpinCost,
  maxSpinCost,
  autoSpinRange,
  variableRatioReward,
  bonusOffers,
  createSpinGrid,
  payoutMultiplier,
  randomInt,
  complianceReminder,
} = window.SLOT_CONFIG;
const {
  resolveBonusOffer,
  calculateBonusSpinCost,
  calculateBonusSpinSurcharge,
  applyBonusMultiplierToWin,
  buildBonusAudioCue,
  buildBonusPresentationState,
} = window.BONUS_FEATURES;
const {
  restoreVariableRatioRewardState,
  serializeVariableRatioRewardState,
  advanceVariableRatioReward,
} = window.VARIABLE_RATIO_REWARD;

/**
 * @typedef {"light" | "dark"} ThemeName
 */

/**
 * @typedef {Object} ReelPosition
 * @property {number} col - Zero-based reel index.
 * @property {number} row - Zero-based row index.
 */

/**
 * @typedef {Object} SymbolDefinition
 * @property {string} key - Stable symbol identifier.
 * @property {string} name - Human-readable symbol name.
 * @property {string} label - Short tile label.
 * @property {string} icon - Decorative icon rendered on the reel.
 * @property {number} weight - Default selection weight.
 * @property {Record<number, number>} payouts - Match-count payout table.
 * @property {string} flavor - Supporting descriptive copy.
 */

/**
 * @typedef {Object} PaylineDefinition
 * @property {string} id - Stable payline identifier.
 * @property {string} name - Human-readable payline name.
 * @property {string} description - Short path description.
 * @property {ReelPosition[]} cells - Ordered positions evaluated on the payline.
 */

/**
 * @typedef {Object} BonusOffer
 * @property {string} id - Stable purchased-bonus identifier.
 * @property {string} title - UI label for the offer.
 * @property {number} multiplier - Multiplier applied to a paid win.
 * @property {number} priceMultiplier - Cost multiplier applied to the wager.
 * @property {string} stageClass - CSS class used for presentation.
 * @property {number} visualIntensity - Relative effect intensity.
 * @property {number} targetRtp - Classroom tuning metadata.
 * @property {Record<string, number>} symbolWeights - Weight overrides for bonus spins.
 */

/**
 * @typedef {Object} IconCatalogItem
 * @property {string} icon - Emoji displayed for the icon.
 * @property {string} name - Human-readable item name.
 * @property {number} cost - Credit cost required to unlock the icon.
 */

/**
 * @typedef {Object} PaidWin
 * @property {PaylineDefinition} line - Winning payline.
 * @property {SymbolDefinition} symbol - Symbol that matched on the line.
 * @property {number} matchCount - Number of contiguous matching symbols.
 * @property {number} multiplier - Final awarded multiplier.
 * @property {number} award - Final awarded credits.
 * @property {ReelPosition[]} positions - Winning positions to highlight.
 * @property {number} [baseAward] - Pre-bonus award for purchased bonus spins.
 * @property {number} [baseMultiplier] - Pre-bonus multiplier for purchased bonus spins.
 * @property {BonusOffer} [bonusOffer] - Purchased offer that boosted the win.
 * @property {boolean} [bonusMultiplierApplied] - Whether the purchased offer changed the award.
 */

/**
 * @typedef {Object} BonusReward
 * @property {string} label - Reward label shown in the UI.
 * @property {number} multiplier - Reward multiplier applied to the wager.
 * @property {number} award - Awarded credits.
 * @property {number} completedSpins - Hidden spin count that triggered the reward.
 * @property {number} rewardNumber - Ordinal reward count in the session history.
 */

/**
 * @typedef {Object} NearMiss
 * @property {PaylineDefinition} line - Payline that almost qualified.
 * @property {SymbolDefinition} symbol - Symbol that nearly formed a winner.
 * @property {number} matchCount - Actual contiguous match count.
 * @property {number} targetCount - Required count needed to award.
 * @property {number} potentialMultiplier - Award multiplier that was missed.
 * @property {ReelPosition[]} positions - Matching positions currently on the line.
 * @property {ReelPosition[]} pathCells - Cells used to draw the overlay path.
 * @property {ReelPosition} missingPosition - Cell that would have completed the line.
 */

/**
 * @typedef {Object} PlayerProfile
 * @property {string} name - Saved display name.
 * @property {string} selectedIcon - Equipped player icon.
 * @property {string[]} ownedIcons - Icons purchased on this device.
 */

/**
 * @typedef {Object} AutoSpinState
 * @property {boolean} active - Whether auto-play is currently running.
 * @property {number} remaining - Spins still queued to run.
 * @property {boolean} stopRequested - Whether the queue should halt after the current spin.
 * @property {number} cost - Current wager used by the queue status display.
 */

/**
 * @typedef {Object} TokenRefillState
 * @property {boolean} active - Whether the refill countdown is active.
 * @property {number} endsAt - Timestamp when the refill completes.
 * @property {number | null} timerId - Timeout that completes the refill.
 * @property {number | null} intervalId - Interval used to refresh the countdown display.
 */

/**
 * @typedef {Object} DailyRewardState
 * @property {string} lastPlayedDate - Local calendar date of the last award.
 * @property {number} streak - Consecutive day streak count.
 * @property {number} todaysBonus - Bonus awarded for the current day.
 * @property {number} nextBonus - Preview of the next day's bonus.
 * @property {number} lastAwardedBonus - Credits awarded during the latest initialization.
 * @property {boolean} modalPending - Whether the reward modal should open.
 * @property {string} statusText - Helper text shown in the UI.
 */

/**
 * @typedef {Object} BonusBuyState
 * @property {string | null} selectedOfferId - Offer armed for the next spin.
 * @property {string | null} activeOfferId - Offer currently animating on the live spin.
 * @property {number | null} presentationTimerId - Timeout used to clear live presentation.
 * @property {string} lastAudioCue - Identifier of the most recently played audio cue.
 */

/**
 * @typedef {Object} ConsentState
 * @property {boolean} accepted - Whether the user accepted the consent flow.
 * @property {"none" | "manual" | "geolocation"} locationMode - Source of the location acknowledgement.
 * @property {string} locationLabel - Human-readable location status text.
 * @property {{ latitude: number, longitude: number } | null} coords - Rounded device coordinates when shared.
 * @property {string} stateCode - Manually selected state code.
 */

/**
 * @typedef {Object} SpinHistoryEntry
 * @property {number} spinNumber - Sequential spin counter.
 * @property {string} outcomeLabel - Short badge label for the outcome.
 * @property {string} summary - Human-readable outcome summary.
 */

/**
 * @typedef {Object} GameState
 * @property {number} tokens - Current wallet balance.
 * @property {number} spinCost - Current selected base wager.
 * @property {number} lastAward - Combined award from the last completed spin.
 * @property {boolean} spinning - Whether the reels are currently spinning.
 * @property {SymbolDefinition[][]} visibleGrid - Grid currently rendered on the board.
 * @property {HTMLElement[]} reelElements - Reel column elements.
 * @property {HTMLElement[][]} tileElements - Tile elements indexed by column then row.
 * @property {NearMiss[]} nearMisses - Near-miss overlays currently visible on the board.
 * @property {SVGSVGElement | null} nearMissLayer - SVG overlay used to render near misses.
 * @property {number | null} activeCelebrationTimer - Timeout used to clear celebrations.
 * @property {AutoSpinState} autoSpin - Auto-play execution state.
 * @property {TokenRefillState} tokenRefill - Automatic refill countdown state.
 * @property {PlayerProfile} playerProfile - Saved local profile state.
 * @property {SpinHistoryEntry[]} spinHistory - Recent completed spin summaries.
 * @property {DailyRewardState} dailyReward - Daily reward presentation state.
 * @property {ReturnType<typeof restoreVariableRatioRewardState> | null} variableReward - Hidden reward schedule state.
 * @property {BonusBuyState} bonusBuy - Purchased-bonus UI and runtime state.
 * @property {ConsentState} consent - Privacy and location acknowledgement state.
 */

const reelBoard = document.getElementById("reelBoard");
const reelStage = document.getElementById("reelStage");
const glowRing = reelStage?.querySelector(".glow-ring");
const bonusSpinOverlay = document.getElementById("bonusSpinOverlay");
const bonusSpinBadge = document.getElementById("bonusSpinBadge");
const bonusSpinCopy = document.getElementById("bonusSpinCopy");
const rootElement = document.documentElement;
const ambientSparkles = document.getElementById("ambientSparkles");
const sparkleField = document.getElementById("sparkleField");
const fxLayer = document.getElementById("fxLayer");
const coinRain = document.getElementById("coinRain");
const tokenCount = document.getElementById("tokenCount");
const playerIdentityDisplay = document.getElementById("playerIdentityDisplay");
const playerIconDisplay = document.getElementById("playerIconDisplay");
const playerNameDisplay = document.getElementById("playerNameDisplay");
const spinCostDisplay = document.getElementById("spinCostDisplay");
const queueCount = document.getElementById("queueCount");
const playTimeDisplay = document.getElementById("playTimeDisplay");
const lastAward = document.getElementById("lastAward");
const lastAwardCard = document.getElementById("lastAwardCard");
const streakCount = document.getElementById("streakCount");
const refillCountdownDisplay = document.getElementById("refillCountdownDisplay");
const dailyBonusStatus = document.getElementById("dailyBonusStatus");
const todaysBonusAmount = document.getElementById("todaysBonusAmount");
const nextBonusAmount = document.getElementById("nextBonusAmount");
const bonusBuyStatus = document.getElementById("bonusBuyStatus");
const bonusBuyTotalCost = document.getElementById("bonusBuyTotalCost");
const bonusBuyMultiplierDisplay = document.getElementById("bonusBuyMultiplierDisplay");
const bonusBuyOptions = document.getElementById("bonusBuyOptions");
const variableRewardStatus = document.getElementById("variableRewardStatus");
const variableRewardLastAmount = document.getElementById("variableRewardLastAmount");
const variableRewardCount = document.getElementById("variableRewardCount");
const locationStatus = document.getElementById("locationStatus");
const costSlider = document.getElementById("costSlider");
const costSliderValue = document.getElementById("costSliderValue");
const playerNameInput = document.getElementById("playerNameInput");
const saveNameButton = document.getElementById("saveNameButton");
const playerNameStatus = document.getElementById("playerNameStatus");
const iconShopList = document.getElementById("iconShopList");
const autoSpinSlider = document.getElementById("autoSpinSlider");
const autoSpinValue = document.getElementById("autoSpinValue");
const autoSpinStatus = document.getElementById("autoSpinStatus");
const spinButton = document.getElementById("spinButton");
const autoSpinButton = document.getElementById("autoSpinButton");
const stopAutoSpinButton = document.getElementById("stopAutoSpinButton");
const resetButton = document.getElementById("resetButton");
const inviteButton = document.getElementById("inviteButton");
const message = document.getElementById("message");
const winMeta = document.getElementById("winMeta");
const breakdownList = document.getElementById("breakdownList");
const spinHistoryList = document.getElementById("spinHistoryList");
const privacyModal = document.getElementById("privacyModal");
const privacyCard = privacyModal?.querySelector(".privacy-card");
const dailyBonusModal = document.getElementById("dailyBonusModal");
const dailyBonusModalCard = dailyBonusModal?.querySelector(".reward-card");
const dailyBonusModalAmount = document.getElementById("dailyBonusModalAmount");
const dailyBonusModalStreak = document.getElementById("dailyBonusModalStreak");
const dailyBonusModalNext = document.getElementById("dailyBonusModalNext");
const dailyBonusCloseButton = document.getElementById("dailyBonusCloseButton");
const wagerWarningModal = document.getElementById("wagerWarningModal");
const wagerWarningCopy = document.getElementById("wagerWarningCopy");
const wagerWarningRefillButton = document.getElementById("wagerWarningRefillButton");
const wagerWarningCloseButton = document.getElementById("wagerWarningCloseButton");
const privacyCheckbox = document.getElementById("privacyCheckbox");
const termsCheckbox = document.getElementById("termsCheckbox");
const privacyAcceptButton = document.getElementById("privacyAcceptButton");
const locationButton = document.getElementById("locationButton");
const locationFeedback = document.getElementById("locationFeedback");
const stateSelect = document.getElementById("stateSelect");
const themeToggle = document.getElementById("themeToggle");

const consentStorageKey = "prompt-drop-consent-v1";
const themeStorageKey = "prompt-drop-theme-v1";
const dailyRewardStorageKey = "prompt-drop-daily-reward-v1";
const variableRewardStorageKey = "prompt-drop-variable-reward-v1";
const playerProfileStorageKey = "prompt-drop-player-profile-v1";
const walletStorageKey = "prompt-drop-wallet-v1";
const dailyBonusBase = 250;
const dailyBonusStreakStep = 75;
const tokenRefillDelayMs = 60 * 1000;
const sessionStartedAt = Date.now();
const defaultPlayerIcon = "🙂";
const iconCatalog = [
  { icon: "🙂", name: "Starter Smile", cost: 0 },
  { icon: "🤖", name: "Bot Buddy", cost: 350 },
  { icon: "💎", name: "Diamond Drop", cost: 700 },
  { icon: "🚀", name: "Launch Mode", cost: 1100 },
  { icon: "👑", name: "Crown Signal", cost: 1800 },
  { icon: "🌟", name: "Star Surge", cost: 2400 },
];
const lineAccentPalette = [
  "var(--line-accent-1)",
  "var(--line-accent-2)",
  "var(--line-accent-3)",
  "var(--line-accent-4)",
  "var(--line-accent-5)",
  "var(--line-accent-6)",
];
const celebrationPalette = [
  "var(--celebration-accent-1)",
  "var(--celebration-accent-2)",
  "var(--celebration-accent-3)",
  "var(--celebration-accent-4)",
];
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobileViewportQuery = window.matchMedia("(max-width: 760px)");
const numericAnimations = new WeakMap();
const displayValues = new WeakMap();
const pulseAnimations = new Map();
const bounceAnimations = new Map();
const transientAnimations = new WeakMap();
let buttonStyleCache = new WeakMap();
/** @type {AudioContext | null} */
let bonusAudioContext = null;
const svgNamespace = "http://www.w3.org/2000/svg";

/** @type {GameState} */
const state = {
  tokens: startingTokens,
  spinCost: defaultSpinCost,
  lastAward: 0,
  spinning: false,
  visibleGrid: [],
  reelElements: [],
  tileElements: [],
  nearMisses: [],
  nearMissLayer: null,
  activeCelebrationTimer: null,
  autoSpin: {
    active: false,
    remaining: autoSpinRange.defaultValue,
    stopRequested: false,
    cost: defaultSpinCost,
  },
  tokenRefill: {
    active: false,
    endsAt: 0,
    timerId: null,
    intervalId: null,
  },
  playerProfile: {
    name: "Guest",
    selectedIcon: defaultPlayerIcon,
    ownedIcons: [defaultPlayerIcon],
  },
  spinHistory: [],
  dailyReward: {
    lastPlayedDate: "",
    streak: 0,
    todaysBonus: dailyBonusBase,
    nextBonus: dailyBonusBase + dailyBonusStreakStep,
    lastAwardedBonus: 0,
    modalPending: false,
    statusText: "Checking daily play streak.",
  },
  variableReward: null,
  bonusBuy: {
    selectedOfferId: null,
    activeOfferId: null,
    presentationTimerId: null,
    lastAudioCue: "standard-spin",
  },
  consent: {
    accepted: false,
    locationMode: "none",
    locationLabel: "Pending",
    coords: null,
    stateCode: "",
  },
};

/**
 * Formats a number for display in the HUD and status copy.
 *
 * @param {number} value - Numeric value to format.
 * @returns {string} A localized number string.
 */
function formatNumber(value) {
  return value.toLocaleString();
}

/**
 * Returns the configured minimum match count that can pay for a symbol on a line.
 *
 * @param {string} symbolKey - The symbol identifier to inspect.
 * @param {number} lineLength - The number of stops available on the payline.
 * @returns {number} The smallest paying match count on the line, or zero when unavailable.
 */
function minimumPayingMatchCount(symbolKey, lineLength) {
  const symbol = symbols.find((entry) => entry.key === symbolKey);

  if (!symbol) {
    return 0;
  }

  return Object.keys(symbol.payouts)
    .map((count) => Number.parseInt(count, 10))
    .filter((count) => count <= lineLength && payoutMultiplier(symbolKey, count) > 0)
    .sort((left, right) => left - right)[0] || 0;
}

/**
 * Resolves the themed accent used for a payline overlay.
 *
 * @param {PaylineDefinition} line - The payline definition.
 * @returns {string} The CSS color token assigned to the payline.
 */
function nearMissAccentForLine(line) {
  const lineIndex = paylines.findIndex((entry) => entry.id === line.id);
  return lineAccentPalette[(lineIndex >= 0 ? lineIndex : 0) % lineAccentPalette.length];
}

/**
 * Resolves the bonus offer armed for the next completed spin.
 *
 * @returns {BonusOffer | null} The selected bonus-buy offer when present.
 */
function selectedBonusOffer() {
  return resolveBonusOffer(bonusOffers, state.bonusBuy.selectedOfferId);
}

/**
 * Resolves the bonus offer currently animating on the live spin.
 *
 * @returns {BonusOffer | null} The active bonus-buy offer when present.
 */
function activeBonusOffer() {
  return resolveBonusOffer(bonusOffers, state.bonusBuy.activeOfferId);
}

/**
 * Returns the full credit debit required for the next completed spin.
 *
 * @returns {number} The current next-spin total including any armed bonus.
 */
function nextSpinDebit() {
  return calculateBonusSpinCost(state.spinCost, selectedBonusOffer());
}

/**
 * Clamps a numeric value to the provided inclusive bounds.
 *
 * @param {number} value - Value to constrain.
 * @param {number} minimum - Inclusive lower bound.
 * @param {number} maximum - Inclusive upper bound.
 * @returns {number} The bounded value.
 */
function clampNumber(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Formats elapsed milliseconds as `m:ss` or `h:mm:ss`.
 *
 * @param {number} milliseconds - Elapsed time in milliseconds.
 * @returns {string} Human-readable duration string.
 */
function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedMinutes = String(minutes).padStart(hours > 0 ? 2 : 1, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");

  return hours > 0
    ? `${hours}:${paddedMinutes}:${paddedSeconds}`
    : `${paddedMinutes}:${paddedSeconds}`;
}

/**
 * Formats milliseconds as a short countdown string.
 *
 * @param {number} milliseconds - Remaining time in milliseconds.
 * @returns {string} Countdown string in `m:ss` format.
 */
function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Converts a date into the storage format used for daily rewards.
 *
 * @param {Date} date - Date to serialize.
 * @returns {string} Local calendar date formatted as `YYYY-MM-DD`.
 */
function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Parses a stored daily-reward date key back into a local `Date`.
 *
 * @param {string} dateKey - Stored date key.
 * @returns {Date | null} Parsed date when the value is valid.
 */
function parseDateKey(dateKey) {
  if (typeof dateKey !== "string") {
    return null;
  }

  const [year, month, day] = dateKey.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

/**
 * Returns the day difference between two stored local-date keys.
 *
 * @param {string} startKey - Earlier stored date key.
 * @param {string} endKey - Later stored date key.
 * @returns {number} Whole-day difference, or `Infinity` when parsing fails.
 */
function daysBetweenDateKeys(startKey, endKey) {
  const startDate = parseDateKey(startKey);
  const endDate = parseDateKey(endKey);

  if (!startDate || !endDate) {
    return Number.POSITIVE_INFINITY;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round((endDate - startDate) / millisecondsPerDay);
}

/**
 * Calculates the daily bonus amount for the provided streak length.
 *
 * @param {number} streak - Consecutive-day streak length.
 * @returns {number} Credits awarded for the streak.
 */
function dailyBonusForStreak(streak) {
  return dailyBonusBase + Math.max(0, streak - 1) * dailyBonusStreakStep;
}

/**
 * Formats a day count for display.
 *
 * @param {number} days - Number of days in the streak.
 * @returns {string} Human-readable day-count label.
 */
function formatDayCount(days) {
  return `${formatNumber(days)} day${days === 1 ? "" : "s"}`;
}

/**
 * Returns whether the current environment prefers reduced motion.
 *
 * @returns {boolean} `true` when reduced motion is preferred.
 */
function prefersReducedMotion() {
  return reducedMotionQuery.matches;
}

/**
 * Returns whether the layout is currently in the mobile breakpoint.
 *
 * @returns {boolean} `true` when the viewport matches the mobile media query.
 */
function isMobileViewport() {
  return mobileViewportQuery.matches;
}

/**
 * Reads and parses a JSON payload from local storage.
 *
 * @template T
 * @param {string} storageKey - Storage key to inspect.
 * @returns {T | null} Parsed JSON payload when available.
 */
function readStoredJson(storageKey) {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

/**
 * Reads a plain string value from local storage.
 *
 * @param {string} storageKey - Storage key to inspect.
 * @returns {string | null} Stored string value when available.
 */
function readStoredValue(storageKey) {
  try {
    return window.localStorage.getItem(storageKey);
  } catch (error) {
    return null;
  }
}

/**
 * Serializes a JSON payload into local storage.
 *
 * @param {string} storageKey - Storage key to update.
 * @param {unknown} value - Serializable value to persist.
 * @returns {void}
 */
function persistStoredJson(storageKey, value) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch (error) {
    return;
  }
}

/**
 * Reads the persisted theme preference.
 *
 * @returns {ThemeName} The stored theme, or `"light"` when unavailable.
 */
function readStoredTheme() {
  return readStoredValue(themeStorageKey) === "dark" ? "dark" : "light";
}

/**
 * Persists the selected theme.
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
 * Applies the active theme and refreshes cached button tokens.
 *
 * @param {ThemeName} theme - Theme to apply.
 * @returns {void}
 */
function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";

  rootElement.dataset.theme = nextTheme;
  buttonStyleCache = new WeakMap();

  if (themeToggle) {
    const nextLabel = nextTheme === "dark" ? "Light Mode" : "Dark Mode";
    themeToggle.textContent = nextLabel;
    themeToggle.setAttribute("aria-pressed", String(nextTheme === "dark"));
    themeToggle.setAttribute("aria-label", `Switch to ${nextLabel.toLowerCase()}`);
  }
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
 * Applies the previously stored theme during page initialization.
 *
 * @returns {void}
 */
function initializeTheme() {
  applyTheme(readStoredTheme());
}

/**
 * Resolves a theme CSS variable that stores RGB channels into an `rgba()` string.
 *
 * @param {string} variableName - CSS custom property that stores comma-separated RGB values.
 * @param {number} alpha - Alpha channel to apply.
 * @returns {string} A CSS `rgba(...)` color string.
 */
function themedRgba(variableName, alpha) {
  const rgbValue = window.getComputedStyle(rootElement).getPropertyValue(variableName).trim();
  return `rgba(${rgbValue}, ${alpha})`;
}

/**
 * Stops a Motion animation controller or a collection of controllers.
 *
 * @param {unknown} controls - Motion controller or controller collection.
 * @returns {void}
 */
function stopAnimationControls(controls) {
  if (!controls) {
    return;
  }

  if (Array.isArray(controls)) {
    controls.forEach(stopAnimationControls);
    return;
  }

  if (typeof controls.stop === "function") {
    controls.stop();
  }
}

/**
 * Removes transient inline styles from an animated element.
 *
 * @param {HTMLElement | SVGElement | null | undefined} element - Element to reset.
 * @param {string[]} [properties=["transform", "filter", "opacity", "box-shadow"]] - CSS properties to remove.
 * @returns {void}
 */
function clearMotionStyles(element, properties = ["transform", "filter", "opacity", "box-shadow"]) {
  if (!element) {
    return;
  }

  properties.forEach((property) => {
    element.style.removeProperty(property);
  });
}

/**
 * Stops the tracked transient animation for an element.
 *
 * @param {Element | null | undefined} element - Element whose animation should stop.
 * @param {string[] | undefined} clearProperties - Optional properties to clear after stopping.
 * @returns {void}
 */
function stopTransientAnimation(element, clearProperties) {
  stopAnimationControls(transientAnimations.get(element));
  transientAnimations.delete(element);

  if (clearProperties) {
    clearMotionStyles(element, clearProperties);
  }
}

/**
 * Replaces the tracked transient animation for an element.
 *
 * @param {Element} element - Element whose animation should be tracked.
 * @param {unknown} controls - Motion controller returned by `animate`.
 * @param {string[] | undefined} clearProperties - Optional properties to clear before tracking.
 * @returns {void}
 */
function setTransientAnimation(element, controls, clearProperties) {
  stopTransientAnimation(element, clearProperties);
  transientAnimations.set(element, controls);
}

/**
 * Extracts a numeric value from an element's displayed text content.
 *
 * @param {Element | null | undefined} element - Element containing a display number.
 * @returns {number} Parsed numeric value, or zero when unavailable.
 */
function parseDisplayedNumber(element) {
  const raw = element?.textContent?.replace(/[^\d.-]/g, "") || "0";
  const parsed = Number.parseFloat(raw);

  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Animates a numeric HUD value from its current display value to a target.
 *
 * @param {HTMLElement | null | undefined} element - Display element to update.
 * @param {number} targetValue - Final value to render.
 * @param {{
 *   formatter?: (value: number) => string,
 *   minDuration?: number,
 *   maxDuration?: number,
 * }} [options={}] - Animation timing and formatting options.
 * @returns {void}
 */
function animateCount(element, targetValue, options = {}) {
  if (!element) {
    return;
  }

  stopAnimationControls(numericAnimations.get(element));
  numericAnimations.delete(element);

  const currentValue = displayValues.has(element)
    ? displayValues.get(element)
    : parseDisplayedNumber(element);

  displayValues.set(element, targetValue);

  if (prefersReducedMotion() || currentValue === targetValue) {
    element.textContent = (options.formatter || formatNumber)(targetValue);
    return;
  }

  const delta = Math.abs(targetValue - currentValue);
  const minDuration = options.minDuration ?? 0.45;
  const maxDuration = options.maxDuration ?? (isMobileViewport() ? 1.15 : 1.8);
  const duration = clampNumber(0.55 + delta / 800, minDuration, maxDuration);
  const controls = animate(currentValue, targetValue, {
    duration,
    ease: "easeOut",
    onUpdate: (latest) => {
      element.textContent = (options.formatter || formatNumber)(Math.round(latest));
    },
    onComplete: () => {
      element.textContent = (options.formatter || formatNumber)(targetValue);
    },
  });

  numericAnimations.set(element, controls);
}

/**
 * Fades a single element into view.
 *
 * @param {Element | null | undefined} element - Element to animate.
 * @param {{ duration?: number, delay?: number }} [options={}] - Motion timing overrides.
 * @returns {void}
 */
function fadeInElement(element, options = {}) {
  if (!element || prefersReducedMotion()) {
    if (element) {
      clearMotionStyles(element, ["opacity", "transform"]);
    }
    return;
  }

  const controls = animate(
    element,
    { opacity: [0, 1], y: [20, 0] },
    {
      duration: options.duration ?? 0.5,
      delay: options.delay ?? 0,
      ease: "easeOut",
    },
  );

  setTransientAnimation(element, controls, ["opacity", "transform"]);
}

/**
 * Fades a collection of elements into view with staggered timing.
 *
 * @param {Iterable<Element>} elements - Elements to animate.
 * @param {{ duration?: number, staggerStep?: number, startDelay?: number }} [options={}] - Motion timing overrides.
 * @returns {void}
 */
function fadeInElements(elements, options = {}) {
  const visibleElements = Array.from(elements).filter(Boolean);

  if (!visibleElements.length || prefersReducedMotion()) {
    visibleElements.forEach((element) => clearMotionStyles(element, ["opacity", "transform"]));
    return;
  }

  const delayFor = stagger(options.staggerStep ?? 0.08, {
    startDelay: options.startDelay ?? 0,
  });

  visibleElements.forEach((element, index) => {
    fadeInElement(element, {
      duration: options.duration ?? 0.5,
      delay: delayFor(index, visibleElements.length),
    });
  });
}

/**
 * Updates the main status message with a short entrance animation.
 *
 * @param {string} text - Message text to display.
 * @returns {void}
 */
function setMessage(text) {
  message.textContent = text;
  fadeInElement(message, { duration: 0.5 });
}

/**
 * Returns a promise that resolves after a delay.
 *
 * @param {number} milliseconds - Delay in milliseconds.
 * @returns {Promise<void>} Promise that resolves after the requested delay.
 */
function delay(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

/**
 * Reads the current auto-play slider value and clamps it to the configured bounds.
 *
 * @returns {number} Selected auto-play count.
 */
function currentAutoSpinSelection() {
  return clampNumber(
    Number.parseInt(autoSpinSlider.value, 10) || autoSpinRange.defaultValue,
    autoSpinRange.min,
    autoSpinRange.max,
  );
}

/**
 * Refreshes the visible session play timer.
 *
 * @returns {void}
 */
function updatePlayTimeDisplay() {
  if (!playTimeDisplay) {
    return;
  }

  playTimeDisplay.textContent = formatDuration(Date.now() - sessionStartedAt);
}

/**
 * Starts the session play timer interval.
 *
 * @returns {void}
 */
function startPlayTimeClock() {
  updatePlayTimeDisplay();
  window.setInterval(updatePlayTimeDisplay, 1000);
}

/**
 * Updates the daily reward summary card.
 *
 * @returns {void}
 */
function updateDailyRewardDisplay() {
  const { dailyReward } = state;

  streakCount.textContent = formatDayCount(dailyReward.streak);
  dailyBonusStatus.textContent = dailyReward.statusText;
  todaysBonusAmount.textContent = `${formatNumber(dailyReward.todaysBonus)} credits`;
  nextBonusAmount.textContent = `${formatNumber(dailyReward.nextBonus)} credits`;
}

/**
 * Clears any pending timeout used to wind down purchased bonus presentation.
 *
 * @returns {void}
 */
function clearBonusPresentationTimer() {
  if (state.bonusBuy.presentationTimerId) {
    window.clearTimeout(state.bonusBuy.presentationTimerId);
    state.bonusBuy.presentationTimerId = null;
  }
}

/**
 * Synchronizes the purchased-bonus control card and reel-stage overlay.
 *
 * @returns {void}
 */
function updateBonusBuyDisplay() {
  const presentation = buildBonusPresentationState(
    state.spinCost,
    selectedBonusOffer(),
    activeBonusOffer(),
  );

  bonusBuyStatus.textContent = presentation.statusText;
  bonusBuyTotalCost.textContent = `${formatNumber(presentation.totalCost)} credits`;
  bonusBuyMultiplierDisplay.textContent = presentation.multiplierLabel;
  bonusSpinBadge.textContent = presentation.badgeText;
  bonusSpinCopy.textContent = presentation.copyText;

  reelStage.classList.remove(
    "bonus-armed",
    "bonus-spin-active",
    "bonus-tier-2",
    "bonus-tier-5",
    "bonus-tier-10",
  );
  reelStage.classList.add(...presentation.stageClasses);

  Array.from(bonusBuyOptions?.querySelectorAll("[data-bonus-offer-id]") || []).forEach((button) => {
    const offer = resolveBonusOffer(bonusOffers, button.dataset.bonusOfferId);
    const costLabel = button.querySelector(".bonus-buy-button-cost");
    if (offer && costLabel) {
      costLabel.textContent = `${formatNumber(calculateBonusSpinCost(state.spinCost, offer))} credits`;
    }
    button.classList.toggle(
      "is-selected",
      button.dataset.bonusOfferId === state.bonusBuy.selectedOfferId,
    );
  });
  bonusBuyOptions?.querySelector(".is-clear")?.classList.toggle(
    "is-selected",
    !state.bonusBuy.selectedOfferId,
  );
}

/**
 * Renders the purchase controls for the bonus-buy feature.
 *
 * @returns {void}
 */
function renderBonusBuyOptions() {
  if (!bonusBuyOptions) {
    return;
  }

  bonusBuyOptions.textContent = "";

  bonusOffers.forEach((offer) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "bonus-buy-button";
    button.dataset.bonusOfferId = offer.id;
    button.innerHTML = `
      <span class="bonus-buy-button-label">${offer.multiplier}x Multiplier</span>
      <span class="bonus-buy-button-cost">${formatNumber(calculateBonusSpinCost(state.spinCost, offer))} credits</span>
    `;
    button.addEventListener("click", () => {
      state.bonusBuy.selectedOfferId = offer.id;
      clearBonusPresentationTimer();
      updateBonusBuyDisplay();
      updateHud();
      updateControlStates();
      setMessage(
        `${offer.title} armed. The next completed spin will cost ${formatNumber(calculateBonusSpinCost(state.spinCost, offer))} credits.`,
      );
    });
    bonusBuyOptions.append(button);
  });

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "bonus-buy-button is-clear";
  clearButton.innerHTML = `
    <span class="bonus-buy-button-label">Standard Spin</span>
    <span class="bonus-buy-button-cost">Clear purchased multiplier</span>
  `;
  clearButton.addEventListener("click", () => {
    state.bonusBuy.selectedOfferId = null;
    clearBonusPresentationTimer();
    updateBonusBuyDisplay();
    updateHud();
    updateControlStates();
    setMessage("Purchased multiplier cleared. The next completed spin is back to the standard wager.");
  });
  bonusBuyOptions.append(clearButton);

  updateBonusBuyDisplay();
}

/**
 * Schedules the purchased-bonus presentation to clear after the current spin has
 * had time to settle on screen.
 *
 * @param {BonusOffer | null} offer - The bonus offer that was consumed on the spin.
 * @returns {void}
 */
function scheduleBonusPresentationClear(offer) {
  clearBonusPresentationTimer();

  if (!offer) {
    state.bonusBuy.activeOfferId = null;
    updateBonusBuyDisplay();
    return;
  }

  state.bonusBuy.presentationTimerId = window.setTimeout(() => {
    state.bonusBuy.activeOfferId = null;
    state.bonusBuy.presentationTimerId = null;
    if (!state.activeCelebrationTimer) {
      coinRain.textContent = "";
      stopPulse(glowRing);
    }
    updateBonusBuyDisplay();
  }, offer.visualIntensity >= 3 ? 2600 : 1800);
}

/**
 * Reads the persisted variable reward schedule snapshot from storage.
 *
 * @returns {object | null} The stored schedule snapshot when available.
 */
function readStoredVariableReward() {
  return readStoredJson(variableRewardStorageKey);
}

/**
 * Persists the current variable reward schedule state to storage.
 *
 * @returns {void}
 */
function persistVariableReward() {
  if (!state.variableReward) {
    return;
  }

  persistStoredJson(
    variableRewardStorageKey,
    serializeVariableRatioRewardState(state.variableReward),
  );
}

/**
 * Creates or restores the hidden variable reward schedule.
 *
 * @returns {void}
 */
function initializeVariableReward() {
  state.variableReward = restoreVariableRatioRewardState(
    readStoredVariableReward(),
    variableRatioReward,
    randomInt,
  );
  persistVariableReward();
}

/**
 * Updates the variable reward panel without revealing the hidden reward interval.
 *
 * @returns {void}
 */
function updateVariableRewardDisplay() {
  if (!state.variableReward) {
    return;
  }

  const lastVariableReward = state.variableReward.lastReward?.award || 0;
  animateCount(variableRewardLastAmount, lastVariableReward, {
    minDuration: 0.35,
    maxDuration: 0.8,
    formatter: (value) => `${formatNumber(value)} credits`,
  });
  variableRewardCount.textContent = formatNumber(state.variableReward.rewardsTriggered);
  variableRewardStatus.textContent =
    "Schedule active. Extra credits may appear after an undisclosed number of completed spins.";
}

/**
 * Refreshes the visible token-refill countdown.
 *
 * @returns {void}
 */
function updateRefillCountdownDisplay() {
  if (!refillCountdownDisplay) {
    return;
  }

  if (!state.tokenRefill.active) {
    refillCountdownDisplay.textContent = "Ready";
    return;
  }

  refillCountdownDisplay.textContent = formatCountdown(state.tokenRefill.endsAt - Date.now());
}

/**
 * Stops and resets the token-refill countdown state.
 *
 * @returns {void}
 */
function clearTokenRefillCountdown() {
  if (state.tokenRefill.timerId) {
    window.clearTimeout(state.tokenRefill.timerId);
  }

  if (state.tokenRefill.intervalId) {
    window.clearInterval(state.tokenRefill.intervalId);
  }

  state.tokenRefill.active = false;
  state.tokenRefill.endsAt = 0;
  state.tokenRefill.timerId = null;
  state.tokenRefill.intervalId = null;
  updateRefillCountdownDisplay();
}

/**
 * Completes the automatic refill and restores the minimum playable balance.
 *
 * @returns {void}
 */
function completeTokenRefillCountdown() {
  clearTokenRefillCountdown();
  state.tokens = Math.max(state.tokens, startingTokens);
  updateHud();
  updateControlStates();
  setMessage("Automatic token refill complete. The credit meter is ready.");
}

/**
 * Starts the automatic refill countdown when the balance is too low to spin.
 *
 * @returns {void}
 */
function startTokenRefillCountdown() {
  if (state.tokenRefill.active || state.tokens >= nextSpinDebit()) {
    updateRefillCountdownDisplay();
    return;
  }

  state.tokenRefill.active = true;
  state.tokenRefill.endsAt = Date.now() + tokenRefillDelayMs;
  state.tokenRefill.timerId = window.setTimeout(
    completeTokenRefillCountdown,
    tokenRefillDelayMs,
  );
  state.tokenRefill.intervalId = window.setInterval(() => {
    updateRefillCountdownDisplay();
  }, 1000);
  updateRefillCountdownDisplay();
  updateControlStates();
}

/**
 * Starts or stops the automatic refill countdown based on the current balance.
 *
 * @returns {void}
 */
function syncTokenRefillCountdown() {
  if (state.tokens < nextSpinDebit()) {
    startTokenRefillCountdown();
    return;
  }

  if (state.tokenRefill.active) {
    clearTokenRefillCountdown();
    updateControlStates();
  } else {
    updateRefillCountdownDisplay();
  }
}

/**
 * Opens the daily reward modal when a fresh reward is pending.
 *
 * @returns {void}
 */
function showDailyBonusModal() {
  if (!state.dailyReward.modalPending || !privacyModal.hidden || !dailyBonusModal) {
    return;
  }

  dailyBonusModalAmount.textContent = `+${formatNumber(state.dailyReward.lastAwardedBonus)} credits`;
  dailyBonusModalStreak.textContent = formatDayCount(state.dailyReward.streak);
  dailyBonusModalNext.textContent = `${formatNumber(state.dailyReward.nextBonus)} credits`;
  dailyBonusModal.hidden = false;
  document.body.classList.add("modal-open");
  fadeInElement(dailyBonusModalCard, {
    duration: prefersReducedMotion() ? 0 : 0.45,
  });
}

/**
 * Closes the daily reward modal and optionally chains into the low-balance warning.
 *
 * @returns {void}
 */
function closeDailyBonusModal() {
  state.dailyReward.modalPending = false;
  dailyBonusModal.hidden = true;

  if (privacyModal.hidden && wagerWarningModal.hidden) {
    document.body.classList.remove("modal-open");
  }

  if (state.tokens < nextSpinDebit()) {
    window.setTimeout(showWagerWarningModal, 120);
  }
}

/**
 * Closes the low-balance wager warning modal.
 *
 * @returns {void}
 */
function closeWagerWarningModal() {
  wagerWarningModal.hidden = true;

  if (privacyModal.hidden && dailyBonusModal.hidden) {
    document.body.classList.remove("modal-open");
  }
}

/**
 * Opens the low-balance wager warning modal.
 *
 * @returns {void}
 */
function showWagerWarningModal() {
  if (!wagerWarningModal || !privacyModal.hidden || !dailyBonusModal.hidden) {
    return;
  }

  const countdown = state.tokenRefill.active
    ? formatCountdown(state.tokenRefill.endsAt - Date.now())
    : formatCountdown(tokenRefillDelayMs);
  const activeOffer = selectedBonusOffer();
  const wagerLabel = activeOffer
    ? `${formatNumber(nextSpinDebit())} credits (${formatNumber(state.spinCost)} base + ${formatNumber(calculateBonusSpinSurcharge(state.spinCost, activeOffer))} bonus)`
    : `${formatNumber(state.spinCost)} credits`;

  wagerWarningCopy.textContent =
    `You have ${formatNumber(state.tokens)} credits, but the next spin costs ${wagerLabel}. Automatic refill completes in ${countdown}.`;
  wagerWarningModal.hidden = false;
  document.body.classList.add("modal-open");
  fadeInElement(wagerWarningModal.querySelector(".privacy-card"), {
    duration: prefersReducedMotion() ? 0 : 0.45,
  });
}

/**
 * Reads the shared wallet balance from local storage.
 *
 * @returns {number | null} Stored token balance when available.
 */
function readStoredWallet() {
  const storedWallet = readStoredJson(walletStorageKey);
  try {
    return Number.isFinite(storedWallet?.tokens) ? storedWallet.tokens : null;
  } catch (error) {
    return null;
  }
}

/**
 * Persists the shared wallet balance.
 *
 * @returns {void}
 */
function persistWallet() {
  persistStoredJson(walletStorageKey, { tokens: state.tokens });
}

/**
 * Restores the wallet balance or falls back to the configured starting credits.
 *
 * @returns {void}
 */
function initializeWallet() {
  const storedTokens = readStoredWallet();

  if (Number.isFinite(storedTokens)) {
    state.tokens = Math.max(0, storedTokens);
  }

  persistWallet();
}

/**
 * Normalizes a player name for storage and display.
 *
 * @param {unknown} name - Raw name value from input or storage.
 * @returns {string} Trimmed display name, falling back to `"Guest"`.
 */
function sanitizePlayerName(name) {
  const cleanName = String(name || "").trim().replace(/\s+/g, " ").slice(0, 18);

  return cleanName || "Guest";
}

/**
 * Reads the stored player profile snapshot from local storage.
 *
 * @returns {Partial<PlayerProfile> | null} Stored profile when available.
 */
function readStoredPlayerProfile() {
  return readStoredJson(playerProfileStorageKey);
}

/**
 * Persists the local player profile state.
 *
 * @returns {void}
 */
function persistPlayerProfile() {
  persistStoredJson(playerProfileStorageKey, state.playerProfile);
}

/**
 * Updates the inline player identity display.
 *
 * @returns {void}
 */
function updatePlayerProfileDisplay() {
  playerIconDisplay.textContent = state.playerProfile.selectedIcon;
  playerNameDisplay.textContent = state.playerProfile.name;

  if (playerNameInput && document.activeElement !== playerNameInput) {
    playerNameInput.value = state.playerProfile.name === "Guest"
      ? ""
      : state.playerProfile.name;
  }
}

/**
 * Updates the player-name status copy.
 *
 * @param {string} text - Status text to display.
 * @returns {void}
 */
function setPlayerNameStatus(text) {
  if (!playerNameStatus) {
    return;
  }

  playerNameStatus.textContent = text;
  fadeInElement(playerNameStatus, { duration: 0.35 });
}

/**
 * Renders the icon shop buttons for the main game page when present.
 *
 * @returns {void}
 */
function renderIconShop() {
  if (!iconShopList) {
    return;
  }

  iconShopList.textContent = "";

  iconCatalog.forEach((item) => {
    const owned = state.playerProfile.ownedIcons.includes(item.icon);
    const selected = state.playerProfile.selectedIcon === item.icon;
    const button = document.createElement("button");
    const icon = document.createElement("span");
    const label = document.createElement("span");
    const meta = document.createElement("span");

    button.className = "icon-shop-button";
    button.type = "button";
    button.disabled = state.spinning || state.autoSpin.active || (!owned && state.tokens < item.cost);
    button.classList.toggle("is-owned", owned);
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));

    icon.className = "icon-shop-symbol";
    icon.textContent = item.icon;
    label.className = "icon-shop-name";
    label.textContent = item.name;
    meta.className = "icon-shop-meta";
    meta.textContent = selected
      ? "Equipped"
      : owned
        ? "Equip"
        : `${formatNumber(item.cost)} credits`;

    button.append(icon, label, meta);
    button.addEventListener("click", () => {
      purchaseOrEquipIcon(item);
    });
    iconShopList.append(button);
  });
}

/**
 * Restores the stored player profile and normalizes owned icons.
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

  state.playerProfile = {
    name: sanitizePlayerName(storedProfile?.name),
    selectedIcon,
    ownedIcons,
  };

  persistPlayerProfile();
  updatePlayerProfileDisplay();
  renderIconShop();
}

/**
 * Saves the current player-name input.
 *
 * @returns {void}
 */
function savePlayerName() {
  state.playerProfile.name = sanitizePlayerName(playerNameInput.value);
  persistPlayerProfile();
  updatePlayerProfileDisplay();
  setPlayerNameStatus(`Welcome, ${state.playerProfile.name}.`);
}

/**
 * Unlocks or equips a profile icon.
 *
 * @param {IconCatalogItem} iconOption - Icon shop entry to process.
 * @returns {void}
 */
function purchaseOrEquipIcon(iconOption) {
  const owned = state.playerProfile.ownedIcons.includes(iconOption.icon);

  if (!owned && state.tokens < iconOption.cost) {
    setPlayerNameStatus(`Need ${formatNumber(iconOption.cost)} credits for ${iconOption.name}.`);
    return;
  }

  if (!owned) {
    state.tokens -= iconOption.cost;
    state.playerProfile.ownedIcons.push(iconOption.icon);
    setPlayerNameStatus(`${iconOption.name} purchased and equipped.`);
  } else {
    setPlayerNameStatus(`${iconOption.name} equipped.`);
  }

  state.playerProfile.selectedIcon = iconOption.icon;
  persistPlayerProfile();
  updatePlayerProfileDisplay();
  renderIconShop();
  updateHud();
  syncTokenRefillCountdown();
  emitParticleBurst(playerIdentityDisplay, {
    count: 14,
    spread: 130,
    lift: 28,
    palette: celebrationPalette,
  });
}

/**
 * Shares or copies an invite link for the current page.
 *
 * @returns {Promise<void>} Resolves after the share flow finishes.
 */
async function inviteFriends() {
  const inviteUrl = window.location.href.split("#")[0];
  const inviteText = "Come spin Prompt Drop Casino with me.";

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Prompt Drop Casino",
        text: inviteText,
        url: inviteUrl,
      });
      setMessage("Invite ready to send.");
      return;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(inviteUrl);
      setMessage("Invite link copied to clipboard.");
      return;
    }
  } catch (error) {
    if (error?.name === "AbortError") {
      setMessage("Invite canceled.");
      return;
    }
  }

  window.prompt("Copy this invite link:", inviteUrl);
  setMessage("Invite link ready.");
}

/**
 * Reads the stored daily-reward snapshot from local storage.
 *
 * @returns {{ lastPlayedDate?: string, streak?: number, lastBonusAmount?: number } | null} Stored reward snapshot.
 */
function readStoredDailyReward() {
  return readStoredJson(dailyRewardStorageKey);
}

/**
 * Persists the daily-reward snapshot used to calculate the next streak.
 *
 * @returns {void}
 */
function persistDailyReward() {
  persistStoredJson(dailyRewardStorageKey, {
    lastPlayedDate: state.dailyReward.lastPlayedDate,
    streak: state.dailyReward.streak,
    lastBonusAmount: state.dailyReward.todaysBonus,
  });
}

/**
 * Initializes the daily-reward state and awards the bonus when applicable.
 *
 * @returns {number} Credits awarded during initialization.
 */
function initializeDailyReward() {
  const todayKey = formatDateKey(new Date());
  const storedReward = readStoredDailyReward();
  const storedStreak = Number.isFinite(storedReward?.streak)
    ? Math.max(0, storedReward.streak)
    : 0;
  const alreadyPlayedToday = storedReward?.lastPlayedDate === todayKey;
  const dayGap = daysBetweenDateKeys(storedReward?.lastPlayedDate, todayKey);
  const streak = alreadyPlayedToday
    ? Math.max(1, storedStreak)
    : dayGap === 1
      ? Math.max(1, storedStreak) + 1
      : 1;
  const todaysBonus = dailyBonusForStreak(streak);
  const awardedBonus = alreadyPlayedToday ? 0 : todaysBonus;

  if (awardedBonus > 0) {
    state.tokens += awardedBonus;
    persistWallet();
  }

  state.dailyReward = {
    lastPlayedDate: todayKey,
    streak,
    todaysBonus,
    nextBonus: dailyBonusForStreak(streak + 1),
    lastAwardedBonus: awardedBonus,
    modalPending: awardedBonus > 0,
    statusText: awardedBonus > 0
      ? `Daily bonus awarded for a ${formatDayCount(streak)} streak.`
      : `Today's bonus was already awarded. ${formatDayCount(streak)} streak active.`,
  };

  persistDailyReward();
  updateDailyRewardDisplay();

  return awardedBonus;
}

/**
 * Computes the combined award paid after a completed spin.
 *
 * @param {object | null} paidWin - The regular payline win, if any.
 * @param {object | null} bonusReward - The variable-ratio bonus, if any.
 * @returns {number} The full credit award for the spin.
 */
function totalAwardForSpin(paidWin, bonusReward) {
  return (paidWin?.award || 0) + (bonusReward?.award || 0);
}

/**
 * Builds a history-friendly description of the completed spin outcome.
 *
 * @param {object | null} paidWin - The regular payline win, if any.
 * @param {object | null} bonusReward - The variable-ratio bonus, if any.
 * @param {{ wagerCost?: number, bonusOffer?: object | null }} spinContext - Context about the completed spin.
 * @returns {{ outcomeLabel: string, summary: string }} A concise outcome description.
 */
function describeSpinOutcome(paidWin, bonusReward, spinContext = {}) {
  const purchasedBonus = spinContext.bonusOffer || null;

  if (paidWin && bonusReward) {
    return {
      outcomeLabel: purchasedBonus ? "Boost + Bonus" : "Win + Bonus",
      summary:
        `${paidWin.line.name} paid ${formatNumber(paidWin.award)} credits and ` +
        `${bonusReward.label} added ${formatNumber(bonusReward.award)} credits.`,
    };
  }

  if (paidWin) {
    return {
      outcomeLabel: purchasedBonus ? "Boosted Win" : "Win",
      summary: purchasedBonus
        ? `${purchasedBonus.title} boosted ${paidWin.line.name} from ${formatNumber(paidWin.baseAward)} to ${formatNumber(paidWin.award)} credits.`
        : `${paidWin.line.name} paid ${formatNumber(paidWin.award)} credits on a ${paidWin.symbol.name} ${paidWin.matchCount}-match.`,
    };
  }

  if (bonusReward) {
    return {
      outcomeLabel: "Bonus",
      summary:
        `${bonusReward.label} awarded ${formatNumber(bonusReward.award)} credits ` +
        "after an undisclosed number of completed spins.",
    };
  }

  return {
    outcomeLabel: purchasedBonus ? "Boost Miss" : "No Win",
    summary: purchasedBonus
      ? `${purchasedBonus.title} was consumed with no qualifying payline at ${formatNumber(spinContext.wagerCost || state.spinCost)} credits.`
      : `No qualifying payline at ${formatNumber(spinContext.wagerCost || state.spinCost)} credits.`,
  };
}

/**
 * Synchronizes all top-level HUD values with the current game state.
 *
 * @returns {void}
 */
function updateHud() {
  animateCount(tokenCount, state.tokens);
  persistWallet();
  animateCount(spinCostDisplay, state.spinCost, {
    minDuration: 0.35,
    maxDuration: 0.7,
  });
  animateCount(
    queueCount,
    state.autoSpin.active ? state.autoSpin.remaining : currentAutoSpinSelection(),
    {
      minDuration: 0.35,
      maxDuration: 0.7,
    },
  );
  animateCount(lastAward, state.lastAward, {
    minDuration: 0.45,
    maxDuration: 1.3,
  });
  locationStatus.textContent = state.consent.locationLabel;
  updateBonusBuyDisplay();
  updateDailyRewardDisplay();
  updateVariableRewardDisplay();
  updatePlayerProfileDisplay();
}

/**
 * Updates the labels that mirror the current slider values.
 *
 * @returns {void}
 */
function updateSliderLabels() {
  animateCount(costSliderValue, state.spinCost, {
    minDuration: 0.3,
    maxDuration: 0.6,
  });
  animateCount(autoSpinValue, currentAutoSpinSelection(), {
    minDuration: 0.3,
    maxDuration: 0.6,
  });
}

/**
 * Updates the auto-play helper text.
 *
 * @param {string} [text] - Optional status override.
 * @returns {void}
 */
function updateAutoSpinStatus(text) {
  if (text) {
    autoSpinStatus.textContent = text;
    fadeInElement(autoSpinStatus, { duration: 0.4 });
    return;
  }

  if (!state.autoSpin.active) {
    autoSpinStatus.textContent = "Auto-play idle.";
    fadeInElement(autoSpinStatus, { duration: 0.4 });
    return;
  }

  autoSpinStatus.textContent = `${state.autoSpin.remaining} auto-play spin${state.autoSpin.remaining === 1 ? "" : "s"} remaining at ${formatNumber(state.autoSpin.cost)} credits each.`;
  fadeInElement(autoSpinStatus, { duration: 0.4 });
}

/**
 * Lazily creates a shared audio context for purchased bonus cues.
 *
 * @returns {AudioContext | null} The audio context when the browser supports it.
 */
function ensureBonusAudioContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextCtor) {
    return null;
  }

  if (!bonusAudioContext) {
    bonusAudioContext = new AudioContextCtor();
  }

  return bonusAudioContext;
}

/**
 * Plays the purchased bonus audio cue associated with the current spin.
 *
 * @param {BonusOffer | null} offer - The active purchased bonus offer.
 * @returns {void}
 */
function playBonusAudioCue(offer) {
  const cue = buildBonusAudioCue(offer);
  state.bonusBuy.lastAudioCue = cue.cueId;

  if (!offer || cue.notes.length === 0) {
    return;
  }

  try {
    const context = ensureBonusAudioContext();

    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const startedAt = context.currentTime;

    cue.notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const noteStart = startedAt + index * (cue.noteDurationMs / 1000) * 0.62;
      const noteEnd = noteStart + cue.noteDurationMs / 1000;

      oscillator.type = cue.waveform;
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gainNode.gain.setValueAtTime(0.0001, noteStart);
      gainNode.gain.exponentialRampToValueAtTime(cue.gain, noteStart + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteEnd + 0.03);
    });
  } catch (error) {
    console.error("Purchased bonus audio cue could not be played.", error);
  }
}

/**
 * Reads the configured shadow tokens for a button and caches them.
 *
 * @param {HTMLElement} button - Button element to inspect.
 * @returns {{ baseShadow: string, hoverShadow: string }} Cached shadow values.
 */
function readButtonShadows(button) {
  if (buttonStyleCache.has(button)) {
    return buttonStyleCache.get(button);
  }

  const styles = window.getComputedStyle(button);
  const values = {
    baseShadow: styles.getPropertyValue("--button-shadow-base").trim() || styles.boxShadow,
    hoverShadow: styles.getPropertyValue("--button-shadow-hover").trim() || styles.boxShadow,
  };

  buttonStyleCache.set(button, values);
  return values;
}

/**
 * Stops a tracked pulsing animation.
 *
 * @param {Element | null | undefined} element - Element whose pulse should stop.
 * @param {boolean} [resetStyles=true] - Whether inline styles should be cleared.
 * @returns {void}
 */
function stopPulse(element, resetStyles = true) {
  const controls = pulseAnimations.get(element);

  if (!controls) {
    return;
  }

  stopAnimationControls(controls);
  pulseAnimations.delete(element);

  if (resetStyles) {
    clearMotionStyles(element, ["transform", "box-shadow", "filter"]);
  }
}

/**
 * Starts or replaces a repeating pulse animation.
 *
 * @param {Element | null | undefined} element - Element to animate.
 * @param {Record<string, string | number | Array<string | number>>} keyframes - Motion keyframes.
 * @param {{ duration?: number, delay?: number }} [options={}] - Motion timing overrides.
 * @returns {void}
 */
function startPulse(element, keyframes, options = {}) {
  if (!element || prefersReducedMotion()) {
    return;
  }

  stopPulse(element, false);

  const controls = animate(element, keyframes, {
    duration: options.duration ?? 1.2,
    ease: "easeInOut",
    repeat: Infinity,
    delay: options.delay ?? 0,
  });

  pulseAnimations.set(element, controls);
}

/**
 * Stops a tracked bounce animation.
 *
 * @param {Element | null | undefined} element - Element whose bounce should stop.
 * @param {boolean} [resetStyles=true] - Whether inline styles should be cleared.
 * @returns {void}
 */
function stopBounce(element, resetStyles = true) {
  const controls = bounceAnimations.get(element);

  if (!controls) {
    return;
  }

  stopAnimationControls(controls);
  bounceAnimations.delete(element);

  if (resetStyles) {
    clearMotionStyles(element, ["transform"]);
  }
}

/**
 * Starts or replaces a repeating bounce animation.
 *
 * @param {Element | null | undefined} element - Element to animate.
 * @param {number} [index=0] - Index used to stagger repeated bounce targets.
 * @param {{ distance?: number, duration?: number, delayStep?: number }} [options={}] - Motion timing overrides.
 * @returns {void}
 */
function startBounce(element, index = 0, options = {}) {
  if (!element || prefersReducedMotion()) {
    return;
  }

  stopBounce(element, false);

  const controls = animate(
    element,
    { y: [0, -(options.distance ?? (isMobileViewport() ? 18 : 30)), 0] },
    {
      duration: options.duration ?? 1,
      ease: "easeInOut",
      repeat: Infinity,
      delay: (options.delayStep ?? 0.2) * index,
    },
  );

  bounceAnimations.set(element, controls);
}

/**
 * Returns whether the button should display its idle pulse treatment.
 *
 * @param {HTMLButtonElement} button - Button to inspect.
 * @returns {boolean} `true` when the button should pulse.
 */
function shouldPulseButton(button) {
  return button === spinButton && button.classList.contains("is-ready") && !button.disabled;
}

/**
 * Restores the correct idle motion for a button after hover/press interactions.
 *
 * @param {HTMLButtonElement} button - Button to update.
 * @returns {void}
 */
function resumeButtonMotion(button) {
  if (shouldPulseButton(button)) {
    const { baseShadow, hoverShadow } = readButtonShadows(button);
    startPulse(
      button,
      {
        scale: [1, 1.06, 1],
        boxShadow: [baseShadow, hoverShadow, baseShadow],
        filter: ["brightness(1)", "brightness(1.1)", "brightness(1)"],
      },
      { duration: 1.15 },
    );
    return;
  }

  stopPulse(button);
}

/**
 * Animates a button between interaction states.
 *
 * @param {HTMLElement} button - Button to animate.
 * @param {Record<string, string | number | Array<string | number>>} keyframes - Motion keyframes.
 * @returns {void}
 */
function animateButtonState(button, keyframes) {
  if (prefersReducedMotion()) {
    return;
  }

  stopTransientAnimation(button, ["transform", "box-shadow"]);
  const controls = animate(button, keyframes, {
    duration: 0.3,
    ease: "easeInOut",
  });

  setTransientAnimation(button, controls, ["transform", "box-shadow"]);
}

/**
 * Attaches hover and press animations to interactive controls.
 *
 * @returns {void}
 */
function setupAnimatedButtons() {
  const interactiveButtons = document.querySelectorAll("button, .button-link");

  interactiveButtons.forEach((button) => {
    readButtonShadows(button);

    button.addEventListener("pointerenter", () => {
      if (button.disabled || prefersReducedMotion()) {
        return;
      }

      stopPulse(button);
      const { hoverShadow } = readButtonShadows(button);
      animateButtonState(button, {
        scale: 1.05,
        boxShadow: hoverShadow,
      });
    });

    button.addEventListener("pointerleave", () => {
      if (prefersReducedMotion()) {
        return;
      }

      const { baseShadow } = readButtonShadows(button);
      animateButtonState(button, {
        scale: 1,
        boxShadow: baseShadow,
      });
      window.setTimeout(() => {
        resumeButtonMotion(button);
      }, 220);
    });

    button.addEventListener("pointerdown", () => {
      if (button.disabled || prefersReducedMotion()) {
        return;
      }

      stopPulse(button);
      animateButtonState(button, { scale: 0.95 });
    });

    const releasePointer = () => {
      if (prefersReducedMotion()) {
        return;
      }

      const hovered = button.matches(":hover");
      const { baseShadow, hoverShadow } = readButtonShadows(button);
      animateButtonState(button, {
        scale: hovered ? 1.05 : 1,
        boxShadow: hovered ? hoverShadow : baseShadow,
      });
      window.setTimeout(() => {
        resumeButtonMotion(button);
      }, 220);
    };

    button.addEventListener("pointerup", releasePointer);
    button.addEventListener("pointercancel", releasePointer);
  });
}

/**
 * Enables or disables controls based on the current runtime state.
 *
 * @returns {void}
 */
function updateControlStates() {
  const locked = state.spinning || state.autoSpin.active || !state.consent.accepted;
  const requiredCredits = nextSpinDebit();
  const readyToSpin = !locked && state.tokens >= requiredCredits;

  spinButton.disabled = locked || state.tokens < requiredCredits;
  autoSpinButton.disabled = locked || state.tokens < requiredCredits;
  resetButton.disabled = state.spinning || state.autoSpin.active;
  stopAutoSpinButton.disabled = !state.autoSpin.active;
  costSlider.disabled = state.spinning || state.autoSpin.active || !state.consent.accepted;
  autoSpinSlider.disabled = locked;
  Array.from(bonusBuyOptions?.querySelectorAll("button") || []).forEach((button) => {
    button.disabled = locked;
  });
  if (saveNameButton) {
    saveNameButton.disabled = state.spinning || state.autoSpin.active;
  }
  inviteButton.disabled = state.spinning || state.autoSpin.active;
  spinButton.classList.toggle("is-ready", readyToSpin);
  resumeButtonMotion(spinButton);
}

/**
 * Clears the visual spotlight treatment from the last-win card.
 *
 * @returns {void}
 */
function clearWinSpotlight() {
  lastAwardCard.classList.remove("is-winning", "is-jackpot");
  stopPulse(lastAwardCard);
  stopPulse(glowRing);
}

/**
 * Applies the win spotlight styling for the latest paid outcome.
 *
 * @param {PaidWin | null} paidWin - Winning outcome to emphasize.
 * @returns {void}
 */
function applyWinSpotlight(paidWin) {
  clearWinSpotlight();

  if (!paidWin) {
    return;
  }

  lastAwardCard.classList.add("is-winning");

  if (paidWin.multiplier >= 30) {
    lastAwardCard.classList.add("is-jackpot");
  }
}

/**
 * Seeds the page-level decorative sparkle field.
 *
 * @returns {void}
 */
function seedAmbientSparkles() {
  if (!ambientSparkles) {
    return;
  }

  ambientSparkles.textContent = "";
  const sparkleCount = window.innerWidth <= 760 ? 20 : 34;

  for (let index = 0; index < sparkleCount; index += 1) {
    const sparkle = document.createElement("span");
    sparkle.className = "ambient-sparkle";
    sparkle.style.setProperty("--spark-x", `${randomInt(100)}%`);
    sparkle.style.setProperty("--spark-y", `${randomInt(100)}%`);
    sparkle.style.setProperty("--spark-size", `${0.2 + randomInt(8) * 0.06}rem`);
    sparkle.style.setProperty("--spark-duration", `${4.6 + randomInt(18) * 0.35}s`);
    sparkle.style.setProperty("--spark-delay", `${randomInt(18) * 0.3}s`);
    ambientSparkles.append(sparkle);
  }
}

/**
 * Creates a single particle burst element.
 *
 * @param {HTMLElement} element - Container that receives the particle.
 * @param {{
 *   spread: number,
 *   lift: number,
 *   minSize: number,
 *   maxSize: number,
 *   minDuration: number,
 *   maxDuration: number,
 *   palette: string[],
 *   centerX: number,
 *   centerY: number,
 * }} options - Particle burst configuration.
 * @returns {void}
 */
function createParticle(element, options) {
  const particle = document.createElement("span");
  const spreadX = (Math.random() - 0.5) * options.spread;
  const spreadY = (Math.random() - 0.5) * options.spread - options.lift;

  particle.className = "fx-particle";
  particle.style.setProperty("--burst-x", `${options.centerX}px`);
  particle.style.setProperty("--burst-y", `${options.centerY}px`);
  particle.style.setProperty("--particle-x", `${spreadX}px`);
  particle.style.setProperty("--particle-y", `${spreadY}px`);
  particle.style.setProperty("--particle-size", `${options.minSize + Math.random() * (options.maxSize - options.minSize)}rem`);
  particle.style.setProperty("--particle-duration", `${options.minDuration + Math.random() * (options.maxDuration - options.minDuration)}ms`);
  particle.style.setProperty("--particle-rotate", `${randomInt(240) - 120}deg`);
  particle.style.setProperty(
    "--particle-color",
    options.palette[randomInt(options.palette.length)],
  );
  element.append(particle);
  particle.addEventListener("animationend", () => {
    particle.remove();
  }, { once: true });
}

/**
 * Emits a burst of celebratory particles from the target element.
 *
 * @param {Element | null | undefined} target - Target element used as the burst origin.
 * @param {Partial<{
 *   count: number,
 *   spread: number,
 *   lift: number,
 *   minSize: number,
 *   maxSize: number,
 *   minDuration: number,
 *   maxDuration: number,
 *   palette: string[],
 *   centerX: number,
 *   centerY: number,
 * }>} [overrides={}] - Burst overrides for a specific effect.
 * @returns {void}
 */
function emitParticleBurst(target, overrides = {}) {
  if (!fxLayer || !target) {
    return;
  }

  const rect = target.getBoundingClientRect();
  const options = {
    count: overrides.count ?? 16,
    spread: overrides.spread ?? 160,
    lift: overrides.lift ?? 40,
    minSize: overrides.minSize ?? 0.28,
    maxSize: overrides.maxSize ?? 0.75,
    minDuration: overrides.minDuration ?? 640,
    maxDuration: overrides.maxDuration ?? 1080,
    palette: overrides.palette ?? lineAccentPalette,
    centerX: overrides.centerX ?? rect.left + rect.width / 2,
    centerY: overrides.centerY ?? rect.top + rect.height / 2,
  };

  for (let index = 0; index < options.count; index += 1) {
    createParticle(fxLayer, options);
  }
}

/**
 * Attaches a celebratory particle burst to a clickable control.
 *
 * @param {HTMLElement | null | undefined} control - Control to decorate.
 * @param {Parameters<typeof emitParticleBurst>[1]} [options={}] - Burst configuration.
 * @returns {void}
 */
function attachBurstToControl(control, options = {}) {
  if (!control) {
    return;
  }

  control.addEventListener("click", () => {
    if ("disabled" in control && control.disabled) {
      return;
    }

    emitParticleBurst(control, options);
  });
}

/**
 * Builds the reel board DOM structure and near-miss overlay.
 *
 * @returns {void}
 */
function buildBoard() {
  reelBoard.textContent = "";
  state.reelElements = [];
  state.tileElements = [];
  state.nearMissLayer = null;

  for (let col = 0; col < reels; col += 1) {
    const column = document.createElement("div");
    column.className = "reel-column";
    column.setAttribute("aria-label", `Reel ${col + 1}`);

    const tileColumn = [];

    for (let row = 0; row < rows; row += 1) {
      const tile = document.createElement("div");
      tile.className = "symbol-tile";
      tile.innerHTML =
        '<span class="tile-icon"></span><span class="tile-label"></span><span class="tile-flavor"></span>';
      column.append(tile);
      tileColumn.push(tile);
    }

    reelBoard.append(column);
    state.reelElements.push(column);
    state.tileElements.push(tileColumn);
  }

  const nearMissLayer = document.createElementNS(svgNamespace, "svg");
  nearMissLayer.id = "nearMissLayer";
  nearMissLayer.classList.add("near-miss-layer");
  nearMissLayer.setAttribute("aria-hidden", "true");
  nearMissLayer.setAttribute("focusable", "false");
  reelBoard.append(nearMissLayer);
  state.nearMissLayer = nearMissLayer;
  clearNearMissLines();
}

/**
 * Renders a single symbol tile.
 *
 * @param {HTMLElement} tile - Tile element to update.
 * @param {SymbolDefinition} symbol - Symbol definition to render.
 * @returns {void}
 */
function renderTile(tile, symbol) {
  tile.dataset.symbol = symbol.key;
  tile.querySelector(".tile-icon").textContent = symbol.icon;
  tile.querySelector(".tile-label").textContent = symbol.label;
  tile.querySelector(".tile-flavor").textContent = symbol.name;
  tile.setAttribute("aria-label", symbol.name);
}

/**
 * Renders the full reel grid to the current board.
 *
 * @param {SymbolDefinition[][]} grid - Grid indexed by column then row.
 * @returns {void}
 */
function renderGrid(grid) {
  for (let col = 0; col < reels; col += 1) {
    for (let row = 0; row < rows; row += 1) {
      renderTile(state.tileElements[col][row], grid[col][row]);
    }
  }

  if (state.nearMisses.length > 0) {
    renderNearMissLines();
  }
}

/**
 * Removes the transient near-miss overlay until the next resolved spin restores it.
 *
 * @returns {void}
 */
function clearNearMissLines() {
  state.nearMisses = [];

  if (state.nearMissLayer) {
    state.nearMissLayer.textContent = "";
  }

  reelStage?.classList.remove("has-near-miss-lines");
}

/**
 * Resolves the board-space center point for a symbol tile.
 *
 * @param {{ col: number, row: number }} position - The tile position to measure.
 * @param {DOMRect} boardRect - The reel-board bounds used as the local origin.
 * @returns {{ x: number, y: number } | null} The tile center within the reel board.
 */
function nearMissPoint(position, boardRect) {
  const tile = state.tileElements[position.col]?.[position.row];

  if (!tile) {
    return null;
  }

  const tileRect = tile.getBoundingClientRect();

  return {
    x: tileRect.left - boardRect.left + tileRect.width / 2,
    y: tileRect.top - boardRect.top + tileRect.height / 2,
  };
}

function clearHighlights() {
  state.tileElements.flat().forEach((tile) => {
    tile.classList.remove("is-paid", "is-candidate");
    stopPulse(tile.querySelector(".tile-icon"));
    stopBounce(tile.querySelector(".tile-icon"));
  });
}

/**
 * Applies candidate and paid-win highlight classes to the board.
 *
 * @param {PaidWin | null} paidWin - Paid outcome to highlight.
 * @param {PaidWin[]} candidates - All qualified winning candidates for the grid.
 * @returns {void}
 */
function applyHighlights(paidWin, candidates) {
  clearHighlights();

  candidates.forEach((candidate) => {
    candidate.positions.forEach(({ col, row }) => {
      state.tileElements[col][row].classList.add("is-candidate");
    });
  });

  if (!paidWin) {
    return;
  }

  paidWin.positions.forEach(({ col, row }) => {
    const tile = state.tileElements[col][row];
    tile.classList.add("is-paid");
  });
}

/**
 * Generates a temporary random column used during the spin animation shuffle.
 *
 * @returns {SymbolDefinition[]} Random symbol column.
 */
function createRandomColumn() {
  return Array.from({ length: rows }, () => symbols[randomInt(symbols.length)]);
}

/**
 * Evaluates one payline and returns its best contiguous qualifying segment.
 *
 * @param {PaylineDefinition} line - Payline to evaluate.
 * @param {SymbolDefinition[][]} grid - Resolved symbol grid.
 * @param {number} spinCost - Base wager for the spin.
 * @returns {PaidWin | null} Best qualifying result on the line.
 */
function evaluateLine(line, grid, spinCost) {
  const symbolsOnLine = line.cells.map(({ col, row }) => grid[col][row]);
  let best = null;
  let cursor = 0;

  while (cursor < symbolsOnLine.length) {
    let next = cursor + 1;

    while (
      next < symbolsOnLine.length &&
      symbolsOnLine[next].key === symbolsOnLine[cursor].key
    ) {
      next += 1;
    }

    const matchCount = next - cursor;

    if (matchCount >= 3) {
      const symbol = symbolsOnLine[cursor];
      const multiplier = payoutMultiplier(symbol.key, matchCount);

      if (multiplier > 0) {
        const candidate = {
          line,
          symbol,
          matchCount,
          multiplier,
          award: multiplier * spinCost,
          positions: line.cells.slice(cursor, next),
        };

        if (
          !best ||
          candidate.award > best.award ||
          (candidate.award === best.award && candidate.matchCount > best.matchCount)
        ) {
          best = candidate;
        }
      }
    }

    cursor = next;
  }

  return best;
}

/**
 * Sorts qualifying wins so the highest-paying candidate wins the spin.
 *
 * @param {PaidWin} left - Left candidate.
 * @param {PaidWin} right - Right candidate.
 * @returns {number} Sort order for descending priority.
 */
function compareWins(left, right) {
  if (right.award !== left.award) {
    return right.award - left.award;
  }

  if (right.matchCount !== left.matchCount) {
    return right.matchCount - left.matchCount;
  }

  return paylines.findIndex((line) => line.id === left.line.id) -
    paylines.findIndex((line) => line.id === right.line.id);
}

/**
 * Evaluates every payline and returns the winning candidate set for the spin.
 *
 * @param {SymbolDefinition[][]} grid - Resolved symbol grid.
 * @param {number} spinCost - Base wager for the spin.
 * @returns {{ paidWin: PaidWin | null, candidates: PaidWin[] }} Spin evaluation result.
 */
function evaluateGrid(grid, spinCost) {
  const candidates = paylines
    .map((line) => evaluateLine(line, grid, spinCost))
    .filter(Boolean)
    .sort(compareWins);

  return {
    paidWin: candidates[0] || null,
    candidates,
  };
}

/**
 * Resolves a single payline that is one symbol short of its minimum award threshold.
 *
 * The detector intentionally limits each payline to one rendered near miss so the
 * connector overlay stays readable and does not duplicate both extension directions.
 *
 * @param {PaylineDefinition} line - The configured payline definition.
 * @param {SymbolDefinition[][]} grid - The resolved symbol grid for the completed spin.
 * @returns {NearMiss | null} The selected near-miss descriptor for the payline, if any.
 */
function evaluateNearMissLine(line, grid) {
  if (evaluateLine(line, grid, 1)) {
    return null;
  }

  const symbolsOnLine = line.cells.map(({ col, row }) => grid[col][row]);
  let best = null;
  let cursor = 0;

  while (cursor < symbolsOnLine.length) {
    let next = cursor + 1;

    while (
      next < symbolsOnLine.length &&
      symbolsOnLine[next].key === symbolsOnLine[cursor].key
    ) {
      next += 1;
    }

    const symbol = symbolsOnLine[cursor];
    const matchCount = next - cursor;
    const targetCount = minimumPayingMatchCount(symbol.key, line.cells.length);
    const extensionOptions = [];

    if (
      targetCount > 0 &&
      matchCount === targetCount - 1 &&
      payoutMultiplier(symbol.key, targetCount) > 0
    ) {
      if (cursor > 0) {
        extensionOptions.push({
          missingIndex: cursor - 1,
          missingPosition: line.cells[cursor - 1],
          pathCells: line.cells.slice(cursor - 1, next),
        });
      }

      if (next < line.cells.length) {
        extensionOptions.push({
          missingIndex: next,
          missingPosition: line.cells[next],
          pathCells: line.cells.slice(cursor, next + 1),
        });
      }
    }

    extensionOptions.forEach((option) => {
      const candidate = {
        line,
        symbol,
        matchCount,
        targetCount,
        potentialMultiplier: payoutMultiplier(symbol.key, targetCount),
        positions: line.cells.slice(cursor, next),
        pathCells: option.pathCells,
        missingPosition: option.missingPosition,
        missingIndex: option.missingIndex,
      };

      if (
        !best ||
        candidate.potentialMultiplier > best.potentialMultiplier ||
        (
          candidate.potentialMultiplier === best.potentialMultiplier &&
          candidate.missingIndex < best.missingIndex
        )
      ) {
        best = candidate;
      }
    });

    cursor = next;
  }

  if (!best) {
    return null;
  }

  const { missingIndex, ...nearMiss } = best;
  return nearMiss;
}

/**
 * Evaluates every configured payline for one-away near misses.
 *
 * @param {SymbolDefinition[][]} grid - The resolved symbol grid for the completed spin.
 * @returns {NearMiss[]} The ordered near-miss paylines to render.
 */
function evaluateNearMissLines(grid) {
  return paylines
    .map((line) => evaluateNearMissLine(line, grid))
    .filter(Boolean);
}

/**
 * Renders the persistent near-miss connectors above the reel board until the next spin starts.
 *
 * @param {NearMiss[]} [nearMisses=state.nearMisses] - The near-miss descriptors to render.
 * @returns {void}
 */
function renderNearMissLines(nearMisses = state.nearMisses) {
  state.nearMisses = Array.isArray(nearMisses) ? nearMisses.slice() : [];

  if (!state.nearMissLayer) {
    return;
  }

  state.nearMissLayer.textContent = "";
  reelStage?.classList.toggle("has-near-miss-lines", state.nearMisses.length > 0);

  if (state.nearMisses.length === 0) {
    return;
  }

  const boardRect = reelBoard.getBoundingClientRect();

  if (!boardRect.width || !boardRect.height) {
    return;
  }

  state.nearMissLayer.setAttribute("viewBox", `0 0 ${boardRect.width} ${boardRect.height}`);
  state.nearMissLayer.setAttribute("width", `${boardRect.width}`);
  state.nearMissLayer.setAttribute("height", `${boardRect.height}`);

  state.nearMisses.forEach((nearMiss) => {
    const points = nearMiss.pathCells
      .map((cell) => nearMissPoint(cell, boardRect))
      .filter(Boolean);

    if (points.length !== nearMiss.pathCells.length) {
      return;
    }

    const group = document.createElementNS(svgNamespace, "g");
    group.classList.add("near-miss-group");
    group.dataset.lineId = nearMiss.line.id;
    group.dataset.symbol = nearMiss.symbol.key;
    group.style.setProperty("--near-miss-accent", nearMissAccentForLine(nearMiss.line));

    const path = document.createElementNS(svgNamespace, "polyline");
    path.classList.add("near-miss-path");
    path.setAttribute(
      "points",
      points.map(({ x, y }) => `${x},${y}`).join(" "),
    );
    group.append(path);

    nearMiss.pathCells.forEach((cell, index) => {
      const point = points[index];
      const node = document.createElementNS(svgNamespace, "circle");
      const isMissingStop = (
        cell.col === nearMiss.missingPosition.col &&
        cell.row === nearMiss.missingPosition.row
      );
      node.classList.add("near-miss-node");

      if (isMissingStop) {
        node.classList.add("is-missing");
      }

      node.setAttribute("cx", `${point.x}`);
      node.setAttribute("cy", `${point.y}`);
      node.setAttribute("r", isMissingStop ? "12" : "8");
      group.append(node);
    });

    state.nearMissLayer.append(group);
  });
}

/**
 * Animates the breakdown rows into view.
 *
 * @returns {void}
 */
function animateBreakdownEntrance() {
  fadeInElements(breakdownList.children, {
    duration: 0.45,
    staggerStep: 0.07,
  });
}

/**
 * Renders the placeholder breakdown while the spin is still resolving.
 *
 * @returns {void}
 */
function renderPendingBreakdown() {
  breakdownList.textContent = "";

  const item = document.createElement("tr");
  const cell = document.createElement("td");
  cell.className = "empty-state";
  cell.colSpan = 3;
  cell.textContent = "Resolving reel outcome and evaluating qualifying paylines.";
  item.append(cell);
  breakdownList.append(item);
  winMeta.textContent = "Evaluating highest qualifying payline.";
  fadeInElement(winMeta, { duration: 0.4 });
  animateBreakdownEntrance();
}

/**
 * Renders the recent spin-history list.
 *
 * @returns {void}
 */
function renderSpinHistory() {
  spinHistoryList.textContent = "";

  if (state.spinHistory.length === 0) {
    const item = document.createElement("li");
    item.className = "empty-state";
    item.textContent = "No spins recorded yet.";
    spinHistoryList.append(item);
    fadeInElements(spinHistoryList.children, {
      duration: 0.4,
      staggerStep: 0.06,
    });
    return;
  }

  state.spinHistory.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "history-item";
    item.innerHTML = `
      <div class="history-title">
        <span>Spin ${formatNumber(entry.spinNumber)}</span>
        <span class="history-badge">${index === 0 ? "Newest" : entry.outcomeLabel}</span>
      </div>
      <span class="history-copy">${entry.summary}</span>
    `;
    spinHistoryList.append(item);
  });

  fadeInElements(spinHistoryList.children, {
    duration: 0.42,
    staggerStep: 0.06,
  });
}

/**
 * Renders the default empty breakdown state.
 *
 * @returns {void}
 */
function renderIdleBreakdown() {
  breakdownList.textContent = "";

  const item = document.createElement("tr");
  const cell = document.createElement("td");
  cell.className = "empty-state";
  cell.colSpan = 3;
  cell.textContent = "No winning paylines have been recorded.";
  item.append(cell);
  breakdownList.append(item);
  winMeta.textContent = "Waiting for first completed spin.";
  fadeInElement(winMeta, { duration: 0.4 });
  animateBreakdownEntrance();
}

/**
 * Renders the completed-spin breakdown table.
 *
 * @param {PaidWin | null} paidWin - Primary paid win, if any.
 * @param {PaidWin[]} candidates - All qualified candidates from the grid.
 * @param {BonusReward | null} [bonusReward=null] - Hidden variable-ratio reward, if any.
 * @param {{ wagerCost?: number, bonusOffer?: BonusOffer | null }} [spinContext={}] - Completed spin context.
 * @returns {void}
 */
function renderBreakdown(paidWin, candidates, bonusReward = null, spinContext = {}) {
  const purchasedBonus = spinContext.bonusOffer || null;
  breakdownList.textContent = "";

  if (!paidWin && !bonusReward) {
    const item = document.createElement("tr");
    const cell = document.createElement("td");
    cell.className = "empty-state";
    cell.colSpan = 3;
    cell.textContent =
      purchasedBonus
        ? `${purchasedBonus.title} was consumed, but no qualifying payline reached the paytable.`
        : "No qualifying payline. The wager was deducted from the credit meter.";
    item.append(cell);
    breakdownList.append(item);
    winMeta.textContent = purchasedBonus
      ? `${purchasedBonus.title} completed with no 3-symbol qualifying payline.`
      : "No payline reached 3 matching symbols.";
    fadeInElement(winMeta, { duration: 0.4 });
    animateBreakdownEntrance();
    return;
  }

  if (paidWin) {
    const paidItem = document.createElement("tr");
    paidItem.className = "breakdown-item";
    paidItem.innerHTML = `
      <td class="paid-item breakdown-result">Paid</td>
      <td class="paid-item breakdown-detail">${paidWin.line.name}: ${paidWin.symbol.name} ${paidWin.matchCount} of a kind for ${paidWin.multiplier}x${paidWin.bonusMultiplierApplied ? ` (boosted from ${paidWin.baseMultiplier}x by ${paidWin.bonusOffer.title})` : ""}</td>
      <td class="paid-item breakdown-award">${formatNumber(paidWin.award)} credits</td>
    `;
    breakdownList.append(paidItem);
  }

  if (bonusReward) {
    const bonusItem = document.createElement("tr");
    bonusItem.className = "breakdown-item";
    bonusItem.innerHTML = `
      <td class="paid-item breakdown-result">Bonus</td>
      <td class="paid-item breakdown-detail">${bonusReward.label}: ${bonusReward.multiplier}x wager awarded after an undisclosed number of completed spins</td>
      <td class="paid-item breakdown-award">${formatNumber(bonusReward.award)} credits</td>
    `;
    breakdownList.append(bonusItem);
  }

  candidates.slice(1).forEach((candidate) => {
    const item = document.createElement("tr");
    item.className = "breakdown-item";
    item.innerHTML = `
      <td class="shadow-item breakdown-result">Qualified</td>
      <td class="shadow-item breakdown-detail">${candidate.line.name}: ${candidate.symbol.name} ${candidate.matchCount} of a kind for ${candidate.multiplier}x</td>
      <td class="shadow-item breakdown-award">Not paid</td>
    `;
    breakdownList.append(item);
  });

  if (paidWin && bonusReward) {
    winMeta.textContent =
      `${paidWin.line.name} paid ${paidWin.multiplier}x and ${bonusReward.label} ` +
      `added ${bonusReward.multiplier}x. ${candidates.length - 1} additional ` +
      `qualifying payline${candidates.length === 2 ? "" : "s"} not paid.`;
  } else if (paidWin) {
    winMeta.textContent =
      `${paidWin.line.name} paid ${paidWin.multiplier}x${purchasedBonus ? ` with ${purchasedBonus.title}` : ""}. ${candidates.length - 1} ` +
      `additional qualifying payline${candidates.length === 2 ? "" : "s"} not paid.`;
  } else {
    winMeta.textContent =
      `${bonusReward.label} awarded a hidden bonus after a completed spin with no qualifying payline.`;
  }
  fadeInElement(winMeta, { duration: 0.4 });
  animateBreakdownEntrance();
}

/**
 * Adds a completed spin to the short recent-history list.
 *
 * @param {PaidWin | null} paidWin - Primary paid outcome, if any.
 * @param {BonusReward | null} bonusReward - Hidden bonus outcome, if any.
 * @param {{ wagerCost?: number, bonusOffer?: BonusOffer | null }} [spinContext={}] - Completed spin context.
 * @returns {void}
 */
function recordSpinHistory(paidWin, bonusReward, spinContext = {}) {
  const spinNumber = state.spinHistory.length > 0
    ? state.spinHistory[0].spinNumber + 1
    : 1;
  const outcome = describeSpinOutcome(paidWin, bonusReward, spinContext);

  state.spinHistory.unshift(
    {
      spinNumber,
      outcomeLabel: outcome.outcomeLabel,
      summary: outcome.summary,
    },
  );
  state.spinHistory = state.spinHistory.slice(0, 3);
  renderSpinHistory();
}

/**
 * Stops all non-idle celebration animations.
 *
 * @returns {void}
 */
function stopCelebrationMotion() {
  Array.from(pulseAnimations.keys()).forEach((element) => {
    if (element !== spinButton) {
      stopPulse(element);
    }
  });

  Array.from(bounceAnimations.keys()).forEach((element) => {
    stopBounce(element);
  });
}

/**
 * Clears the active celebration state from the board and HUD.
 *
 * @returns {void}
 */
function clearCelebration() {
  reelStage.classList.remove("sparkling", "jackpot");
  coinRain.textContent = "";
  clearWinSpotlight();
  stopCelebrationMotion();

  if (state.activeCelebrationTimer) {
    window.clearTimeout(state.activeCelebrationTimer);
    state.activeCelebrationTimer = null;
  }
}

/**
 * Launches pre-spin presentation for a purchased multiplier.
 *
 * @param {BonusOffer | null} offer - The purchased bonus offer for the live spin.
 * @returns {void}
 */
function triggerBonusSpinPresentation(offer) {
  if (!offer) {
    return;
  }

  updateBonusBuyDisplay();
  playBonusAudioCue(offer);

  if (prefersReducedMotion()) {
    return;
  }

  emitParticleBurst(reelStage, {
    count: offer.visualIntensity === 1 ? 16 : offer.visualIntensity === 2 ? 24 : 34,
    spread: offer.visualIntensity === 1 ? 150 : offer.visualIntensity === 2 ? 210 : 300,
    lift: offer.visualIntensity === 1 ? 34 : offer.visualIntensity === 2 ? 48 : 72,
    minSize: 0.22,
    maxSize: offer.visualIntensity === 3 ? 0.88 : 0.62,
    palette: offer.visualIntensity === 3
      ? [...celebrationPalette, "#FFFFFF"]
      : celebrationPalette.slice(0, offer.visualIntensity + 1),
  });

  startPulse(
    glowRing,
    {
      scale: [1, 1.018, 1],
      boxShadow: [
        `0 0 18px ${themedRgba("--win-glow-rgb", 0.1)}`,
        `0 0 34px ${themedRgba("--win-glow-rgb", 0.22)}`,
        `0 0 18px ${themedRgba("--win-glow-rgb", 0.1)}`,
      ],
    },
    { duration: offer.visualIntensity === 3 ? 0.78 : 1.05 },
  );

  if (offer.visualIntensity >= 2) {
    emitParticleBurst(lastAwardCard, {
      count: offer.visualIntensity === 2 ? 12 : 18,
      spread: 150,
      lift: offer.visualIntensity === 2 ? 26 : 36,
      minSize: 0.2,
      maxSize: offer.visualIntensity === 2 ? 0.56 : 0.72,
      palette: [celebrationPalette[0], celebrationPalette[1], "#FFFFFF"],
    });
  }

  if (offer.visualIntensity >= 3) {
    createCoinRain(offer.multiplier * 2);
  }
}

/**
 * Renders a falling coin overlay sized to the celebration intensity.
 *
 * @param {number} multiplier - Multiplier used to scale the coin count.
 * @returns {void}
 */
function createCoinRain(multiplier) {
  coinRain.textContent = "";

  const coinCount = Math.min(isMobileViewport() ? 38 : 72, 22 + multiplier * 2);

  for (let index = 0; index < coinCount; index += 1) {
    const coin = document.createElement("div");
    coin.className = "coin";
    coin.textContent = "TOK";
    coin.style.left = `${randomInt(96)}%`;
    coin.style.setProperty("--drift", `${randomInt(160) - 80}px`);
    coin.style.setProperty("--fall-duration", `${1.5 + randomInt(10) * 0.14}s`);
    coin.style.animationDelay = `${index * (isMobileViewport() ? 0.08 : 0.06)}s`;
    coinRain.append(coin);
  }
}

/**
 * Applies celebratory motion to the win-related UI elements.
 *
 * @param {PaidWin | null} paidWin - Paid outcome to celebrate.
 * @returns {void}
 */
function animateCelebrationTargets(paidWin) {
  if (!paidWin || prefersReducedMotion()) {
    return;
  }

  const paidIcons = (paidWin.positions || [])
    .map(({ col, row }) => state.tileElements[col]?.[row]?.querySelector(".tile-icon"))
    .filter(Boolean);
  const awardBadge = breakdownList.querySelector(".paid-item .breakdown-award");
  const activeBonusButton = state.bonusBuy.activeOfferId
    ? bonusBuyOptions?.querySelector(`[data-bonus-offer-id="${state.bonusBuy.activeOfferId}"]`)
    : null;
  const bounceTargets = [lastAward, tokenCount, awardBadge, ...paidIcons].filter(Boolean);
  const limitedBounceTargets = isMobileViewport()
    ? bounceTargets.slice(0, 3)
    : bounceTargets;

  limitedBounceTargets.forEach((element, index) => {
    startBounce(element, index, {
      distance: isMobileViewport() ? 18 : 30,
      delayStep: 0.2,
      duration: 1,
    });
  });

  paidIcons.slice(0, isMobileViewport() ? 2 : paidIcons.length).forEach((icon, index) => {
    startPulse(
      icon,
      {
        scale: [1, 1.08, 1],
        filter: [
          `drop-shadow(0 0 0 ${themedRgba("--win-glow-rgb", 0)})`,
          `drop-shadow(0 0 10px ${themedRgba("--win-glow-rgb", 0.38)})`,
          `drop-shadow(0 0 0 ${themedRgba("--win-glow-rgb", 0)})`,
        ],
      },
      {
        duration: 1.2,
        delay: index * 0.12,
      },
    );
  });

  if (activeBonusButton) {
    startPulse(
      activeBonusButton,
      {
        scale: [1, 1.14, 1],
        boxShadow: [
          `0 0 14px ${themedRgba("--win-glow-rgb", 0.2)}`,
          `0 0 28px ${themedRgba("--win-glow-rgb", 0.38)}`,
          `0 0 14px ${themedRgba("--win-glow-rgb", 0.2)}`,
        ],
      },
      { duration: 1.15 },
    );
  }
}

/**
 * Triggers the celebration effects for a paid win.
 *
 * @param {PaidWin | null} paidWin - Paid outcome to celebrate.
 * @returns {void}
 */
function triggerCelebration(paidWin) {
  clearCelebration();

  if (!paidWin) {
    return;
  }

  applyWinSpotlight(paidWin);
  animateCelebrationTargets(paidWin);

  if (paidWin.multiplier >= 12) {
    reelStage.classList.add("sparkling");
    startPulse(
      glowRing,
      {
        scale: [1, 1.015, 1],
        boxShadow: [
          `0 0 18px ${themedRgba("--win-glow-rgb", 0.08)}`,
          `0 0 34px ${themedRgba("--win-glow-rgb", 0.18)}`,
          `0 0 18px ${themedRgba("--win-glow-rgb", 0.08)}`,
        ],
      },
      { duration: 1.25 },
    );
  }

  if (paidWin.multiplier >= 16) {
    createCoinRain(paidWin.multiplier);
    startPulse(
      lastAwardCard,
      {
        scale: [1, 1.03, 1],
        boxShadow: [
          `0 0 0 1px ${themedRgba("--win-glow-rgb", 0.3)}, 0 0 26px ${themedRgba("--win-glow-rgb", 0.16)}`,
          `0 0 0 1px ${themedRgba("--win-glow-rgb", 0.46)}, 0 0 42px ${themedRgba("--win-glow-rgb", 0.28)}`,
          `0 0 0 1px ${themedRgba("--win-glow-rgb", 0.3)}, 0 0 26px ${themedRgba("--win-glow-rgb", 0.16)}`,
        ],
      },
      { duration: 1.2 },
    );
  }

  if (paidWin.multiplier >= 30) {
    reelStage.classList.add("jackpot");
    lastAwardCard.classList.add("is-jackpot");
  }

  if (paidWin.multiplier >= 12) {
    emitParticleBurst(reelStage, {
      count: paidWin.multiplier >= 30 ? 34 : 22,
      spread: paidWin.multiplier >= 30 ? 320 : 220,
      lift: paidWin.multiplier >= 30 ? 90 : 56,
      minSize: 0.26,
      maxSize: paidWin.multiplier >= 30 ? 0.92 : 0.72,
      palette: paidWin.multiplier >= 30
        ? [...celebrationPalette, "#FFFFFF"]
        : celebrationPalette.slice(0, 3),
    });
    emitParticleBurst(lastAwardCard, {
      count: paidWin.multiplier >= 30 ? 18 : 10,
      spread: 160,
      lift: 34,
      minSize: 0.24,
      maxSize: 0.58,
      palette: [celebrationPalette[0], celebrationPalette[1], "#FFFFFF"],
    });
  }

  if (paidWin.multiplier >= 12) {
    state.activeCelebrationTimer = window.setTimeout(() => {
      clearCelebration();
      updateControlStates();
    }, paidWin.multiplier >= 30 ? 5200 : 3800);
  }
}

/**
 * Seeds the reel-stage sparkle overlay.
 *
 * @returns {void}
 */
function seedSparkles() {
  sparkleField.textContent = "";

  for (let index = 0; index < 22; index += 1) {
    const sparkle = document.createElement("span");
    sparkle.className = "sparkle";
    sparkle.style.left = `${randomInt(92)}%`;
    sparkle.style.top = `${randomInt(88)}%`;
    sparkle.style.animationDelay = `${index * 0.12}s`;
    sparkle.style.animationDuration = `${2 + randomInt(10) * 0.16}s`;
    sparkleField.append(sparkle);
  }
}

/**
 * Generates and renders the initial board state.
 *
 * @returns {void}
 */
function seedBoard() {
  state.visibleGrid = createSpinGrid();
  renderGrid(state.visibleGrid);
}

/**
 * Animates one reel column to its final resolved symbols.
 *
 * @param {number} colIndex - Zero-based column index.
 * @param {SymbolDefinition[]} finalColumn - Final symbol column to render.
 * @returns {Promise<void>} Resolves after the column animation completes.
 */
async function animateColumn(colIndex, finalColumn) {
  const reelElement = state.reelElements[colIndex];
  const duration = prefersReducedMotion()
    ? 240
    : 700 + colIndex * 180;

  if (prefersReducedMotion()) {
    for (let row = 0; row < rows; row += 1) {
      renderTile(state.tileElements[colIndex][row], finalColumn[row]);
    }
    fadeInElements(state.tileElements[colIndex], {
      duration: 0.3,
      staggerStep: 0.04,
    });
    return;
  }

  reelElement.classList.add("spinning");
  const shuffler = window.setInterval(() => {
    const randomColumn = createRandomColumn();

    for (let row = 0; row < rows; row += 1) {
      renderTile(state.tileElements[colIndex][row], randomColumn[row]);
    }
  }, 90);

  await delay(duration);
  window.clearInterval(shuffler);
  reelElement.classList.remove("spinning");

  for (let row = 0; row < rows; row += 1) {
    renderTile(state.tileElements[colIndex][row], finalColumn[row]);
  }
}

/**
 * Runs a single player-initiated or auto-play spin.
 *
 * @returns {Promise<{ completed: boolean, paidWin?: PaidWin | null }>} Spin completion summary.
 */
async function spin() {
  if (state.spinning || !state.consent.accepted) {
    return { completed: false };
  }

  const purchasedBonus = selectedBonusOffer();
  const spinDebit = calculateBonusSpinCost(state.spinCost, purchasedBonus);

  if (state.tokens < spinDebit) {
    startTokenRefillCountdown();
    showWagerWarningModal();
    setMessage(
      `Insufficient credits. Automatic refill in ${formatCountdown(state.tokenRefill.endsAt - Date.now())}.`,
    );
    return { completed: false };
  }

  state.spinning = true;
  state.bonusBuy.activeOfferId = purchasedBonus?.id || null;
  state.bonusBuy.selectedOfferId = null;
  updateControlStates();
  clearNearMissLines();
  clearHighlights();
  clearCelebration();
  clearBonusPresentationTimer();
  updateBonusBuyDisplay();
  triggerBonusSpinPresentation(purchasedBonus);

  try {
    state.tokens -= spinDebit;
    state.lastAward = 0;
    updateHud();
    renderPendingBreakdown();
    setMessage(
      purchasedBonus
        ? `${purchasedBonus.title} spin live. Resolving enhanced reel odds...`
        : "Reels spinning. Resolving wager outcome...",
    );

    const finalGrid = createSpinGrid(purchasedBonus?.symbolWeights);

    await Promise.all(
      finalGrid.map((column, colIndex) => animateColumn(colIndex, column)),
    );

    state.visibleGrid = finalGrid;

    const baseOutcome = evaluateGrid(finalGrid, state.spinCost);
    const nearMisses = evaluateNearMissLines(finalGrid);
    const paidWin = applyBonusMultiplierToWin(baseOutcome.paidWin, purchasedBonus);
    const candidates = baseOutcome.candidates;
    const bonusReward = purchasedBonus
      ? null
      : advanceVariableRatioReward(
        state.variableReward,
        state.spinCost,
        randomInt,
      );
    const totalAward = totalAwardForSpin(paidWin, bonusReward);
    if (!purchasedBonus) {
      persistVariableReward();
    }
    const spinContext = {
      wagerCost: spinDebit,
      bonusOffer: purchasedBonus,
    };

    if (totalAward > 0) {
      state.tokens += totalAward;
      state.lastAward = totalAward;
    }

    updateHud();
    renderBreakdown(paidWin, candidates, bonusReward, spinContext);
    recordSpinHistory(paidWin, bonusReward, spinContext);
    applyHighlights(paidWin, candidates);
    renderNearMissLines(nearMisses);

    try {
      triggerCelebration(paidWin);
    } catch (error) {
      console.error("Celebration effect failed after spin resolution.", error);
    }

    if (!paidWin && !bonusReward) {
      setMessage(
        purchasedBonus
          ? `${purchasedBonus.title} was consumed with no qualifying payline.`
          : "No win. No qualifying paylines were awarded.",
      );
    } else if (!paidWin && bonusReward) {
      setMessage(
        `${bonusReward.label} awarded ${formatNumber(bonusReward.award)} credits after an undisclosed number of completed spins.`,
      );
    } else if (paidWin && bonusReward) {
      setMessage(
        `${paidWin.line.name} paid ${formatNumber(paidWin.award)} credits and ${bonusReward.label} added ${formatNumber(bonusReward.award)} credits.`,
      );
    } else if (purchasedBonus) {
      setMessage(
        `${purchasedBonus.title} boosted ${paidWin.line.name} from ${formatNumber(paidWin.baseAward)} to ${formatNumber(paidWin.award)} credits.`,
      );
    } else if (paidWin.multiplier >= 30) {
      setMessage(
        `Jackpot win: ${paidWin.line.name} paid ${paidWin.symbol.name} at ${paidWin.multiplier}x.`,
      );
    } else if (paidWin.multiplier >= 16) {
      setMessage(
        `Premium win: ${paidWin.symbol.name} on ${paidWin.line.name} paid ${formatNumber(paidWin.award)} credits.`,
      );
    } else {
      setMessage(
        `Win recorded: ${paidWin.line.name} paid ${formatNumber(paidWin.award)} credits.`,
      );
    }

    scheduleBonusPresentationClear(purchasedBonus);
    syncTokenRefillCountdown();
    if (state.tokens < nextSpinDebit()) {
      showWagerWarningModal();
    }

    return { completed: true, paidWin };
  } finally {
    if (state.bonusBuy.activeOfferId && !state.bonusBuy.presentationTimerId) {
      scheduleBonusPresentationClear(purchasedBonus);
    }
    state.spinning = false;
    updateControlStates();
  }
}

/**
 * Executes the active auto-play queue until completion or interruption.
 *
 * @returns {Promise<void>} Resolves when auto-play stops.
 */
async function runAutoSpin() {
  while (state.autoSpin.active && state.autoSpin.remaining > 0) {
    if (state.autoSpin.stopRequested) {
      break;
    }

    const result = await spin();

    if (!result.completed) {
      break;
    }

    state.autoSpin.remaining -= 1;
    state.autoSpin.cost = nextSpinDebit();
    updateHud();

    if (state.autoSpin.remaining > 0 && !state.autoSpin.stopRequested) {
      updateAutoSpinStatus();
      await delay(280);
    }
  }

  const stoppedByUser = state.autoSpin.stopRequested;
  const spinsLeft = state.autoSpin.remaining;

  state.autoSpin.active = false;
  state.autoSpin.stopRequested = false;
  updateHud();
  updateAutoSpinStatus();
  updateControlStates();

  if (spinsLeft === 0) {
    setMessage("Auto-play complete.");
    return;
  }

  if (stoppedByUser) {
    setMessage("Auto-play stopped after the current spin.");
    return;
  }

  setMessage("Auto-play halted because there were insufficient credits for the next wager.");
}

/**
 * Starts auto-play with the currently selected queue size.
 *
 * @returns {Promise<void>} Resolves after the auto-play session ends.
 */
async function startAutoSpin() {
  if (state.spinning || state.autoSpin.active || !state.consent.accepted) {
    return;
  }

  const selectedCount = currentAutoSpinSelection();
  const openingSpinDebit = nextSpinDebit();

  if (state.tokens < openingSpinDebit) {
    startTokenRefillCountdown();
    showWagerWarningModal();
    setMessage(
      `Auto-play could not start. Automatic refill in ${formatCountdown(state.tokenRefill.endsAt - Date.now())}.`,
    );
    return;
  }

  state.autoSpin.active = true;
  state.autoSpin.remaining = selectedCount;
  state.autoSpin.stopRequested = false;
  state.autoSpin.cost = openingSpinDebit;
  updateHud();
  updateAutoSpinStatus();
  updateControlStates();
  setMessage(
    `${selectedBonusOffer() ? `${selectedBonusOffer().title} is armed for the opening auto-play spin. ` : ""}Auto-play set for ${formatNumber(selectedCount)} spin${selectedCount === 1 ? "" : "s"} starting at ${formatNumber(openingSpinDebit)} credits.`,
  );

  await runAutoSpin();
}

/**
 * Requests that auto-play stop after the current spin.
 *
 * @returns {void}
 */
function stopAutoSpin() {
  if (!state.autoSpin.active) {
    return;
  }

  state.autoSpin.stopRequested = true;
  updateAutoSpinStatus("Stop requested. Auto-play will end after the current spin.");
}

/**
 * Resets the playable board state and credit meter.
 *
 * @returns {void}
 */
function resetGame() {
  if (state.spinning || state.autoSpin.active) {
    return;
  }

  state.tokens = startingTokens;
  state.lastAward = 0;
  state.bonusBuy.activeOfferId = null;
  clearBonusPresentationTimer();
  clearTokenRefillCountdown();
  clearHighlights();
  clearCelebration();
  seedBoard();
  updateHud();
  renderIdleBreakdown();
  setMessage("Credit meter reloaded. Place your wager to continue.");
  fadeInElement(reelStage, { duration: 0.5 });
}

/**
 * Populates the manual state-selection dropdown.
 *
 * @returns {void}
 */
function populateStateSelect() {
  states.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.code;
    option.textContent = entry.name;
    stateSelect.append(option);
  });
}

/**
 * Persists the consent and location acknowledgement state.
 *
 * @returns {void}
 */
function persistConsent() {
  persistStoredJson(consentStorageKey, state.consent);
}

/**
 * Reads the stored consent snapshot from local storage.
 *
 * @returns {Partial<ConsentState> | null} Stored consent state when available.
 */
function readStoredConsent() {
  return readStoredJson(consentStorageKey);
}

/**
 * Refreshes the explanatory copy shown for the current location acknowledgement.
 *
 * @returns {void}
 */
function updateLocationFeedback() {
  locationFeedback.textContent = state.consent.locationLabel === "Pending"
    ? "No location submitted. You can also choose your state manually."
    : `${state.consent.locationLabel}. ${complianceReminder}`;
  fadeInElement(locationFeedback, { duration: 0.4 });
  updateHud();
}

/**
 * Opens or closes the consent modal based on acceptance state.
 *
 * @param {boolean} accepted - Whether access should be enabled.
 * @returns {void}
 */
function applyConsentState(accepted) {
  state.consent.accepted = accepted;

  if (accepted) {
    privacyModal.hidden = true;
    document.body.classList.remove("modal-open");
    updateControlStates();
    window.setTimeout(showDailyBonusModal, 120);
    return;
  }

  privacyModal.hidden = false;
  document.body.classList.add("modal-open");
  updateControlStates();
  fadeInElement(privacyCard, {
    duration: prefersReducedMotion() ? 0 : 0.5,
  });
}

/**
 * Returns whether the consent modal can be accepted.
 *
 * @returns {boolean} `true` when all required acknowledgements are complete.
 */
function canAcceptConsent() {
  return (
    privacyCheckbox.checked &&
    termsCheckbox.checked &&
    state.consent.locationMode !== "none"
  );
}

/**
 * Enables or disables the consent acceptance button.
 *
 * @returns {void}
 */
function updateConsentButtonState() {
  privacyAcceptButton.disabled = !canAcceptConsent();
}

/**
 * Applies the manually selected state from the dropdown.
 *
 * @returns {void}
 */
function applyManualStateSelection() {
  const stateCode = stateSelect.value;

  if (!stateCode) {
    if (state.consent.locationMode === "manual") {
      state.consent.locationMode = "none";
      state.consent.locationLabel = "Pending";
      state.consent.stateCode = "";
      updateLocationFeedback();
      updateConsentButtonState();
    }
    return;
  }

  const selectedState = states.find((entry) => entry.code === stateCode);
  state.consent.locationMode = "manual";
  state.consent.stateCode = stateCode;
  state.consent.locationLabel = `Manual: ${selectedState.name}`;
  state.consent.coords = null;
  updateLocationFeedback();
  updateConsentButtonState();
}

/**
 * Requests device geolocation for the eligibility reminder flow.
 *
 * @returns {void}
 */
function requestLocation() {
  if (!navigator.geolocation) {
    locationFeedback.textContent =
      "This browser does not provide device location. Select your state manually to continue.";
    return;
  }

  locationButton.disabled = true;
  locationFeedback.textContent = "Requesting device location...";
  fadeInElement(locationFeedback, { duration: 0.35 });

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const latitude = position.coords.latitude.toFixed(2);
      const longitude = position.coords.longitude.toFixed(2);
      state.consent.locationMode = "geolocation";
      state.consent.coords = {
        latitude: Number(latitude),
        longitude: Number(longitude),
      };
      state.consent.stateCode = stateSelect.value || "";
      state.consent.locationLabel = `Location Shared: ${latitude}, ${longitude}`;
      locationButton.disabled = false;
      updateLocationFeedback();
      updateConsentButtonState();
    },
    () => {
      locationButton.disabled = false;
      locationFeedback.textContent =
        "Location request was denied or unavailable. Select your state manually to continue.";
      fadeInElement(locationFeedback, { duration: 0.35 });
      updateConsentButtonState();
    },
    {
      enableHighAccuracy: false,
      timeout: 7000,
      maximumAge: 300000,
    },
  );
}

/**
 * Restores the stored consent state or opens the consent modal for a new visitor.
 *
 * @returns {void}
 */
function initializeConsent() {
  const storedConsent = readStoredConsent();

  if (storedConsent && storedConsent.accepted) {
    state.consent = {
      accepted: true,
      locationMode: storedConsent.locationMode || "none",
      locationLabel: storedConsent.locationLabel || "Accepted",
      coords: storedConsent.coords || null,
      stateCode: storedConsent.stateCode || "",
    };

    if (state.consent.stateCode) {
      stateSelect.value = state.consent.stateCode;
    }

    privacyCheckbox.checked = true;
    termsCheckbox.checked = true;
    applyConsentState(true);
    updateLocationFeedback();
    return;
  }

  state.consent.locationMode = "none";
  state.consent.locationLabel = "Pending";
  state.consent.coords = null;
  state.consent.stateCode = "";
  privacyCheckbox.checked = false;
  termsCheckbox.checked = false;
  applyConsentState(false);
  updateLocationFeedback();
  updateConsentButtonState();
}

/**
 * Initializes the wager and auto-play sliders from configuration.
 *
 * @returns {void}
 */
function initializeSliders() {
  costSlider.min = String(minSpinCost);
  costSlider.max = String(maxSpinCost);
  costSlider.value = String(defaultSpinCost);
  autoSpinSlider.min = String(autoSpinRange.min);
  autoSpinSlider.max = String(autoSpinRange.max);
  autoSpinSlider.value = String(autoSpinRange.defaultValue);
  state.spinCost = defaultSpinCost;
  state.autoSpin.remaining = autoSpinRange.defaultValue;
  updateSliderLabels();
}

/**
 * Seeds the number-animation cache with the current HUD values.
 *
 * @returns {void}
 */
function seedDisplayValues() {
  [
    [tokenCount, state.tokens],
    [spinCostDisplay, state.spinCost],
    [queueCount, state.autoSpin.remaining],
    [lastAward, state.lastAward],
    [variableRewardLastAmount, state.variableReward?.lastReward?.award || 0],
    [bonusBuyTotalCost, nextSpinDebit()],
    [costSliderValue, state.spinCost],
    [autoSpinValue, currentAutoSpinSelection()],
  ].forEach(([element, value]) => {
    displayValues.set(element, value);
    element.textContent = formatNumber(value);
  });
}

/**
 * Plays the initial page-load entrance animations.
 *
 * @returns {void}
 */
function fadeInInitialLayout() {
  fadeInElement(document.querySelector(".hero"), { duration: 0.55 });
  fadeInElements(document.querySelectorAll(".status-bar .stat-card"), {
    duration: 0.45,
    staggerStep: 0.05,
    startDelay: 0.08,
  });
  fadeInElement(reelStage, { duration: 0.5 });
  fadeInElements(document.querySelectorAll(".control-grid .control-card"), {
    duration: 0.45,
    staggerStep: 0.06,
    startDelay: 0.12,
  });
}

initializeTheme();
buildBoard();
seedAmbientSparkles();
seedSparkles();
seedBoard();
populateStateSelect();
initializeSliders();
renderBonusBuyOptions();
initializeWallet();
initializePlayerProfile();
const initialDailyBonusAward = initializeDailyReward();
initializeVariableReward();
seedDisplayValues();
updateHud();
syncTokenRefillCountdown();
updateAutoSpinStatus();
renderIdleBreakdown();
renderSpinHistory();
setupAnimatedButtons();
initializeConsent();
fadeInInitialLayout();
startPlayTimeClock();

if (state.tokens < nextSpinDebit()) {
  window.setTimeout(showWagerWarningModal, 180);
}

if (initialDailyBonusAward > 0) {
  setMessage(
    `Daily bonus awarded: ${formatNumber(initialDailyBonusAward)} credits. ${formatDayCount(state.dailyReward.streak)} streak active.`,
  );
}

themeToggle?.addEventListener("click", toggleTheme);

costSlider.addEventListener("input", () => {
  state.spinCost = clampNumber(
    Number.parseInt(costSlider.value, 10) || defaultSpinCost,
    minSpinCost,
    maxSpinCost,
  );
  updateSliderLabels();
  updateHud();
  syncTokenRefillCountdown();
  if (state.tokens < nextSpinDebit()) {
    showWagerWarningModal();
  }
  updateControlStates();
});

autoSpinSlider.addEventListener("input", () => {
  updateSliderLabels();
  updateHud();
});

spinButton.addEventListener("click", spin);
autoSpinButton.addEventListener("click", startAutoSpin);
stopAutoSpinButton.addEventListener("click", stopAutoSpin);
resetButton.addEventListener("click", resetGame);
inviteButton.addEventListener("click", inviteFriends);
locationButton.addEventListener("click", requestLocation);
stateSelect.addEventListener("change", applyManualStateSelection);
privacyCheckbox.addEventListener("change", updateConsentButtonState);
termsCheckbox.addEventListener("change", updateConsentButtonState);
dailyBonusCloseButton.addEventListener("click", closeDailyBonusModal);
wagerWarningCloseButton.addEventListener("click", closeWagerWarningModal);
wagerWarningRefillButton.addEventListener("click", () => {
  closeWagerWarningModal();
  resetGame();
});
privacyAcceptButton.addEventListener("click", () => {
  if (!canAcceptConsent()) {
    return;
  }

  applyConsentState(true);
  state.consent.accepted = true;
  persistConsent();
  updateHud();
  setMessage("Eligibility acknowledgement recorded. Game access enabled.");
});

attachBurstToControl(spinButton, {
  count: 14,
  spread: 140,
  lift: 28,
  palette: celebrationPalette,
});
attachBurstToControl(autoSpinButton, {
  count: 12,
  spread: 132,
  lift: 28,
  palette: [celebrationPalette[1], celebrationPalette[2], celebrationPalette[0]],
});
attachBurstToControl(stopAutoSpinButton, {
  count: 10,
  spread: 120,
  lift: 18,
  palette: [celebrationPalette[2], celebrationPalette[3], celebrationPalette[0]],
});
attachBurstToControl(resetButton, {
  count: 12,
  spread: 132,
  lift: 26,
  palette: [celebrationPalette[0], celebrationPalette[1], celebrationPalette[2]],
});
attachBurstToControl(inviteButton, {
  count: 12,
  spread: 132,
  lift: 26,
  palette: [celebrationPalette[2], celebrationPalette[0], celebrationPalette[1]],
});
attachBurstToControl(saveNameButton, {
  count: 10,
  spread: 120,
  lift: 24,
  palette: [celebrationPalette[0], celebrationPalette[2], celebrationPalette[1]],
});
attachBurstToControl(locationButton, {
  count: 10,
  spread: 120,
  lift: 26,
  palette: [celebrationPalette[1], celebrationPalette[2], celebrationPalette[0]],
});
attachBurstToControl(dailyBonusCloseButton, {
  count: 16,
  spread: 160,
  lift: 34,
  palette: [celebrationPalette[0], celebrationPalette[1], "#FFFFFF"],
});
attachBurstToControl(privacyAcceptButton, {
  count: 16,
  spread: 160,
  lift: 34,
  palette: [celebrationPalette[0], celebrationPalette[1], "#FFFFFF"],
});

window.promptDropDebug = {
  animateColumn,
  animateCount,
  buildBonusPresentationState,
  bonusOffers,
  calculateBonusSpinCost,
  clearNearMissLines,
  emitParticleBurst,
  evaluateGrid,
  evaluateNearMissLines,
  fadeInElement,
  renderGrid,
  renderNearMissLines,
  prefersReducedMotion,
  isMobileViewport,
  playBonusAudioCue,
  seedAmbientSparkles,
  spin,
  triggerCelebration,
  triggerBonusSpinPresentation,
  updateBonusBuyDisplay,
  updateControlStates,
  selectBonusOffer: (offerId) => {
    state.bonusBuy.selectedOfferId = offerId;
    updateBonusBuyDisplay();
    updateHud();
    updateControlStates();
  },
  clearBonusOffer: () => {
    state.bonusBuy.selectedOfferId = null;
    updateBonusBuyDisplay();
    updateHud();
    updateControlStates();
  },
  getMotionState: () => ({
    readyPulse: pulseAnimations.has(spinButton),
    pulseTargets: pulseAnimations.size,
    bounceTargets: bounceAnimations.size,
  }),
  getBonusState: () => ({
    selectedOfferId: state.bonusBuy.selectedOfferId,
    activeOfferId: state.bonusBuy.activeOfferId,
    lastAudioCue: state.bonusBuy.lastAudioCue,
    nextSpinDebit: nextSpinDebit(),
    reelStageClasses: Array.from(reelStage.classList),
    overlayText: {
      badge: bonusSpinBadge?.textContent || "",
      copy: bonusSpinCopy?.textContent || "",
      status: bonusBuyStatus?.textContent || "",
    },
  }),
  getNearMissState: () => ({
    count: state.nearMisses.length,
    lines: state.nearMisses.map((nearMiss) => ({
      lineId: nearMiss.line.id,
      symbolKey: nearMiss.symbol.key,
      matchCount: nearMiss.matchCount,
      targetCount: nearMiss.targetCount,
      missingPosition: nearMiss.missingPosition,
    })),
    layerPresent: Boolean(state.nearMissLayer),
    pathCount: state.nearMissLayer?.querySelectorAll(".near-miss-path").length || 0,
    nodeCount: state.nearMissLayer?.querySelectorAll(".near-miss-node").length || 0,
  }),
  state,
};

window.addEventListener("resize", () => {
  seedAmbientSparkles();
  seedSparkles();
  renderNearMissLines();
});
