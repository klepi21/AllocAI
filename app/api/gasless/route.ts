import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const RPC_URL = process.env.NEXT_PUBLIC_KITE_RPC || "https://rpc.gokite.ai/";
const AGENT_KEY = process.env.AGENT_PRIVATE_KEY;
const ADMIN_RELAY_SECRET = process.env.AGENT_RELAY_SECRET;
const ROUTER_ADDRESS = "0x03f8b4b140249dc7b2503c928e7258cce1d91f1a";
const USDC_ADDRESS = "0x7aB6f3ed87C42eF0aDb67Ed95090f8bF5240149e";
const WKITE_ADDRESS = "0xcc788DC0486CD2BaacFf287eea1902cc09FbA570";
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS;

type SwapParams = {
  from: string;
  amount: string;
  auth: {
    validAfter: string;
    validBefore: string;
    nonce: string;
    v: number;
    r: string;
    s: string;
  };
};

type VaultDepositParams = {
  user: string;
  value: string;
  sourceChain: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
  v: number;
  r: string;
  s: string;
};

type VaultWithdrawParams = {
  user: string;
  value: string;
  deadline: string;
  v: number;
  r: string;
  s: string;
};

type RelayParams = {
  to: string;
  data: string;
};

type RequestPayload = {
  action: "swap" | "vault_deposit_gasless" | "vault_withdraw_gasless" | "relay";
  params: SwapParams | VaultDepositParams | VaultWithdrawParams | RelayParams;
};

