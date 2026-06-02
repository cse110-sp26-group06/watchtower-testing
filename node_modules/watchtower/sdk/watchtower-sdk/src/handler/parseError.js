export function parseError(input) {
  let message = "Unknown error";
  let name = "Error";
  let stack = undefined;
  let file = undefined;
  let lineno = undefined;
  let colno = undefined;

  // 1. Browser ErrorEvent
  if (input instanceof ErrorEvent) {
    message = input.message;
    name = input.error?.name ?? "Error";
    stack = input.error?.stack;
    file = input.filename;
    lineno = input.lineno;
    colno = input.colno;
  }

  // 2. Browser PromiseRejectionEvent
  else if (input instanceof PromiseRejectionEvent) {
    const reason = input.reason;
    if (reason instanceof Error) {
      message = reason.message;
      name = reason.name;
      stack = reason.stack;
    } else {
      message = String(reason);
    }
  }

  // 3. Raw Error object (Node or browser)
  else if (input instanceof Error) {
    message = input.message;
    name = input.name;
    stack = input.stack;
  }

  // 4. String or anything else
  else {
    message = String(input);
  }

  return {
    event_type: "error",
    timestamp: new Date().toISOString(),
    payload: {
      message,
      type: name,
      stack_trace: stack,
      file,
      lineno,
      colno
    }
  };
}
