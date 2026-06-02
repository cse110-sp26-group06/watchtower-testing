import { send } from "../transport/send.js";
import { API_KEY } from '../secret.js';

const error = {
  "api_key": API_KEY,
  "service": "sdk test 3",
  "environment": "production",
  "events": [
    {
      "event_type": "error",
      "timestamp": "2026-05-16T03:00:00Z",
      "payload": {
        "message": "TypeError crashed",
        "type": "TypeError",
        "stack_trace": "TypeError at app.js:42",
        "file": "app.js",
        "lineno": 42,
        "colno": 15
      }
    }
  ]
};
const res = await send("error", error);
console.log("Status:", res.status);
console.log("Body:", await res.text());