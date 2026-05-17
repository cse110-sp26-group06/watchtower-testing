/**
 * Defines the purchased-bonus helper functions shared by the main game and the
 * corresponding test fixtures.
 */
(function defineBonusFeatures() {
  /**
   * Rounds an arbitrary numeric value to the nearest whole credit amount.
   *
   * @param {number} value - The raw numeric value to normalize.
   * @returns {number} A safe non-negative integer credit amount.
   */
  function roundCredits(value) {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(0, Math.round(value));
  }

  /**
   * Looks up a configured bonus offer by identifier.
   *
   * @param {Array<object>} offers - The configured list of bonus offers.
   * @param {string | null | undefined} offerId - The requested offer identifier.
   * @returns {object | null} The matching offer when found.
   */
  function resolveBonusOffer(offers, offerId) {
    if (!Array.isArray(offers) || typeof offerId !== "string") {
      return null;
    }

    return offers.find((offer) => offer.id === offerId) || null;
  }

  /**
   * Calculates the full credit cost for the next spin when a bonus offer is armed.
   *
   * @param {number} spinCost - The currently selected base wager.
   * @param {object | null} offer - The armed bonus offer.
   * @returns {number} The full debit for the next completed spin.
   */
  function calculateBonusSpinCost(spinCost, offer) {
    const normalizedSpinCost = roundCredits(spinCost);

    if (!offer) {
      return normalizedSpinCost;
    }

    return roundCredits(normalizedSpinCost * offer.priceMultiplier);
  }

  /**
   * Calculates the incremental premium charged above the base wager.
   *
   * @param {number} spinCost - The currently selected base wager.
   * @param {object | null} offer - The armed bonus offer.
   * @returns {number} The additional credits charged for the bonus.
   */
  function calculateBonusSpinSurcharge(spinCost, offer) {
    return Math.max(
      0,
      calculateBonusSpinCost(spinCost, offer) - roundCredits(spinCost),
    );
  }

  /**
   * Applies the purchased multiplier to a qualifying payline win.
   *
   * @param {object | null} paidWin - The resolved payline result before bonus uplift.
   * @param {object | null} offer - The active purchased bonus offer.
   * @returns {object | null} The enriched payline result with bonus metadata attached.
   */
  function applyBonusMultiplierToWin(paidWin, offer) {
    if (!paidWin || !offer) {
      return paidWin;
    }

    const baseAward = roundCredits(paidWin.award);
    const boostedAward = roundCredits(baseAward * offer.multiplier);

    return {
      ...paidWin,
      baseAward,
      award: boostedAward,
      baseMultiplier: paidWin.multiplier,
      multiplier: paidWin.multiplier * offer.multiplier,
      bonusOffer: offer,
      bonusMultiplierApplied: true,
    };
  }

  /**
   * Builds a deterministic audio cue plan for the requested bonus tier.
   *
   * @param {object | null} offer - The active purchased bonus offer.
   * @returns {{
   *   cueId: string,
   *   waveform: OscillatorType,
   *   gain: number,
   *   noteDurationMs: number,
   *   notes: number[]
   * }} The tier-specific audio cue definition.
   */
  function buildBonusAudioCue(offer) {
    if (!offer) {
      return {
        cueId: "standard-spin",
        waveform: "sine",
        gain: 0.03,
        noteDurationMs: 90,
        notes: [],
      };
    }

    if (offer.multiplier >= 10) {
      return {
        cueId: offer.id,
        waveform: "sawtooth",
        gain: 0.12,
        noteDurationMs: 125,
        notes: [392, 523.25, 659.25, 783.99, 1046.5],
      };
    }

    if (offer.multiplier >= 5) {
      return {
        cueId: offer.id,
        waveform: "triangle",
        gain: 0.08,
        noteDurationMs: 110,
        notes: [349.23, 440, 523.25, 659.25],
      };
    }

    return {
      cueId: offer.id,
      waveform: "sine",
      gain: 0.05,
      noteDurationMs: 95,
      notes: [329.63, 440, 523.25],
    };
  }

  /**
   * Builds the current presentation model used by the page to render bonus-buy UI
   * and reel-stage emphasis states.
   *
   * @param {number} spinCost - The currently selected base wager.
   * @param {object | null} selectedOffer - The offer armed for the next spin.
   * @param {object | null} activeOffer - The offer currently animating on the live spin.
   * @returns {{
   *   badgeText: string,
   *   copyText: string,
   *   statusText: string,
   *   totalCost: number,
   *   surcharge: number,
   *   multiplierLabel: string,
   *   stageClasses: string[],
   *   visualIntensity: number,
   *   audioCue: ReturnType<typeof buildBonusAudioCue>,
   *   offerId: string | null
   * }} The render-ready presentation state.
   */
  function buildBonusPresentationState(spinCost, selectedOffer, activeOffer = null) {
    const liveOffer = activeOffer || selectedOffer;

    if (!liveOffer) {
      return {
        badgeText: "Standard Spin",
        copyText: "Choose a purchased multiplier to enhance the next completed spin.",
        statusText: "No purchased multiplier is armed for the next spin.",
        totalCost: roundCredits(spinCost),
        surcharge: 0,
        multiplierLabel: "Standard",
        stageClasses: [],
        visualIntensity: 0,
        audioCue: buildBonusAudioCue(null),
        offerId: null,
      };
    }

    const totalCost = calculateBonusSpinCost(spinCost, liveOffer);
    const surcharge = calculateBonusSpinSurcharge(spinCost, liveOffer);
    const isActive = Boolean(activeOffer);

    return {
      badgeText: isActive
        ? `${liveOffer.multiplier}x Multiplier Live`
        : `${liveOffer.multiplier}x Multiplier Armed`,
      copyText: isActive
        ? `Bonus odds are active on this spin at ${totalCost} total credits.`
        : `Next spin total is ${totalCost} credits, including ${surcharge} bonus credits.`,
      statusText: isActive
        ? `${liveOffer.title} is driving the current spin with enhanced reel odds.`
        : `${liveOffer.title} is armed for the next spin.`,
      totalCost,
      surcharge,
      multiplierLabel: `${liveOffer.multiplier}x Multiplier`,
      stageClasses: [
        "bonus-armed",
        liveOffer.stageClass,
        ...(isActive ? ["bonus-spin-active"] : []),
      ],
      visualIntensity: liveOffer.visualIntensity,
      audioCue: buildBonusAudioCue(liveOffer),
      offerId: liveOffer.id,
    };
  }

  window.BONUS_FEATURES = {
    resolveBonusOffer,
    calculateBonusSpinCost,
    calculateBonusSpinSurcharge,
    applyBonusMultiplierToWin,
    buildBonusAudioCue,
    buildBonusPresentationState,
  };
})();
