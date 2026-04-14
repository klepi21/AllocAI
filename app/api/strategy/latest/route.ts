import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { getAllRuns, getPaidRunById, getRecentPaidRunsByAddress } from "@/lib/run-store";
import { StoredPaidRun } from "@/lib/run-store";
import { CURRENT_NETWORK } from "@/lib/networks";

function isTxHash(value: string): boolean {
  return /^0x([A-Fa-f0-9]{64})$/.test(value);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = url.searchParams.get("address");
  const runId = url.searchParams.get("runId");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || "5"), 1), 20);

  const rpcUrl = process.env.NEXT_PUBLIC_KITE_RPC || "https://rpc.gokite.ai/";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const explorerBase = CURRENT_NETWORK.explorerUrl.replace(/\/+$/, "");

  const enrichRun = async (run: StoredPaidRun) => {
    let proofConfirmed = false;
    let paymentConfirmed = false;
    let proofBlockNumber: number | null = null;
    let paymentBlockNumber: number | null = null;

    const primaryProofTxHash = isTxHash(run.decision.proofReceipt?.txHash || "") ? run.decision.proofReceipt!.txHash : null;
    const summaryProofTxHash = isTxHash(run.decision.proofReceipt?.summaryTxHash || "")
      ? run.decision.proofReceipt!.summaryTxHash!
      : null;
    const proofTxHash = summaryProofTxHash || primaryProofTxHash;
    const paymentTxHash = isTxHash(run.paymentReference) ? run.paymentReference : null;

    if (proofTxHash) {
      const proofReceipt = await provider.getTransactionReceipt(proofTxHash).catch(() => null);
      proofConfirmed = Boolean(proofReceipt && proofReceipt.status === 1);
      // Judges asked for the next block after tx inclusion.
      proofBlockNumber = typeof proofReceipt?.blockNumber === "number" ? proofReceipt.blockNumber + 1 : null;
    }

    if (paymentTxHash) {
      const paymentReceipt = await provider.getTransactionReceipt(paymentTxHash).catch(() => null);
      paymentConfirmed = Boolean(paymentReceipt && paymentReceipt.status === 1);
      // Judges asked for the next block after tx inclusion.
      paymentBlockNumber = typeof paymentReceipt?.blockNumber === "number" ? paymentReceipt.blockNumber + 1 : null;
    } else {
      // x402 settlement references may not be tx hashes.
      paymentConfirmed = run.settlementReference.length > 0;
    }

    return {
      runId: run.runId,
      createdAt: run.createdAt,
      paymentReference: run.paymentReference,
      settlementReference: run.settlementReference,
      paymentTo: run.paymentTo,
      paymentConfirmed,
      proofConfirmed,
      paymentTxHash,
      proofTxHash,
      paymentBlockNumber,
      proofBlockNumber,
      paymentExplorerUrl: paymentTxHash ? `${explorerBase}/tx/${paymentTxHash}` : null,
      proofExplorerUrl: proofTxHash ? `${explorerBase}/tx/${proofTxHash}` : null,
      strategyLink: run.decision.strategyProtocolUrl || run.decision.strategyLink,
      strategyRunLink: run.decision.strategyLink,
      logs: run.logs,
      decision: run.decision,
      runType: run.runType || "paid",
      responseTimeMs: run.responseTimeMs ?? null,
      success: run.success ?? true
    };
  };

  if (runId) {
    const run = getPaidRunById(runId);
    if (!run) return NextResponse.json({ error: "No strategy run found." }, { status: 404 });
    return NextResponse.json(await enrichRun(run));
  }

  if (!address || !ethers.isAddress(address)) {
    return NextResponse.json({ error: "Address or runId is required." }, { status: 400 });
  }

  let runs = getRecentPaidRunsByAddress(address, limit);

  if (!runs.length) {
    const lower = address.toLowerCase();
    const allCandidates = getAllRuns().filter((run) => (run.runType || "paid") === "paid");
    const inferred: StoredPaidRun[] = [];
    for (const run of allCandidates) {
      if (!isTxHash(run.paymentReference)) continue;
      const tx = await provider.getTransaction(run.paymentReference).catch(() => null);
      if (tx?.from?.toLowerCase() === lower) inferred.push(run);
      if (inferred.length >= limit) break;
    }
    runs = inferred;
  }

  if (!runs.length) {
    return NextResponse.json({
      runs: [],
      latest: null
    });
  }

  const enrichedRuns = await Promise.all(runs.map((item) => enrichRun(item)));
  return NextResponse.json({
    runs: enrichedRuns,
    latest: enrichedRuns[0]
  });
}
