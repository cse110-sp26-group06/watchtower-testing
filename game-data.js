/**
 * @typedef {Object} ReelPosition
 * @property {number} col - Zero-based reel index.
 * @property {number} row - Zero-based row index.
 */

/**
 * @typedef {Object} SymbolDefinition
 * @property {string} key - Stable symbol identifier.
 * @property {string} name - Human-readable symbol name.
 * @property {string} label - Short label rendered on the reel tile.
 * @property {string} icon - Decorative icon rendered on the reel tile.
 * @property {number} weight - Default weight used for random selection.
 * @property {Record<number, number>} payouts - Match-count to multiplier mapping.
 * @property {string} flavor - Descriptive helper copy for the paytable.
 */

/**
 * @typedef {Object} PaylineDefinition
 * @property {string} id - Stable payline identifier.
 * @property {string} name - Human-readable payline name.
 * @property {string} description - Short explanation of the path.
 * @property {ReelPosition[]} cells - Ordered positions evaluated on the payline.
 */

/**
 * @typedef {Object} BonusOffer
 * @property {string} id - Stable offer identifier.
 * @property {string} title - UI label for the offer.
 * @property {number} multiplier - Award multiplier applied to a paid win.
 * @property {number} priceMultiplier - Cost multiplier applied to the base wager.
 * @property {string} stageClass - CSS class used for reel-stage presentation.
 * @property {number} visualIntensity - Relative strength of the visual treatment.
 * @property {number} targetRtp - Classroom tuning metadata for the purchased spin.
 * @property {Record<string, number>} symbolWeights - Symbol weights used for the boosted spin.
 */

/**
 * Defines the static slot configuration shared by the main game, profile page,
 * paytable page, and tests.
 */
