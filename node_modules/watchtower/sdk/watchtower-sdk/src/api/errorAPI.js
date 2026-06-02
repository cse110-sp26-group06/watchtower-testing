/**
 * Sends a batch of error events to the Watchtower ingestion API.
 *
 * This function accepts an EventBatch object that conforms to the
 * JSON schema used by the backend. It serializes the batch into JSON
 * and posts it to the configured ingestion endpoint.
 *
 * @param batch - A fully validated EventBatch containing one or more error events.
 * @returns A Promise that resolves when the request completes.
 */
export async function sendErrorBatch(batch) { 
  try {
    const res = await fetch("https://watchtower-backend.group6.workers.dev/ingest/error", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batch)
    });

    if (!res.ok) {
      console.error("Failed to send error batch", await res.text());
    }
    return res;
  } catch (err) {
    console.error("Network error while sending error batch:", err);
  }
}