export async function POST(req: Request) {
  try {
    const payload = await req.json() as RequestPayload;
    const { action, params } = payload;

    const ROUTER_ABI = [
  {
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "tokenIn", "type": "address" },
          { "internalType": "address", "name": "tokenOut", "type": "address" },
          { "internalType": "address", "name": "deployer", "type": "address" },
          { "internalType": "address", "name": "recipient", "type": "address" },
          { "internalType": "uint256", "name": "deadline", "type": "uint256" },
          { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
          { "internalType": "uint256", "name": "amountOutMinimum", "type": "uint256" },
          { "internalType": "uint160", "name": "limitSqrtPrice", "type": "uint160" }
        ],
        "internalType": "struct ISwapRouter.ExactInputSingleParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "exactInputSingle",
    "outputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountMinimum", "type": "uint256" },
      { "internalType": "address", "name": "recipient", "type": "address" }
    ],
    "name": "unwrapWNativeToken",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes[]", "name": "data", "type": "bytes[]" }],
    "name": "multicall",
    "outputs": [{ "internalType": "bytes[]", "name": "results", "type": "bytes[]" }],
    "stateMutability": "payable",
    "type": "function"
  }
];
    const VAULT_ABI = [
      "function depositWithSignature(address _user,uint256 _assets,string _sourceChain,uint256 _validAfter,uint256 _validBefore,bytes32 _nonce,uint8 _v,bytes32 _r,bytes32 _s) external",
      "function withdrawWithSignature(address _user,uint256 _assets,uint256 _deadline,uint8 _v,bytes32 _r,bytes32 _s) external"
    ];

    if (!AGENT_KEY) throw new Error("Agent key not configured");
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const agent = new ethers.Wallet(AGENT_KEY, provider);
    if (!VAULT_ADDRESS || !ethers.isAddress(VAULT_ADDRESS)) {
      throw new Error("NEXT_PUBLIC_VAULT_ADDRESS is not configured");
    }
    const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, agent);

    if (action === "vault_deposit_gasless") {
      const depositParams = params as VaultDepositParams;
      if (!ethers.isAddress(depositParams.user)) {
        return NextResponse.json({ error: "Invalid user address" }, { status: 400 });
      }
      console.log(`🤖 Agent Relayer: Vault gasless deposit for ${depositParams.user}`);
      const tx = await vault.depositWithSignature(
        depositParams.user,
        BigInt(depositParams.value),
        depositParams.sourceChain || "Kite Native",
        BigInt(depositParams.validAfter),
        BigInt(depositParams.validBefore),
        depositParams.nonce,
        depositParams.v,
        depositParams.r,
        depositParams.s,
        { gasLimit: 750000 }
      );
      const receipt = await tx.wait();
      return NextResponse.json({ success: true, txHash: receipt?.hash });
    }

    if (action === "vault_withdraw_gasless") {
      const withdrawParams = params as VaultWithdrawParams;
      if (!ethers.isAddress(withdrawParams.user)) {
        return NextResponse.json({ error: "Invalid user address" }, { status: 400 });
      }
      console.log(`🤖 Agent Relayer: Vault gasless withdrawal for ${withdrawParams.user}`);
      const tx = await vault.withdrawWithSignature(
        withdrawParams.user,
        BigInt(withdrawParams.value),
        BigInt(withdrawParams.deadline),
        withdrawParams.v,
        withdrawParams.r,
        withdrawParams.s,
        { gasLimit: 750000 }
      );
      const receipt = await tx.wait();
      return NextResponse.json({ success: true, txHash: receipt?.hash });
    }

    // --- CASE 2: GASLESS SWAP (USDC -> KITE via Agent) ---
    if (action === "swap") {
        const swapParams = params as SwapParams;
        if (!ethers.isAddress(swapParams.from)) {
          return NextResponse.json({ error: "Invalid swap sender address" }, { status: 400 });
        }
        console.log(`🤖 Agent Relayer: Executing Gasless Swap for ${swapParams.from}`);
        const usdc = new ethers.Contract(USDC_ADDRESS, [
            "function transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32) external"
        ], agent);

        const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, agent);
        const iface = new ethers.Interface(ROUTER_ABI);

        const { validAfter, validBefore, nonce, v, r, s } = swapParams.auth;
        const pullTx = await usdc.transferWithAuthorization(
            swapParams.from, agent.address, BigInt(swapParams.amount), BigInt(validAfter), BigInt(validBefore), nonce, v, r, s,
            { gasLimit: 300000 }
        );
        await pullTx.wait();

        const deadline = Math.floor(Date.now() / 1000) + 1200;
        const swapCallParams = {
            tokenIn: USDC_ADDRESS, 
            tokenOut: WKITE_ADDRESS,
            deployer: ethers.ZeroAddress, 
            recipient: ROUTER_ADDRESS, // Router holds WKITE briefly to unwrap it
            deadline, 
            amountIn: BigInt(swapParams.amount), 
            amountOutMinimum: 0, 
            limitSqrtPrice: 0
        };

        const calls = [
            iface.encodeFunctionData("exactInputSingle", [swapCallParams]),
            iface.encodeFunctionData("unwrapWNativeToken", [0, swapParams.from]) // This unwraps and sends native KITE to user
        ];

        const approveTx = await new ethers.Contract(USDC_ADDRESS, ["function approve(address,uint256)"], agent).approve(ROUTER_ADDRESS, BigInt(swapParams.amount));
        await approveTx.wait();

        const tx = await router.multicall(calls, { gasLimit: 800000 });
        const receipt = await tx.wait();
        return NextResponse.json({ success: true, txHash: receipt?.hash });
    }

    // --- CASE 3: ADMIN RELAY (disabled by default) ---
    if (action === "relay") {
        const relayParams = params as RelayParams;
        const providedSecret = req.headers.get("x-agent-relay-secret");
        if (!ADMIN_RELAY_SECRET || !providedSecret || providedSecret !== ADMIN_RELAY_SECRET) {
          return NextResponse.json({ error: "Unauthorized relay action" }, { status: 401 });
        }
        if (!ethers.isAddress(relayParams.to)) {
          return NextResponse.json({ error: "Invalid relay target address" }, { status: 400 });
        }
        console.log(`🤖 Agent Relayer: Admin relay to ${relayParams.to}`);
        const tx = await agent.sendTransaction({ to: relayParams.to, data: relayParams.data, gasLimit: 600000 });
        const receipt = await tx.wait();
        return NextResponse.json({ success: true, txHash: receipt?.hash });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("Relayer Error:", err);
    const message = err instanceof Error ? err.message : "Unexpected relayer error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
