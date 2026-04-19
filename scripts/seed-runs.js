const fs = require('fs');
const path = require('path');
const os = require('os');

const STORE_FILE_PATH = path.join(os.tmpdir(), "allocai-runs.json");

const SEED_RUNS = [
  {
    runId: "run_seed_001",
    payerAddress: "0xE5f3e81f3045865EB140fCC44038433891D0e25f",
    paymentReference: "SEED_PAY_001",
    settlementReference: "SEED_SETTLE_001",
    paymentTo: "0xe9367876a4Adf9697A19f187aC386f7881077699",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    runType: "paid",
    success: true,
    responseTimeMs: 1240,
    decision: {
      action: "rebalance",
      reason: "Detected 4.2% yield spike on Aave V3 (Base) with sufficient liquidity.",
      confidence: 0.92,
      selectedOpportunity: {
        protocol: "Aave v3",
        chain: "Base",
        apr: 6.85,
        liquidity: 45000000
      },
      proofReceipt: {
        runId: "run_seed_001",
        txHash: "0xec6d8a6130f842552d832770b0226ac3dc71377b2f887c4741764e792b986f7d",
        timestamp: new Date().toISOString()
      }
    },
    logs: [
      { id: "s1", timestamp: new Date().toISOString(), message: "Scanning DeFiLlama USDC pools...", type: "scan" },
      { id: "s2", timestamp: new Date().toISOString(), message: "Filtering for Lucid-compatible bridges.", type: "scan" },
      { id: "s3", timestamp: new Date().toISOString(), message: "Computing optimal route: Kite -> Lucid -> Base.", type: "decision" }
    ]
  },
  {
    runId: "run_auto_001",
    payerAddress: null,
    paymentReference: "AUTO_REF",
    settlementReference: "AUTO_SETTLE",
    paymentTo: "SYSTEM",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    runType: "autonomous",
    success: true,
    responseTimeMs: 850,
    decision: {
      action: "hold",
      reason: "Current allocation in Lucid Native (Kite) remains optimal after gas adjustment.",
      confidence: 0.98,
      selectedOpportunity: {
        protocol: "Lucid Native",
        chain: "Kite AI",
        apr: 5.85,
        liquidity: 12000000
      }
    },
    logs: [
      { id: "a1", timestamp: new Date().toISOString(), message: "Autonomous heartbeat triggered.", type: "scan" },
      { id: "a2", timestamp: new Date().toISOString(), message: "No significant yield delta detected (>0.5% threshold).", type: "decision" }
    ]
  }
];

function seed() {
  console.log("🌱 Seeding AllocAI Demo Data...");
  try {
    const dir = path.dirname(STORE_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(SEED_RUNS), "utf8");
    console.log("✅ Seeded 2 runs to:", STORE_FILE_PATH);
  } catch (err) {
    console.error("❌ Failed to seed:", err);
  }
}

seed();
