import { captureError } from "./node_modules/watchtower/sdk/src/index.js";

const status = document.getElementById("watchtowerErrorStatus");

const tests = {
  typeError() {
    setTimeout(() => {
      const playerProfile = null;
      playerProfile.displayName;
    }, 0);
  },

  referenceError() {
    setTimeout(() => {
      missingWatchtowerTestFunction();
    }, 0);
  },

  uriError() {
    setTimeout(() => {
      decodeURIComponent("%");
    }, 0);
  },

  promiseRejection() {
    Promise.reject(new Error("Intentional Watchtower unhandled promise rejection"));
  },

  manualCapture() {
    captureError(new Error("Intentional Watchtower manually captured error"));
  },

  consoleError() {
    console.error("Intentional Watchtower console.error log event");
  }
};

function setStatus(message) {
  if (status) {
    status.textContent = message;
  }
}

function runTest(testName) {
  const test = tests[testName];

  if (!test) {
    setStatus(`Unknown Watchtower test: ${testName}`);
    return;
  }

  setStatus(`Triggered ${testName}. Watchtower should flush the event shortly.`);
  test();
}

document.querySelectorAll("[data-watchtower-error]").forEach((button) => {
  button.addEventListener("click", () => {
    runTest(button.dataset.watchtowerError);
  });
});

window.watchtowerTestErrors = {
  ...tests,
  run: runTest
};
