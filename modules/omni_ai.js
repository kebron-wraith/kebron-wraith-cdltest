// CDL — modules/omni_ai.js — AI orchestration utilities
import { callAI } from "./ai_engine.js";
export async function analyzeData(user, dataType, data) { return callAI(`Analyze this ${dataType} data for ${user.name}: ${JSON.stringify(data).slice(0,500)}`, "You are a construction management AI analyst."); }
export async function generateReport(user, type, data) { return callAI(`Generate a ${type} report: ${JSON.stringify(data).slice(0,500)}`, "You are a construction management reporting AI."); }
