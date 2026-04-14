import { ethers } from "ethers";
import { AgentProofReceipt, StrategyNarrative } from "@/lib/types";

interface ProofInput {
  runId: string;
  paymentReference: string;
  settlementReference: string;
  strategy: StrategyNarrative;
}

function getProofWallet(): ethers.Wallet {
  const privateKey = process.env.SERVICE_WALLET_PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY;
  if (!privateKey) throw new Error("Service wallet key is not configured");
  const rpcUrl = process.env.NEXT_PUBLIC_KITE_RPC || "https://rpc.gokite.ai/";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return new ethers.Wallet(privateKey, provider);
}

export async function publishRunProofAndSignReceipt(input: ProofInput): Promise<AgentProofReceipt> {
  const wallet = getProofWallet();
  const timestamp = new Date().toISOString();
  const strategyHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(input.strategy)));
  const summaryExcerpt = `${input.strategy.headline} | APR ${input.strategy.apr.toFixed(2)}% | ${input.strategy.recommendation}`
    .slice(0, 180);
  const payload = {
    runId: input.runId,
    paymentReference: input.paymentReference,
    settlementReference: input.settlementReference,
    strategyHash,
    timestamp
  };
  const proofHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(payload)));
  const tx = await wallet.sendTransaction({
    to: wallet.address,
    value: 0n,
    data: proofHash
  });
  const receipt = await tx.wait();
  let summaryTxHash: string | undefined;
  try {
    const summaryData = ethers.hexlify(ethers.toUtf8Bytes(`ALLOCAI_SUMMARY|${input.runId}|${summaryExcerpt}`));
    const summaryTx = await wallet.sendTransaction({
      to: wallet.address,
      value: 0n,
      data: summaryData
    });
    const summaryReceipt = await summaryTx.wait();
    summaryTxHash = summaryReceipt?.hash || summaryTx.hash;
  } catch {
    summaryTxHash = undefined;
  }
  const signature = await wallet.signMessage(ethers.getBytes(proofHash));
  return {
    runId: input.runId,
    paymentReference: input.paymentReference,
    settlementReference: input.settlementReference,
    strategyHash,
    txHash: receipt?.hash || tx.hash,
    summaryTxHash,
    summaryExcerpt,
    timestamp,
    signer: wallet.address,
    signature
  };
}
