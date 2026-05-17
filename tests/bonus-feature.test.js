(async function runBonusFeatureTests() {
  const {
    paylines,
    payoutMultiplier,
    symbols,
    bonusOffers,
  } = window.SLOT_CONFIG;
  const {
    calculateBonusSpinCost,
    applyBonusMultiplierToWin,
    buildBonusAudioCue,
    buildBonusPresentationState,
  } = window.BONUS_FEATURES;

  /**
   * Creates a deterministic linear-congruential random number generator.
   *
   * @param {number} seed - The unsigned seed used to initialize the generator.
   * @returns {() => number} A repeatable floating-point random source.
   */
  function createDeterministicRandom(seed) {
    let state = seed >>> 0;

    return function nextRandom() {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 0x100000000;
    };
  }

  /**
   * Throws when the provided condition is false.
   *
   * @param {boolean} condition - The condition to validate.
   * @param {string} message - The failure message.
   * @returns {void}
   */
  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  /**
   * Throws when two values are not strictly equal.
   *
   * @param {unknown} actual - The actual value.
   * @param {unknown} expected - The expected value.
   * @param {string} message - The failure message.
   * @returns {void}
   */
  function assertEqual(actual, expected, message) {
    assert(actual === expected, `${message} Expected ${expected}, received ${actual}.`);
  }

  /**
   * Throws when the numeric delta exceeds the allowed tolerance.
   *
   * @param {number} actual - The measured numeric value.
   * @param {number} expected - The expected numeric value.
   * @param {number} tolerance - The inclusive allowed delta.
   * @param {string} message - The failure message.
   * @returns {void}
   */
  function assertNear(actual, expected, tolerance, message) {
    assert(
      Math.abs(actual - expected) <= tolerance,
      `${message} Expected ${expected} +/- ${tolerance}, received ${actual}.`,
    );
  }

  /**
   * Renders the final test outcome to the page.
   *
   * @param {{ name: string, error?: Error }[]} results - Collected test outcomes.
   * @returns {void}
   */
  function renderResults(results) {
    const summary = document.getElementById("summary");
    const list = document.getElementById("results");
    const passed = results.filter((result) => !result.error).length;

    summary.textContent = `${passed}/${results.length} tests passed`;
    list.textContent = "";

    results.forEach((result) => {
      const item = document.createElement("li");
      item.className = result.error ? "failed" : "passed";
      item.textContent = result.error
        ? `${result.name}: ${result.error.message}`
        : `${result.name}: passed`;
      list.append(item);
    });
  }

  /**
   * Creates a deterministic symbol picker for the requested weight profile.
   *
   * @param {Record<string, number>} symbolWeights - The reel-weight profile to use.
   * @param {() => number} random - The deterministic random source.
   * @returns {() => object} A symbol picker that respects the requested weights.
   */
  function createWeightedPicker(symbolWeights, random) {
    const weightedStops = symbols.flatMap((symbol) =>
      Array.from(
        { length: Math.max(1, Number.parseInt(symbolWeights[symbol.key], 10) || 1) },
        () => symbol,
      ),
    );

    return function pickWeightedSymbol() {
      return weightedStops[Math.floor(random() * weightedStops.length)];
    };
  }

  /**
   * Resolves the highest-paying qualifying line from a deterministic spin grid.
   *
   * @param {object[][]} grid - The 5x3 symbol grid to evaluate.
   * @returns {number} The base award multiplier before any purchased uplift.
   */
  function evaluateGrid(grid) {
    let bestAward = 0;
    let bestMatchCount = 0;

    paylines.forEach((line) => {
      const symbolsOnLine = line.cells.map(({ col, row }) => grid[col][row]);
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
          const award = payoutMultiplier(symbolsOnLine[cursor].key, matchCount);

          if (award > bestAward || (award === bestAward && matchCount > bestMatchCount)) {
            bestAward = award;
            bestMatchCount = matchCount;
          }
        }

        cursor = next;
      }
    });

    return bestAward;
  }

  /**
   * Estimates the RTP for a purchased bonus offer using deterministic samples.
   *
   * @param {object} offer - The configured purchased bonus offer.
   * @param {number} spinCost - The base wager used for the estimate.
   * @param {number} sampleSize - The number of deterministic spins to simulate.
   * @returns {number} The observed RTP for the sampled spins.
   */
  function estimateBonusRtp(offer, spinCost, sampleSize) {
    const random = createDeterministicRandom(offer.multiplier * 97);
    const pickWeightedSymbol = createWeightedPicker(offer.symbolWeights, random);
    const totalCost = calculateBonusSpinCost(spinCost, offer);
    let totalAward = 0;

    for (let spinIndex = 0; spinIndex < sampleSize; spinIndex += 1) {
      const grid = Array.from({ length: 5 }, () =>
        Array.from({ length: 3 }, () => pickWeightedSymbol()),
      );
      totalAward += evaluateGrid(grid) * spinCost * offer.multiplier;
    }

    return totalAward / (totalCost * sampleSize);
  }

  /**
   * Loads the live slot application in a same-origin iframe for DOM assertions.
   *
   * @returns {Promise<Window>} The iframe content window once the app is ready.
   */
  function loadApplicationWindow() {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement("iframe");
      iframe.src = "../index.html";
      iframe.hidden = true;
      iframe.loading = "eager";
      iframe.addEventListener("load", () => {
        window.setTimeout(() => {
          if (iframe.contentWindow?.promptDropDebug) {
            resolve(iframe.contentWindow);
            return;
          }

          reject(new Error("Prompt Drop debug hooks did not initialize inside the iframe."));
        }, 120);
      });
      iframe.addEventListener("error", () => {
        reject(new Error("The Prompt Drop application iframe could not be loaded."));
      });
      document.body.append(iframe);
    });
  }

  const tests = [
    {
      name: "prices the purchased multipliers non-linearly against the base wager",
      run() {
        const spinCost = 100;
        const twoXCost = calculateBonusSpinCost(spinCost, bonusOffers[0]);
        const fiveXCost = calculateBonusSpinCost(spinCost, bonusOffers[1]);
        const tenXCost = calculateBonusSpinCost(spinCost, bonusOffers[2]);

        assertEqual(twoXCost, 166, "The 2x multiplier should price at 1.66x the base wager.");
        assertEqual(fiveXCost, 476, "The 5x multiplier should price at 4.76x the base wager.");
        assertEqual(tenXCost, 1151, "The 10x multiplier should price at 11.51x the base wager.");
        assert(
          fiveXCost !== twoXCost * 2.5,
          "The 5x price should not scale linearly from the 2x offer.",
        );
      },
    },
    {
      name: "applies the purchased multiplier to a winning payline without mutating the base outcome",
      run() {
        const paidWin = {
          line: { name: "Middle Row" },
          symbol: { name: "Gold" },
          matchCount: 4,
          multiplier: 18,
          award: 1080,
        };
        const boostedWin = applyBonusMultiplierToWin(paidWin, bonusOffers[1]);

        assertEqual(paidWin.award, 1080, "The original paid win should remain unchanged.");
        assertEqual(boostedWin.baseAward, 1080, "The boosted win should preserve the base award.");
        assertEqual(boostedWin.award, 5400, "The boosted win should multiply the base award by 5x.");
        assertEqual(boostedWin.multiplier, 90, "The boosted multiplier should reflect the purchased uplift.");
      },
    },
    {
      name: "builds progressively flashier presentation and audio plans for higher spend tiers",
      run() {
        const twoXPresentation = buildBonusPresentationState(60, bonusOffers[0], null);
        const tenXPresentation = buildBonusPresentationState(60, bonusOffers[2], bonusOffers[2]);
        const twoXAudio = buildBonusAudioCue(bonusOffers[0]);
        const tenXAudio = buildBonusAudioCue(bonusOffers[2]);

        assert(
          twoXPresentation.stageClasses.includes("bonus-tier-2"),
          "The 2x offer should tag the reel stage with the 2x presentation class.",
        );
        assert(
          tenXPresentation.stageClasses.includes("bonus-spin-active"),
          "An active purchased multiplier should mark the reel stage as live.",
        );
        assert(
          tenXPresentation.visualIntensity > twoXPresentation.visualIntensity,
          "The 10x tier should render with greater visual intensity than the 2x tier.",
        );
        assert(
          tenXAudio.notes.length > twoXAudio.notes.length,
          "The 10x tier should play a longer audio flourish than the 2x tier.",
        );
        assert(
          tenXAudio.gain > twoXAudio.gain,
          "The 10x tier should play a louder audio flourish than the 2x tier.",
        );
      },
    },
    {
      name: "keeps purchased bonus RTP near 95 percent over deterministic large samples",
      run() {
        const sampleSize = 25000;
        const spinCost = 100;

        bonusOffers.forEach((offer) => {
          const observedRtp = estimateBonusRtp(offer, spinCost, sampleSize);
          assertNear(
            observedRtp,
            0.95,
            0.02,
            `${offer.title} should stay near the 95 percent RTP target.`,
          );
        });
      },
    },
    {
      name: "updates the live page DOM when a purchased multiplier is armed and activated",
      async run() {
        const appWindow = await loadApplicationWindow();
        const debug = appWindow.promptDropDebug;

        debug.selectBonusOffer("bonus-10x");
        let bonusState = debug.getBonusState();
        assertEqual(
          bonusState.selectedOfferId,
          "bonus-10x",
          "The 10x offer should be armed on the live page.",
        );
        assert(
          bonusState.reelStageClasses.includes("bonus-armed"),
          "Arming a purchased multiplier should add the bonus-armed stage class.",
        );
        assert(
          bonusState.reelStageClasses.includes("bonus-tier-10"),
          "Arming the 10x multiplier should add the 10x stage class.",
        );

        debug.state.bonusBuy.activeOfferId = "bonus-10x";
        debug.updateBonusBuyDisplay();
        bonusState = debug.getBonusState();

        assert(
          bonusState.reelStageClasses.includes("bonus-spin-active"),
          "Activating the purchased multiplier should add the live spin class.",
        );
        assert(
          /10x/i.test(bonusState.overlayText.badge),
          "The overlay badge should identify the active 10x multiplier.",
        );

        debug.clearBonusOffer();
      },
    },
  ];

  const results = [];

  for (const test of tests) {
    try {
      await test.run();
      results.push({ name: test.name });
    } catch (error) {
      results.push({ name: test.name, error });
    }
  }

  renderResults(results);
})();
