/**
 * @typedef {"light" | "dark"} ThemeName
 */

/**
 * @typedef {Object} ButtonShadowSet
 * @property {string} baseShadow - Default button shadow.
 * @property {string} hoverShadow - Hover-state button shadow.
 */

/**
 * @typedef {Object} FadeOptions
 * @property {number} [duration] - Animation duration in seconds.
 * @property {number} [staggerStep] - Delay between sibling elements.
 * @property {number} [startDelay] - Initial delay before the first animation.
 */

const { animate, stagger } = window.Motion;

const {
  rows,
  reels,
  paylines,
  symbols,
  payoutMultiplier,
  complianceReminder,
} = window.SLOT_CONFIG;

const gridSize = document.getElementById("gridSize");
const paylineCount = document.getElementById("paylineCount");
const paytableBody = document.getElementById("paytableBody");
const paylineGallery = document.getElementById("paylineGallery");
const complianceReminderText = document.getElementById("complianceReminder");
const rootElement = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const themeStorageKey = "prompt-drop-theme-v1";
const lineAccentPalette = [
  "var(--line-accent-1)",
  "var(--line-accent-2)",
  "var(--line-accent-3)",
  "var(--line-accent-4)",
  "var(--line-accent-5)",
  "var(--line-accent-6)",
];
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let buttonStyleCache = new WeakMap();
const transientAnimations = new WeakMap();

/**
 * Returns whether the user prefers reduced motion.
 *
 * @returns {boolean} `true` when motion should be minimized.
 */
function prefersReducedMotion() {
  return reducedMotionQuery.matches;
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
 * Persists the selected theme for future page loads.
 *
 * @param {ThemeName} theme - The theme to store.
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
 * Applies the selected theme to the page and updates the toggle metadata.
 *
 * @param {ThemeName} theme - The theme to apply.
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
 * Switches between the light and dark themes.
 *
 * @returns {void}
 */
function toggleTheme() {
  const nextTheme = rootElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  persistTheme(nextTheme);
}

/**
 * Applies the previously saved theme on startup.
 *
 * @returns {void}
 */
function initializeTheme() {
  applyTheme(readStoredTheme());
}

/**
 * Removes transient inline styles that Motion may have set on an element.
 *
 * @param {HTMLElement | SVGElement | null | undefined} element - Element to clean up.
 * @param {string[]} [properties=["transform", "opacity", "box-shadow"]] - CSS properties to remove.
 * @returns {void}
 */
function clearMotionStyles(element, properties = ["transform", "opacity", "box-shadow"]) {
  if (!element) {
    return;
  }

  properties.forEach((property) => {
    element.style.removeProperty(property);
  });
}

/**
 * Stops a previously tracked transient animation for an element.
 *
 * @param {Element | null | undefined} element - Animated element to stop.
 * @param {string[] | undefined} clearProperties - Optional inline styles to remove.
 * @returns {void}
 */
function stopTransientAnimation(element, clearProperties) {
  const controls = transientAnimations.get(element);

  if (controls && typeof controls.stop === "function") {
    controls.stop();
  }

  transientAnimations.delete(element);

  if (clearProperties) {
    clearMotionStyles(element, clearProperties);
  }
}

/**
 * Animates a collection of elements into view with a staggered entrance.
 *
 * @param {Iterable<Element>} elements - Elements to animate.
 * @param {FadeOptions} [options={}] - Motion timing options.
 * @returns {void}
 */
function fadeInElements(elements, options = {}) {
  const visibleElements = Array.from(elements).filter(Boolean);

  if (!visibleElements.length || prefersReducedMotion()) {
    return;
  }

  const delayFor = stagger(options.staggerStep ?? 0.07, {
    startDelay: options.startDelay ?? 0,
  });

  visibleElements.forEach((element, index) => {
    const controls = animate(
      element,
      { opacity: [0, 1], y: [20, 0] },
      {
        duration: options.duration ?? 0.5,
        delay: delayFor(index, visibleElements.length),
        ease: "easeOut",
      },
    );
    transientAnimations.set(element, controls);
  });
}

/**
 * Reads the configured button shadow tokens and caches them per element.
 *
 * @param {HTMLElement} button - Button element to inspect.
 * @returns {ButtonShadowSet} The button's base and hover shadow values.
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
 * Plays a short button-state transition.
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
  transientAnimations.set(button, controls);
}

/**
 * Attaches hover and press animations to the page's interactive buttons.
 *
 * @returns {void}
 */
function setupAnimatedButtons() {
  document.querySelectorAll("button, .button-link").forEach((button) => {
    readButtonShadows(button);

    button.addEventListener("pointerenter", () => {
      if (button.disabled || prefersReducedMotion()) {
        return;
      }

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
    });

    button.addEventListener("pointerdown", () => {
      if (button.disabled || prefersReducedMotion()) {
        return;
      }

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
    };

    button.addEventListener("pointerup", releasePointer);
    button.addEventListener("pointercancel", releasePointer);
  });
}

initializeTheme();

gridSize.textContent = `${reels} x ${rows}`;
paylineCount.textContent = String(paylines.length);
complianceReminderText.textContent = complianceReminder;

symbols.forEach((symbol) => {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${symbol.icon} ${symbol.name}</td>
    <td>${symbol.weight}</td>
    <td>${payoutMultiplier(symbol.key, 3)}x</td>
    <td>${payoutMultiplier(symbol.key, 4)}x</td>
    <td>${payoutMultiplier(symbol.key, 5)}x</td>
    <td>${symbol.flavor}</td>
  `;
  paytableBody.append(row);
});

paylines.forEach((line, index) => {
  const card = document.createElement("article");
  card.className = "line-card";
  card.style.setProperty("--line-accent", lineAccentPalette[index % lineAccentPalette.length]);

  const title = document.createElement("div");
  title.className = "line-card-title";
  title.innerHTML = `<strong>${line.name}</strong><span>${line.description}</span>`;

  const miniGrid = document.createElement("div");
  miniGrid.className = "mini-grid";

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < reels; col += 1) {
      const cell = document.createElement("span");
      cell.className = "mini-cell";

      if (line.cells.some((position) => position.col === col && position.row === row)) {
        cell.classList.add("is-on");
      }

      miniGrid.append(cell);
    }
  }

  card.append(title, miniGrid);
  paylineGallery.append(card);
});

setupAnimatedButtons();
themeToggle?.addEventListener("click", toggleTheme);
fadeInElements([document.querySelector(".hero"), document.querySelector(".info-panel")], {
  duration: 0.55,
  staggerStep: 0.08,
});
fadeInElements(document.querySelectorAll(".rule-card, .info-card, .table-panel, .line-card"), {
  duration: 0.45,
  staggerStep: 0.05,
  startDelay: 0.08,
});