(function defineSlotConfig() {
  const rows = 3;
  const reels = 5;
  const startingTokens = 3000;
  const defaultSpinCost = 60;
  const minSpinCost = 10;
  const maxSpinCost = 500;
  const autoSpinRange = { min: 1, max: 30, defaultValue: 10 };
  const variableRatioReward = {
    rewardLabel: "Variable Ratio Bonus",
    spinWindow: { min: 3, max: 8 },
    rewardMultipliers: [2, 3, 4, 5, 6],
  };
  const bonusOffers = [
    {
      id: "bonus-2x",
      title: "2x Multiplier",
      multiplier: 2,
      priceMultiplier: 1.66,
      stageClass: "bonus-tier-2",
      visualIntensity: 1,
      targetRtp: 0.95,
      symbolWeights: {
        star: 1,
        diamond: 2,
        gold: 4,
        silver: 6,
        bronze: 9,
        blank: 10,
      },
    },
    {
      id: "bonus-5x",
      title: "5x Multiplier",
      multiplier: 5,
      priceMultiplier: 4.76,
      stageClass: "bonus-tier-5",
      visualIntensity: 2,
      targetRtp: 0.95,
      symbolWeights: {
        star: 1,
        diamond: 2,
        gold: 4,
        silver: 7,
        bronze: 9,
        blank: 9,
      },
    },
    {
      id: "bonus-10x",
      title: "10x Multiplier",
      multiplier: 10,
      priceMultiplier: 11.51,
      stageClass: "bonus-tier-10",
      visualIntensity: 3,
      targetRtp: 0.95,
      symbolWeights: {
        star: 1,
        diamond: 2,
        gold: 4,
        silver: 7,
        bronze: 9,
        blank: 7,
      },
    },
  ];

  const symbols = [
    {
      key: "star",
      name: "Star",
      label: "STAR",
      icon: "★",
      weight: 1,
      payouts: { 3: 25, 4: 80, 5: 240 },
      flavor: "Ultra-rare premium symbol with the largest fixed payout.",
    },
    {
      key: "diamond",
      name: "Diamond",
      label: "DIAMOND",
      icon: "◆",
      weight: 2,
      payouts: { 3: 14, 4: 44, 5: 132 },
      flavor: "Rare high-value symbol with stronger paytable returns.",
    },
    {
      key: "gold",
      name: "Gold",
      label: "GOLD",
      icon: "⬢",
      weight: 4,
      payouts: { 3: 6, 4: 18, 5: 54 },
      flavor: "Mid-tier premium symbol with expanded payouts.",
    },
    {
      key: "silver",
      name: "Silver",
      label: "SILVER",
      icon: "◈",
      weight: 6,
      payouts: { 3: 2, 4: 7, 5: 21 },
      flavor: "Standard symbol with modest but improved payout potential.",
    },
    {
      key: "bronze",
      name: "Bronze",
      label: "BRONZE",
      icon: "⬡",
      weight: 8,
      payouts: { 3: 1, 4: 3, 5: 9 },
      flavor: "Low-value symbol with small payouts when it lines up.",
    },
    {
      key: "blank",
      name: "Blank",
      label: "MISS",
      icon: "○",
      weight: 12,
      payouts: {},
      flavor: "Non-paying stop added to make high-limit wins harder to hit.",
    },
  ];

  const paylines = [
    {
      id: "top-row",
      name: "Top Row",
      description: "Five-cell horizontal payline across the top row.",
      cells: [
        { col: 0, row: 0 },
        { col: 1, row: 0 },
        { col: 2, row: 0 },
        { col: 3, row: 0 },
        { col: 4, row: 0 },
      ],
    },
    {
      id: "middle-row",
      name: "Middle Row",
      description: "Five-cell horizontal payline across the middle row.",
      cells: [
        { col: 0, row: 1 },
        { col: 1, row: 1 },
        { col: 2, row: 1 },
        { col: 3, row: 1 },
        { col: 4, row: 1 },
      ],
    },
    {
      id: "bottom-row",
      name: "Bottom Row",
      description: "Five-cell horizontal payline across the bottom row.",
      cells: [
        { col: 0, row: 2 },
        { col: 1, row: 2 },
        { col: 2, row: 2 },
        { col: 3, row: 2 },
        { col: 4, row: 2 },
      ],
    },
    {
      id: "column-1",
      name: "Column 1",
      description: "Three-cell vertical payline on reel one.",
      cells: [
        { col: 0, row: 0 },
        { col: 0, row: 1 },
        { col: 0, row: 2 },
      ],
    },
    {
      id: "column-2",
      name: "Column 2",
      description: "Three-cell vertical payline on reel two.",
      cells: [
        { col: 1, row: 0 },
        { col: 1, row: 1 },
        { col: 1, row: 2 },
      ],
    },
    {
      id: "column-3",
      name: "Column 3",
      description: "Three-cell vertical payline on reel three.",
      cells: [
        { col: 2, row: 0 },
        { col: 2, row: 1 },
        { col: 2, row: 2 },
      ],
    },
    {
      id: "column-4",
      name: "Column 4",
      description: "Three-cell vertical payline on reel four.",
      cells: [
        { col: 3, row: 0 },
        { col: 3, row: 1 },
        { col: 3, row: 2 },
      ],
    },
    {
      id: "column-5",
      name: "Column 5",
      description: "Three-cell vertical payline on reel five.",
      cells: [
        { col: 4, row: 0 },
        { col: 4, row: 1 },
        { col: 4, row: 2 },
      ],
    },
    {
      id: "diagonal-down",
      name: "Top Left To Bottom Right",
      description: "Three-point diagonal running corner to corner through the center.",
      cells: [
        { col: 0, row: 0 },
        { col: 2, row: 1 },
        { col: 4, row: 2 },
      ],
    },
    {
      id: "diagonal-up",
      name: "Bottom Left To Top Right",
      description: "Three-point diagonal running corner to corner through the center.",
      cells: [
        { col: 0, row: 2 },
        { col: 2, row: 1 },
        { col: 4, row: 0 },
      ],
    },
  ];

  const states = [
    { code: "AL", name: "Alabama" },
    { code: "AK", name: "Alaska" },
    { code: "AZ", name: "Arizona" },
    { code: "AR", name: "Arkansas" },
    { code: "CA", name: "California" },
    { code: "CO", name: "Colorado" },
    { code: "CT", name: "Connecticut" },
    { code: "DE", name: "Delaware" },
    { code: "DC", name: "District of Columbia" },
    { code: "FL", name: "Florida" },
    { code: "GA", name: "Georgia" },
    { code: "HI", name: "Hawaii" },
    { code: "ID", name: "Idaho" },
    { code: "IL", name: "Illinois" },
    { code: "IN", name: "Indiana" },
    { code: "IA", name: "Iowa" },
    { code: "KS", name: "Kansas" },
    { code: "KY", name: "Kentucky" },
    { code: "LA", name: "Louisiana" },
    { code: "ME", name: "Maine" },
    { code: "MD", name: "Maryland" },
    { code: "MA", name: "Massachusetts" },
    { code: "MI", name: "Michigan" },
    { code: "MN", name: "Minnesota" },
    { code: "MS", name: "Mississippi" },
    { code: "MO", name: "Missouri" },
    { code: "MT", name: "Montana" },
    { code: "NE", name: "Nebraska" },
    { code: "NV", name: "Nevada" },
    { code: "NH", name: "New Hampshire" },
    { code: "NJ", name: "New Jersey" },
    { code: "NM", name: "New Mexico" },
    { code: "NY", name: "New York" },
    { code: "NC", name: "North Carolina" },
    { code: "ND", name: "North Dakota" },
    { code: "OH", name: "Ohio" },
    { code: "OK", name: "Oklahoma" },
    { code: "OR", name: "Oregon" },
    { code: "PA", name: "Pennsylvania" },
    { code: "RI", name: "Rhode Island" },
    { code: "SC", name: "South Carolina" },
    { code: "SD", name: "South Dakota" },
    { code: "TN", name: "Tennessee" },
    { code: "TX", name: "Texas" },
    { code: "UT", name: "Utah" },
    { code: "VT", name: "Vermont" },
    { code: "VA", name: "Virginia" },
    { code: "WA", name: "Washington" },
    { code: "WV", name: "West Virginia" },
    { code: "WI", name: "Wisconsin" },
    { code: "WY", name: "Wyoming" },
  ];

  const defaultSymbolWeights = Object.fromEntries(
    symbols.map((symbol) => [symbol.key, symbol.weight]),
  );
  const weightedStopCache = new Map();

  /**
   * Builds the weighted stop list used to resolve reel outcomes for a symbol
   * weight profile.
   *
   * @param {Record<string, number> | undefined} symbolWeights - Optional weight overrides.
   * @returns {SymbolDefinition[]} The cached weighted stop list for the requested profile.
   */
  function resolveWeightedStops(symbolWeights) {
    const effectiveWeights = symbols.map((symbol) => ({
      key: symbol.key,
      weight: Math.max(
        1,
        Number.parseInt(symbolWeights?.[symbol.key] ?? defaultSymbolWeights[symbol.key], 10) || 1,
      ),
    }));
    const cacheKey = JSON.stringify(effectiveWeights);

    if (!weightedStopCache.has(cacheKey)) {
      weightedStopCache.set(
        cacheKey,
        effectiveWeights.flatMap(({ key, weight }) => {
          const symbol = symbols.find((entry) => entry.key === key);
          return Array.from({ length: weight }, () => symbol);
        }),
      );
    }

    return weightedStopCache.get(cacheKey);
  }

  /**
   * Returns a secure random integer when the browser supports Web Crypto and
   * falls back to `Math.random` otherwise.
   *
   * @param {number} max - Exclusive upper bound.
   * @returns {number} A random integer between `0` and `max - 1`.
   */
  function randomInt(max) {
    if (window.crypto && window.crypto.getRandomValues) {
      const values = new Uint32Array(1);
      window.crypto.getRandomValues(values);
      return values[0] % max;
    }

    return Math.floor(Math.random() * max);
  }

  /**
   * Chooses a symbol from the weighted stop table.
   *
   * @param {Record<string, number> | undefined} symbolWeights - Optional weight overrides.
   * @returns {SymbolDefinition} The selected symbol definition.
   */
  function pickWeightedSymbol(symbolWeights) {
    const weightedStops = resolveWeightedStops(symbolWeights);
    return weightedStops[randomInt(weightedStops.length)];
  }

  /**
   * Creates the symbol grid for a completed spin.
   *
   * @param {Record<string, number> | undefined} [symbolWeights] - Optional weight overrides.
   * @returns {SymbolDefinition[][]} The generated reel grid indexed by column then row.
   */
  function createSpinGrid(symbolWeights) {
    return Array.from({ length: reels }, () =>
      Array.from({ length: rows }, () => pickWeightedSymbol(symbolWeights)),
    );
  }

  /**
   * Returns the payout multiplier for a symbol and contiguous match count.
   *
   * @param {string} symbolKey - Symbol identifier to inspect.
   * @param {number} matchCount - Number of contiguous matching stops.
   * @returns {number} The configured payout multiplier, or zero when none exists.
   */
  function payoutMultiplier(symbolKey, matchCount) {
    const symbol = symbols.find((entry) => entry.key === symbolKey);

    if (!symbol) {
      return 0;
    }

    return symbol.payouts[matchCount] || 0;
  }

  window.SLOT_CONFIG = {
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
    defaultSymbolWeights,
    createSpinGrid,
    payoutMultiplier,
    randomInt,
    complianceReminder:
      "Location is collected only for an on-device reminder that gaming requirements differ by state. This game does not determine legal eligibility.",
  };
})();
