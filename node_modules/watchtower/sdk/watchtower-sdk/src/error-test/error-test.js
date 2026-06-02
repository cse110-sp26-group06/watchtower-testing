//Determine where to store error logs
const log = document.querySelector(".event-log-contents");
const selector = document.querySelector("#selector");
const button = document.querySelector("#try-button");

//Attach a listener to fire whenever an "error" event occurs
// 'event' is an ErrorEvent object
window.addEventListener("error", (event) => {
  log.textContent = `${log.textContent}${event.type}: ${event.message}\n`;
  console.log(event);
});

//For testing purposes: trigger an error on click
button.addEventListener("click", () => {
  //throw uncaught error 
  if (selector.value === "script-error") {
    throw new Error("This is a script error");
  } else {
    log.textContent = `${log.textContent}No error!\n`;
  }
});


// https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event
