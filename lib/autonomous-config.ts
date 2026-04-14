export const AUTONOMOUS_INTERVAL_MS = Number(process.env.AUTONOMOUS_INTERVAL_MS || `${24 * 60 * 60 * 1000}`);
export const AUTONOMOUS_PORTFOLIO_USDC = Number(process.env.AUTONOMOUS_PORTFOLIO_USDC || "25000");
export const AUTONOMOUS_BASELINE_APR = Number(process.env.AUTONOMOUS_BASELINE_APR || "2.25");
export const AUTONOMOUS_RISK_PROFILE: "medium" = "medium";
export const AUTONOMOUS_PROFILE_LABEL = process.env.AUTONOMOUS_PROFILE_LABEL || "Generic Autonomous High-Conviction Basket";
export const AUTONOMOUS_TICK_SECRET = process.env.AUTONOMOUS_TICK_SECRET || "";

