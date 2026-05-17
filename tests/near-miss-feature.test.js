(async function runNearMissFeatureTests() {
  const { symbols } = window.SLOT_CONFIG;
  const symbolMap = Object.fromEntries(symbols.map((symbol) => [symbol.key, symbol]));

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
   * Waits for a number of milliseconds within the provided browsing context.
   *
   * @param {Window} appWindow - The application window hosting the timer.
   * @param {number} delayMs - The duration to await.
   * @returns {Promise<void>} Resolves when the delay completes.
   */
  function wait(appWindow, delayMs) {
    return new Promise((resolve) => {
      appWindow.setTimeout(resolve, delayMs);
    });
  }

  /**
   * Converts a row-major symbol layout into the slot app's column-major grid format.
   *
   * @param {string[][]} rowKeys - A three-row array of symbol keys.
   * @returns {object[][]} The corresponding column-major symbol grid.
   */
  function createGridFromRows(rowKeys) {
    return Array.from({ length: rowKeys[0].length }, (_, colIndex) =>
      Array.from({ length: rowKeys.length }, (_, rowIndex) => {
        const symbol = symbolMap[rowKeys[rowIndex][colIndex]];
        assert(symbol, `Unknown symbol key "${rowKeys[rowIndex][colIndex]}" in test grid.`);
        return symbol;
      }),
    );
  }

  /**
   * Builds a deterministic grid with exactly one top-row near miss and no paid wins.
   *
   * @returns {object[][]} The deterministic near-miss grid.
   */
  function createSingleNearMissGrid() {
    return createGridFromRows([
      ["gold", "gold", "blank", "star", "bronze"],
      ["blank", "diamond", "blank", "silver", "blank"],
      ["blank", "blank", "blank", "blank", "blank"],
    ]);
  }

  /**
   * Loads the live slot application in a same-origin iframe for DOM assertions.
   *
   * @returns {Promise<{ appWindow: Window, iframe: HTMLIFrameElement }>} The iframe and content window.
   */
  function loadApplicationWindow() {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement("iframe");
      const timeoutMs = 5000;
      const pollIntervalMs = 25;
      iframe.src = "../index.html";
      iframe.loading = "eager";
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.position = "absolute";
      iframe.style.left = "-10000px";
      iframe.style.top = "0";
      iframe.style.width = "1440px";
      iframe.style.height = "1200px";
      iframe.style.border = "0";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      iframe.addEventListener("load", () => {
        const startedAt = window.performance.now();

        const awaitDebugHooks = () => {
          if (iframe.contentWindow?.promptDropDebug) {
            resolve({ appWindow: iframe.contentWindow, iframe });
            return;
          }

          if (window.performance.now() - startedAt >= timeoutMs) {
            reject(new Error("Prompt Drop debug hooks did not initialize inside the iframe."));
            return;
          }

          window.setTimeout(awaitDebugHooks, pollIntervalMs);
        };

        awaitDebugHooks();
      });
      iframe.addEventListener("error", () => {
        reject(new Error("The Prompt Drop application iframe could not be loaded."));
      });
      document.body.append(iframe);
    });
  }

  /**
   * Executes a callback against a fresh copy of the application and disposes the iframe afterward.
   *
   * @param {(appWindow: Window) => Promise<void> | void} callback - The assertions to run.
   * @returns {Promise<void>} Resolves when the callback completes.
   */
  async function withApplicationWindow(callback) {
    const { appWindow, iframe } = await loadApplicationWindow();

    try {
      await callback(appWindow);
    } finally {
      iframe.remove();
    }
  }

  const tests = [
    {
      name: "detects a non-winning payline that is one symbol short of the minimum award threshold",
      async run() {
        await withApplicationWindow((appWindow) => {
          const debug = appWindow.promptDropDebug;
          const nearMisses = debug.evaluateNearMissLines(createSingleNearMissGrid());

          assertEqual(nearMisses.length, 1, "Exactly one near miss should be detected.");
          assertEqual(nearMisses[0].line.id, "top-row", "The top row should be flagged as the near miss.");
          assertEqual(nearMisses[0].symbol.key, "gold", "The near miss should track the matched symbol.");
          assertEqual(nearMisses[0].matchCount, 2, "The near miss should preserve the existing two-symbol run.");
          assertEqual(nearMisses[0].targetCount, 3, "The near miss should target the minimum three-symbol payout.");
          assertEqual(
            nearMisses[0].missingPosition.col,
            2,
            "The third top-row stop should be identified as the missed winning position.",
          );
          assertEqual(
            nearMisses[0].missingPosition.row,
            0,
            "The top row should retain the missed winning position on row zero.",
          );
        });
      },
    },
    {
      name: "does not mark paylines that already qualify for a paid win as near misses",
      async run() {
        await withApplicationWindow((appWindow) => {
          const debug = appWindow.promptDropDebug;
          const winningGrid = createGridFromRows([
            ["gold", "gold", "gold", "blank", "blank"],
            ["blank", "blank", "blank", "blank", "blank"],
            ["blank", "blank", "blank", "blank", "blank"],
          ]);
          const nearMisses = debug.evaluateNearMissLines(winningGrid);

          assertEqual(
            nearMisses.length,
            0,
            "A qualifying payline should not be duplicated as a near-miss overlay.",
          );
        });
      },
    },
    {
      name: "renders the near-miss overlay inside the reel board without conflicting with existing stage assets",
      async run() {
        await withApplicationWindow((appWindow) => {
          const debug = appWindow.promptDropDebug;
          const appDocument = appWindow.document;
          const reelBoard = appDocument.getElementById("reelBoard");
          const bonusSpinOverlay = appDocument.getElementById("bonusSpinOverlay");
          const glowRing = appDocument.querySelector(".glow-ring");
          const grid = createSingleNearMissGrid();

          debug.renderGrid(grid);
          debug.renderNearMissLines(debug.evaluateNearMissLines(grid));

          const nearMissState = debug.getNearMissState();
          const layer = appDocument.getElementById("nearMissLayer");
          const firstGroup = layer?.querySelector(".near-miss-group");
          const layerRect = layer?.getBoundingClientRect();
          const boardRect = reelBoard.getBoundingClientRect();
          const overlayRect = bonusSpinOverlay.getBoundingClientRect();

          assert(layer, "The reel board should host a dedicated near-miss SVG layer.");
          assert(glowRing, "The existing glow-ring asset should remain present.");
          assertEqual(layer.parentElement?.id, "reelBoard", "The near-miss layer should live inside the reel board.");
          assertEqual(layer.getAttribute("aria-hidden"), "true", "The near-miss layer should stay hidden from assistive text.");
          assertEqual(
            appWindow.getComputedStyle(layer).pointerEvents,
            "none",
            "The near-miss layer should not intercept any pointer input.",
          );
          assertEqual(nearMissState.pathCount, 1, "One near-miss connector should be rendered for the single near miss.");
          assertEqual(nearMissState.nodeCount, 3, "The connector should render one node for each tracked stop.");
          assert(
            Math.abs(layerRect.width - boardRect.width) <= 1 &&
              Math.abs(layerRect.height - boardRect.height) <= 1,
            "The near-miss layer should align with the reel board bounds.",
          );
          assert(
            layerRect.top >= overlayRect.bottom - 1,
            "The near-miss layer should remain below the bonus stage overlay.",
          );
          assert(
            firstGroup?.style.getPropertyValue("--near-miss-accent").includes("--line-accent-1"),
            "The near-miss connector should inherit the configured payline palette.",
          );
        });
      },
    },
    {
      name: "clears the previous near-miss connector as soon as the next spin starts",
      async run() {
        await withApplicationWindow(async (appWindow) => {
          const debug = appWindow.promptDropDebug;
          const appDocument = appWindow.document;
          const spinButton = appDocument.getElementById("spinButton");
          const grid = createSingleNearMissGrid();

          debug.renderGrid(grid);
          debug.renderNearMissLines(debug.evaluateNearMissLines(grid));
          assertEqual(debug.getNearMissState().pathCount, 1, "The near miss should render before the next spin.");

          debug.state.consent.accepted = true;
          debug.state.tokens = 5000;
          debug.updateControlStates();
          assertEqual(spinButton.disabled, false, "The spin control should be enabled for the lifecycle test.");

          spinButton.click();
          await wait(appWindow, 25);

          assertEqual(
            debug.getNearMissState().pathCount,
            0,
            "Starting the next spin should clear the previous near-miss overlay immediately.",
          );
        });
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
