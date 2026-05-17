(function runVariableRatioRewardTests() {
  const {
    createVariableRatioRewardState,
    restoreVariableRatioRewardState,
    advanceVariableRatioReward,
  } = window.VARIABLE_RATIO_REWARD;

  /**
   * Creates a deterministic random-index generator for repeatable tests.
   *
   * @param {number[]} values - The queued index values to return.
   * @returns {(max: number) => number} A deterministic random-index stub.
   */
  function createSequenceRandom(values) {
    let cursor = 0;

    return function nextRandom(max) {
      if (cursor >= values.length) {
        throw new Error(`No deterministic value left for max ${max}.`);
      }

      const value = values[cursor];
      cursor += 1;

      if (!Number.isInteger(value) || value < 0 || value >= max) {
        throw new Error(`Deterministic value ${value} is outside the allowed range 0-${max - 1}.`);
      }

      return value;
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
   * Renders the final test outcome to the page.
   *
   * @param {{ name: string, error?: Error }[]} results - Collected test results.
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

  const tests = [
    {
      name: "awards only when the hidden spin target is reached",
      run() {
        const randomIndex = createSequenceRandom([0, 1, 2, 0, 1]);
        const schedule = createVariableRatioRewardState(
          {
            spinWindow: { min: 2, max: 4 },
            rewardMultipliers: [2, 5],
            rewardLabel: "Class Bonus",
          },
          randomIndex,
        );

        const rewards = [];

        for (let spin = 1; spin <= 6; spin += 1) {
          const reward = advanceVariableRatioReward(schedule, 50, randomIndex);

          if (reward) {
            rewards.push({ spin, reward });
          }
        }

        assertEqual(rewards.length, 2, "Two rewards should have triggered across six spins.");
        assertEqual(rewards[0].spin, 2, "The first reward should trigger on spin two.");
        assertEqual(rewards[0].reward.award, 250, "The first reward should use the queued 5x multiplier.");
        assertEqual(rewards[1].spin, 6, "The second reward should trigger after a reshuffled hidden interval.");
        assertEqual(rewards[1].reward.award, 100, "The second reward should use the queued 2x multiplier.");
      },
    },
    {
      name: "scales the reward amount with the current wager",
      run() {
        const randomIndex = createSequenceRandom([0, 2, 0, 1, 0]);
        const schedule = createVariableRatioRewardState(
          {
            spinWindow: { min: 1, max: 1 },
            rewardMultipliers: [2, 3, 4],
          },
          randomIndex,
        );

        const firstReward = advanceVariableRatioReward(schedule, 40, randomIndex);
        const secondReward = advanceVariableRatioReward(schedule, 70, randomIndex);

        assertEqual(firstReward.award, 160, "The first reward should use the 4x multiplier.");
        assertEqual(secondReward.award, 210, "The second reward should use the 3x multiplier and the new wager.");
      },
    },
    {
      name: "restores persisted progress and continues the schedule",
      run() {
        const randomIndex = createSequenceRandom([0, 1, 0]);
        const schedule = restoreVariableRatioRewardState(
          {
            spinsSinceLastReward: 2,
            spinsUntilReward: 3,
            rewardsTriggered: 4,
            lastReward: {
              label: "Class Bonus",
              multiplier: 2,
              award: 80,
              completedSpins: 2,
              rewardNumber: 4,
            },
          },
          {
            spinWindow: { min: 3, max: 4 },
            rewardMultipliers: [2, 5],
            rewardLabel: "Class Bonus",
          },
          randomIndex,
        );

        const reward = advanceVariableRatioReward(schedule, 60, randomIndex);

        assertEqual(reward.rewardNumber, 5, "The next reward number should continue from persisted progress.");
        assertEqual(reward.award, 300, "The restored schedule should use the configured multiplier table.");
        assertEqual(schedule.rewardsTriggered, 5, "Reward counters should advance after the restored trigger fires.");
      },
    },
  ];

  const results = tests.map((test) => {
    try {
      test.run();
      return { name: test.name };
    } catch (error) {
      return { name: test.name, error };
    }
  });

  renderResults(results);
})();
