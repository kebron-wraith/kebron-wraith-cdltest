// CDL — modules/perms_bootstrap.js — Permission bootstrap utilities
import { ROLES } from "./roles.js";
export function getPermissionsForRole(roleKey) { return ROLES[roleKey] || {}; }
export function hasPermission(roleKey, permission) { const role = ROLES[roleKey]; if (!role) return false; return role[permission] === true; }
export function getSiteScope(roleKey) { const role = ROLES[roleKey]; return role?.siteScope || "assigned"; }
