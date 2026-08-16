// CDL — modules/risk_engine.js — Risk assessment utilities
export function calculateRiskScore(incidents, stock, transfers) {
  const incidentWeight = incidents?.length * 10 || 0;
  const lowStockWeight = stock?.filter(s => (s.quantity || 0) < 10).length * 5 || 0;
  const transferWeight = transfers?.filter(t => !['completed', 'rejected'].includes(t.status)).length * 3 || 0;
  return Math.min(100, incidentWeight + lowStockWeight + transferWeight);
}
export function getRiskLevel(score) { if (score >= 70) return 'critical'; if (score >= 40) return 'high'; if (score >= 20) return 'medium'; return 'low'; }
