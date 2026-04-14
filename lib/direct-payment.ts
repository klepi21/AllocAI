import { ethers } from "ethers";

interface VerifyDirectPaymentInput {
  txHash: string;
  expectedPayTo: string;
  minAmountWei: string;
  expectedPayer?: string;
}

interface VerifyDirectPaymentResult {
  ok: boolean;
  paymentReference: string;
  settlementReference: string;
  error?: string;
}

export async function verifyDirectPaymentOnChain(
  input: VerifyDirectPaymentInput
): Promise<VerifyDirectPaymentResult> {
  try {
    if (!/^0x([A-Fa-f0-9]{64})$/.test(input.txHash)) {
      return {
        ok: false,
        paymentReference: "invalid",
        settlementReference: "invalid",
        error: "Invalid direct payment tx hash format"
      };
    }
    const rpcUrl = process.env.NEXT_PUBLIC_KITE_RPC || "https://rpc.gokite.ai/";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const tx = await provider.getTransaction(input.txHash);
    const receipt = await provider.getTransactionReceipt(input.txHash);
    if (!tx || !receipt) {
      return {
        ok: false,
        paymentReference: input.txHash,
        settlementReference: input.txHash,
        error: "Direct payment transaction not found"
      };
    }
    if (receipt.status !== 1) {
      return {
        ok: false,
        paymentReference: input.txHash,
        settlementReference: input.txHash,
        error: "Direct payment transaction reverted"
      };
    }
    const txTo = (tx.to || "").toLowerCase();
    const expectedTo = input.expectedPayTo.toLowerCase();
    if (txTo !== expectedTo) {
      return {
        ok: false,
        paymentReference: input.txHash,
        settlementReference: input.txHash,
        error: "Direct payment destination does not match merchant payTo"
      };
    }

    const minimum = BigInt(input.minAmountWei);
    if (tx.value < minimum) {
      return {
        ok: false,
        paymentReference: input.txHash,
        settlementReference: input.txHash,
        error: "Direct payment amount is below required KITE fee"
      };
    }
    if (input.expectedPayer && tx.from.toLowerCase() !== input.expectedPayer.toLowerCase()) {
      return {
        ok: false,
        paymentReference: input.txHash,
        settlementReference: input.txHash,
        error: "Direct payment sender does not match wallet address"
      };
    }
    return {
      ok: true,
      paymentReference: input.txHash,
      settlementReference: input.txHash
    };
  } catch (error) {
    return {
      ok: false,
      paymentReference: input.txHash,
      settlementReference: input.txHash,
      error: error instanceof Error ? error.message : "Failed to verify direct payment"
    };
  }
}
