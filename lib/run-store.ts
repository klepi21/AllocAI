import { AgentDecision, TimelineEvent } from "@/lib/types";

export interface StoredPaidRun {
  runId: string;
  payerAddress: string | null;
  paymentReference: string;
  settlementReference: string;
  paymentTo: string;
  decision: AgentDecision;
  logs: TimelineEvent[];
  createdAt: string;
  runType?: "paid" | "autonomous";
  success?: boolean;
  responseTimeMs?: number;
}

type GlobalStore = typeof globalThis & {
  __allocaiPaidRuns?: StoredPaidRun[];
};

function getStore(): StoredPaidRun[] {
  const g = globalThis as GlobalStore;
  if (!g.__allocaiPaidRuns) g.__allocaiPaidRuns = [];
  return g.__allocaiPaidRuns;
}

export function savePaidRun(run: StoredPaidRun): void {
  const store = getStore();
  const next = [run, ...store.filter((item) => item.runId !== run.runId)];
  if (next.length > 300) next.length = 300;
  const g = globalThis as GlobalStore;
  g.__allocaiPaidRuns = next;
}

export function getRecentAutonomousRuns(limit: number): StoredPaidRun[] {
  const store = getStore();
  return store.filter((item) => item.runType === "autonomous").slice(0, limit);
}

export function getLatestAutonomousRun(): StoredPaidRun | null {
  const store = getStore();
  return store.find((item) => item.runType === "autonomous") || null;
}

export function getAllRuns(): StoredPaidRun[] {
  return getStore();
}

export function getLatestPaidRunByAddress(address: string): StoredPaidRun | null {
  const lower = address.toLowerCase();
  const store = getStore();
  return store.find((item) => item.payerAddress?.toLowerCase() === lower) || null;
}

export function getRecentPaidRunsByAddress(address: string, limit: number): StoredPaidRun[] {
  const lower = address.toLowerCase();
  const store = getStore();
  return store.filter((item) => item.payerAddress?.toLowerCase() === lower).slice(0, limit);
}

export function getPaidRunById(runId: string): StoredPaidRun | null {
  const store = getStore();
  return store.find((item) => item.runId === runId) || null;
}
