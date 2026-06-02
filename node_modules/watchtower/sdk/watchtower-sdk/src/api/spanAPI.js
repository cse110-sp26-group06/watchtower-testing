/**
 * Sends a batch of span events to the Watchtower ingestion API.
 *
 * This function accepts an EventBatch object that conforms to the
 * JSON schema used by the backend. It serializes the batch into JSON
 * and posts it to the configured ingestion endpoint.
 *
 * @param batch - A fully validated EventBatch containing one or more span events.
 * @returns A Promise that resolves when the request completes.
 */
export async function sendSpanBatch(batch) { 
  try {
    const res = await fetch("https://watchtower-backend.group6.workers.dev/ingest/span", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batch)
    });

    if (!res.ok) {
      console.error("Failed to send span batch", await res.text());
    }
  } catch (err) {
    console.error("Network error while sending span batch:", err);
  }
}

