// CDL Site Management — modules/ui_shell.js
// Centralized inline style constants for consistent premium UI

export const S = {
  // Background colors (flat for inline style convenience)
  bgBase: '#06070a',
  bg800: '#0a0c12',
  bg700: '#0e1018',
  bg600: '#131620',
  bg500: '#1a1e2c',
  bg400: '#23283a',
  bg300: '#2e3548',
  // Nested bg group (for backward compat)
  bg: {
    base: '#06070a', bg800: '#0a0c12', bg700: '#0e1018',
    bg600: '#131620', bg500: '#1a1e2c', bg400: '#23283a', bg300: '#2e3548',
  },
  // Borders
  border: '#1a1f2e',
  borderLight: '#252b3d',
  // Text colors
  textPrimary: '#f5f7fa',
  textSecondary: '#c8cdd6',
  textMuted: '#8a91a4',
  textFaint: '#4e5568',
  // Nested text group (for backward compat)
  text: { primary: '#f5f7fa', secondary: '#c8cdd6', muted: '#8a91a4', faint: '#4e5568' },
  // Brand / accent
  gold: '#d4af6e',
  goldDim: 'rgba(212,175,110,0.6)',
  goldGlow: 'rgba(212,175,110,0.12)',
  // Semantic
  green: '#34d399',
  greenDim: 'rgba(52,211,153,0.15)',
  red: '#f87171',
  redDim: 'rgba(248,113,113,0.15)',
  blue: '#5b9aff',
  blueDim: 'rgba(91,154,255,0.15)',
  orange: '#fb923c',
  orangeDim: 'rgba(251,146,60,0.15)',
  purple: '#a78bfa',
  purpleDim: 'rgba(167,139,250,0.15)',
  teal: '#2dd4bf',
  tealDim: 'rgba(45,212,191,0.15)',
  // Shadows
  shadow: {
    sm: '0 2px 8px rgba(0,0,0,0.3)',
    md: '0 4px 20px rgba(0,0,0,0.4)',
    lg: '0 8px 40px rgba(0,0,0,0.5)',
    gold: '0 0 30px rgba(212,175,110,0.08)',
  },
};

// Flex helpers
export const flex = (direction = 'row', align = 'center', justify = 'flex-start', gap = '0') =>
  `display:flex;flex-direction:${direction};align-items:${align};justify-content:${justify};gap:${gap};`;

// Position helpers
export const pos = (type, top, right, bottom, left) =>
  `position:${type};top:${top||'auto'};right:${right||'auto'};bottom:${bottom||'auto'};left:${left||'auto'};`;

// Size helpers
export const size = (w, h) => `width:${w};height:${h||w};`;

// Border radius
export const radius = ({ sm: '4px', md: '8px', lg: '12px', xl: '16px', full: '9999px' });

// Common inline styles reused across modules
export const SHELL = {
  sidebarWidth: '260px',
  headerHeight: '60px',
  accentGrad: 'linear-gradient(135deg, #d4af6e, #b8944f)',
};

// KPI card inline style
export function kpiCardStyle(color) {
  return `background:${S.bg600};border:1px solid ${S.border};border-top:2px solid ${color};border-radius:14px;padding:18px;text-align:center;transition:all 0.25s;`;
}

// Stat value style
export function statValueStyle(color) {
  return `color:${color};font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;line-height:1.2;`;
}

// Modal overlay
export const MODAL_OVERLAY = `display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:300;align-items:center;justify-content:center;backdrop-filter:blur(8px);`;

// Modal content
export const MODAL_CONTENT = `background:${S.bg600};border:1px solid ${S.borderLight};border-radius:20px;padding:28px;max-width:600px;width:92%;max-height:85vh;overflow-y:auto;position:relative;box-shadow:0 24px 80px rgba(0,0,0,0.7),0 0 40px rgba(212,175,110,0.06);`;

// Form section
export const FORM_SECTION = `margin-bottom:16px;`;
export const FORM_LABEL = `display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:${S.textMuted};margin-bottom:6px;`;
export const FORM_INPUT = `width:100%;background:${S.bg700};border:1px solid ${S.border};border-radius:8px;padding:10px 14px;color:${S.textPrimary};font-size:13px;font-family:'Inter',sans-serif;outline:none;transition:all 0.2s;`;
