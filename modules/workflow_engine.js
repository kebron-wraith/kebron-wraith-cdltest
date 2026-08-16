// CDL — modules/workflow_engine.js — Workflow utilities
export function getNextWorkflowStep(currentStep, workflow) { const idx = workflow.findIndex(s => s.key === currentStep); return idx >= 0 && idx < workflow.length - 1 ? workflow[idx + 1] : null; }
export function canAdvanceWorkflow(step, userRole) { return step?.roles?.includes(userRole) || false; }
export function getWorkflowProgress(currentStep, workflow) { const idx = workflow.findIndex(s => s.key === currentStep); return idx >= 0 ? Math.round(((idx + 1) / workflow.length) * 100) : 0; }
