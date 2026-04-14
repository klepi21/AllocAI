#!/usr/bin/env node

const targetUrl = process.env.AUTONOMOUS_TICK_URL;
const tickSecret = process.env.AUTONOMOUS_TICK_SECRET || "";
const timeoutMs = Number(process.env.AUTONOMOUS_TICK_TIMEOUT_MS || "30000");

if (!targetUrl) {
  console.error("[autonomous-runner] Missing AUTONOMOUS_TICK_URL");
  process.exit(1);
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), timeoutMs);

try {
  const startedAt = Date.now();
  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(tickSecret ? { "x-autonomous-secret": tickSecret } : {})
    },
    signal: controller.signal
  });
  const payload = await response.json().catch(() => ({}));
  const elapsed = Date.now() - startedAt;
  console.log(
    JSON.stringify(
      {
        scope: "autonomous-runner",
        status: response.status,
        ok: response.ok,
        elapsedMs: elapsed,
        payload
      },
      null,
      2
    )
  );
  if (!response.ok) process.exit(1);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[autonomous-runner] request failed: ${message}`);
  process.exit(1);
} finally {
  clearTimeout(timeout);
}

