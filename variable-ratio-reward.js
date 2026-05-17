/**
 * Defines the classroom-only variable-ratio reward scheduler used by the game
 * and its deterministic browser tests.
 */
(function defineVariableRatioReward() {
  const defaultSpinWindow = Object.freeze({ min: 3, max: 8 });
  const defaultRewardMultipliers = Object.freeze([2, 3, 4, 5, 6]);

  /**
   * Returns a bounded integer and falls back when the input is invalid.
   *
   * @param {number} value - The value to sanitize.
   * @param {number} minimum - The allowed minimum.
   * @param {number} maximum - The allowed maximum.
   * @param {number} fallback - The value to use when the input is invalid.
   * @returns {number} A safe integer inside the requested range.
   */
  function clampInteger(value, minimum, maximum, fallback) {
    const candidate = Number.isFinite(value) ? Math.round(value) : fallback;
    return Math.min(maximum, Math.max(minimum, candidate));
  }

  /**
   * Normalizes the hidden spin window used to schedule the next reward.
   *
   * @param {{ min?: number, max?: number } | undefined} spinWindow - Raw schedule bounds.
   * @returns {{ min: number, max: number }} A safe inclusive spin window.
   */
  function normalizeSpinWindow(spinWindow) {
    const normalizedMin = clampInteger(
      spinWindow?.min,
      1,
      1_000,
      defaultSpinWindow.min,
    );
    const normalizedMax = clampInteger(
      spinWindow?.max,
      normalizedMin,
      1_000,
      Math.max(defaultSpinWindow.max, normalizedMin),
    );

    return {
      min: normalizedMin,
      max: normalizedMax,
    };
  }

  /**
   * Normalizes the list of reward multipliers used when a bonus triggers.
   *
   * @param {number[] | undefined} rewardMultipliers - Raw multiplier values.
   * @returns {number[]} A non-empty list of positive integer multipliers.
   */
  function normalizeRewardMultipliers(rewardMultipliers) {
    const sanitizedValues = Array.isArray(rewardMultipliers)
      ? rewardMultipliers
        .filter(Number.isFinite)
        .map((value) => Math.max(1, Math.round(value)))
      : [];

    return sanitizedValues.length > 0
      ? sanitizedValues
      : [...defaultRewardMultipliers];
  }

  /**
   * Normalizes the exported reward schedule configuration.
   *
   * @param {{
   *   spinWindow?: { min?: number, max?: number },
   *   rewardMultipliers?: number[],
   *   rewardLabel?: string,
   * } | undefined} config - Raw configuration values.
   * @returns {{
   *   spinWindow: { min: number, max: number },
   *   rewardMultipliers: number[],
   *   rewardLabel: string,
   * }} A fully normalized schedule configuration.
   */
  function normalizeVariableRatioConfig(config) {
    const rewardLabel = typeof config?.rewardLabel === "string" && config.rewardLabel.trim()
      ? config.rewardLabel.trim()
      : "Variable Ratio Bonus";

    return {
      spinWindow: normalizeSpinWindow(config?.spinWindow),
      rewardMultipliers: normalizeRewardMultipliers(config?.rewardMultipliers),
      rewardLabel,
    };
  }

  /**
   * Returns a random index inside the provided upper bound.
   *
   * @param {number} max - Exclusive upper bound.
   * @returns {number} A random integer between 0 and `max - 1`.
   */
  function fallbackRandomIndex(max) {
    return Math.floor(Math.random() * max);
  }

  /**
   * Chooses the hidden number of completed spins required before the next reward.
   *
   * @param {{ min: number, max: number }} spinWindow - Inclusive spin interval bounds.
   * @param {(max: number) => number} randomIndex - Random index generator.
   * @returns {number} The next undisclosed completed-spin target.
   */
  function createHiddenSpinTarget(spinWindow, randomIndex) {
    const rangeWidth = spinWindow.max - spinWindow.min + 1;
    return spinWindow.min + randomIndex(rangeWidth);
  }

  /**
   * Chooses a reward multiplier from the configured multiplier list.
   *
   * @param {number[]} rewardMultipliers - The configured multiplier table.
   * @param {(max: number) => number} randomIndex - Random index generator.
   * @returns {number} The selected reward multiplier.
   */
  function chooseRewardMultiplier(rewardMultipliers, randomIndex) {
    return rewardMultipliers[randomIndex(rewardMultipliers.length)];
  }

  /**
   * Creates a fresh reward schedule state.
   *
   * @param {{
   *   spinWindow?: { min?: number, max?: number },
   *   rewardMultipliers?: number[],
   *   rewardLabel?: string,
   * } | undefined} config - Raw configuration values.
   * @param {(max: number) => number} [randomIndex=fallbackRandomIndex] - Random index generator.
   * @returns {{
   *   config: {
   *     spinWindow: { min: number, max: number },
   *     rewardMultipliers: number[],
   *     rewardLabel: string,
   *   },
   *   spinsSinceLastReward: number,
   *   spinsUntilReward: number,
   *   rewardsTriggered: number,
   *   lastReward: null | {
   *     label: string,
   *     multiplier: number,
   *     award: number,
   *     completedSpins: number,
   *     rewardNumber: number,
   *   },
   * }} A ready-to-use mutable schedule state.
   */
  function createVariableRatioRewardState(config, randomIndex = fallbackRandomIndex) {
    const normalizedConfig = normalizeVariableRatioConfig(config);

    return {
      config: normalizedConfig,
      spinsSinceLastReward: 0,
      spinsUntilReward: createHiddenSpinTarget(normalizedConfig.spinWindow, randomIndex),
      rewardsTriggered: 0,
      lastReward: null,
    };
  }

  /**
   * Restores a reward schedule from persisted data while preserving validation guarantees.
   *
   * @param {object | null | undefined} snapshot - Persisted schedule snapshot.
   * @param {{
   *   spinWindow?: { min?: number, max?: number },
   *   rewardMultipliers?: number[],
   *   rewardLabel?: string,
   * } | undefined} config - Current configuration values.
   * @param {(max: number) => number} [randomIndex=fallbackRandomIndex] - Random index generator.
   * @returns {ReturnType<typeof createVariableRatioRewardState>} A restored schedule state.
   */
  function restoreVariableRatioRewardState(snapshot, config, randomIndex = fallbackRandomIndex) {
    const state = createVariableRatioRewardState(config, randomIndex);
    const persistedSpinsSinceLastReward = clampInteger(
      snapshot?.spinsSinceLastReward,
      0,
      1_000_000,
      0,
    );
    const persistedRewardsTriggered = clampInteger(
      snapshot?.rewardsTriggered,
      0,
      1_000_000,
      0,
    );
    const persistedSpinTarget = clampInteger(
      snapshot?.spinsUntilReward,
      state.config.spinWindow.min,
      state.config.spinWindow.max,
      state.spinsUntilReward,
    );
    const persistedLastReward = snapshot?.lastReward &&
      Number.isFinite(snapshot.lastReward?.award) &&
      Number.isFinite(snapshot.lastReward?.multiplier)
      ? {
          label: typeof snapshot.lastReward.label === "string" && snapshot.lastReward.label.trim()
            ? snapshot.lastReward.label.trim()
            : state.config.rewardLabel,
          multiplier: Math.max(1, Math.round(snapshot.lastReward.multiplier)),
          award: Math.max(0, Math.round(snapshot.lastReward.award)),
          completedSpins: clampInteger(
            snapshot.lastReward.completedSpins,
            1,
            1_000_000,
            1,
          ),
          rewardNumber: clampInteger(
            snapshot.lastReward.rewardNumber,
            1,
            1_000_000,
            Math.max(1, persistedRewardsTriggered),
          ),
        }
      : null;

    state.spinsSinceLastReward = Math.min(
      persistedSpinsSinceLastReward,
      persistedSpinTarget - 1,
    );
    state.spinsUntilReward = persistedSpinTarget;
    state.rewardsTriggered = persistedRewardsTriggered;
    state.lastReward = persistedLastReward;

    return state;
  }

  /**
   * Produces a storage-safe snapshot of the reward schedule.
   *
   * @param {ReturnType<typeof createVariableRatioRewardState>} state - The live schedule state.
   * @returns {{
   *   spinsSinceLastReward: number,
   *   spinsUntilReward: number,
   *   rewardsTriggered: number,
   *   lastReward: object | null,
   * }} A serializable snapshot.
   */
  function serializeVariableRatioRewardState(state) {
    return {
      spinsSinceLastReward: state.spinsSinceLastReward,
      spinsUntilReward: state.spinsUntilReward,
      rewardsTriggered: state.rewardsTriggered,
      lastReward: state.lastReward,
    };
  }

  /**
   * Advances the schedule by one completed spin and returns a reward when the hidden target is met.
   *
   * @param {ReturnType<typeof createVariableRatioRewardState>} state - The live schedule state.
   * @param {number} spinCost - The completed spin's wager amount.
   * @param {(max: number) => number} [randomIndex=fallbackRandomIndex] - Random index generator.
   * @returns {null | {
   *   label: string,
   *   multiplier: number,
   *   award: number,
   *   completedSpins: number,
   *   rewardNumber: number,
   * }} The awarded bonus, if one triggered on this spin.
   */
  function advanceVariableRatioReward(state, spinCost, randomIndex = fallbackRandomIndex) {
    state.spinsSinceLastReward += 1;

    if (state.spinsSinceLastReward < state.spinsUntilReward) {
      return null;
    }

    const multiplier = chooseRewardMultiplier(state.config.rewardMultipliers, randomIndex);
    const reward = {
      label: state.config.rewardLabel,
      multiplier,
      award: Math.max(0, multiplier * Math.max(0, Math.round(spinCost))),
      completedSpins: state.spinsUntilReward,
      rewardNumber: state.rewardsTriggered + 1,
    };

    state.rewardsTriggered += 1;
    state.lastReward = reward;
    state.spinsSinceLastReward = 0;
    state.spinsUntilReward = createHiddenSpinTarget(state.config.spinWindow, randomIndex);

    return reward;
  }

  window.VARIABLE_RATIO_REWARD = Object.freeze({
    normalizeVariableRatioConfig,
    createVariableRatioRewardState,
    restoreVariableRatioRewardState,
    serializeVariableRatioRewardState,
    advanceVariableRatioReward,
  });
})();
