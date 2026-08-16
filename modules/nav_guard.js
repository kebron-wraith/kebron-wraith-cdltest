// CDL — modules/nav_guard.js
import { ROLES } from "./roles.js";

export function checkAccess(section, user) {
  if (!user) return false;
  const role = ROLES[user.role];
  if (!role) return false;
  if (user.role === "admin") return true;
  const rules = {
    "budget":()=>role.canSeeBudget||false,
    "site_manage":()=>["admin","asset_manager","ceo","company_owner"].includes(user.role),
    "procurement":()=>["admin","company_owner","ceo","asset_manager","procurement_officer"].includes(user.role),
    "balance_lock":()=>["admin","ceo","company_owner"].includes(user.role),
    "transfers":()=>["admin","company_owner","ceo","asset_manager","project_manager","transfer_officer"].includes(user.role),
    "financials":()=>role.canSeeAllFinancials||false,
    "inventory":()=>["admin","company_owner","ceo","asset_manager","project_manager","store_manager"].includes(user.role),
    "grn":()=>true,
    "requests":()=>!["storekeeper_local","storekeeper_import","storekeeper_scaffolding"].includes(user.role),
    "incidents":()=>true,
    "reports":()=>true,
    "dashboard":()=>true,
    "users":()=>["admin","company_owner"].includes(user.role),
    "audit":()=>["admin","company_owner"].includes(user.role),
    "transfer_log":()=>["admin","company_owner","ceo","asset_manager"].includes(user.role),
    "onboarding":()=>["admin","company_owner"].includes(user.role),
    "material_approvals":()=>["admin", "store_manager"].includes(user.role),
  };
  return rules[section] ? rules[section]() : true;
}
