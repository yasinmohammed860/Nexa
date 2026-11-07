export const PORT = Number(process.env.PORT || 3000);
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PROD = NODE_ENV === 'production';
export const SESSION_DAYS = Math.max(1, Number(process.env.SESSION_DAYS || 30));

export const PUBLIC_URL = (
  process.env.PUBLIC_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${PORT}`
).replace(/\/+$/, '');

export const FREE_TRIAL_SECONDS = Math.max(60, Number(process.env.FREE_TRIAL_SECONDS || 5 * 60 * 60));
export const FREE_AGENT_LIMIT = 1;
export const MEMBER_AGENT_LIMIT = 25;

export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

const rawAnthropicKey = (process.env.ANTHROPIC_API_KEY || '').trim();
// Standard Messages API keys begin with sk-ant-api. Other tokens found in some
// environments (OAuth/session tokens) are rejected by the API, so treat them as
// unconfigured and run in demo mode instead of failing every message.
const anthropicKeyLooksValid = rawAnthropicKey.startsWith('sk-ant-api');

export const AI = {
  // auto = pick the first configured provider (DeepSeek, then OpenAI, then Anthropic).
  provider: (process.env.AI_PROVIDER || 'auto').trim().toLowerCase(),
  anthropic: {
    apiKey: anthropicKeyLooksValid ? rawAnthropicKey : '',
    model: (process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6').trim(),
  },
  openai: {
    apiKey: (process.env.OPENAI_API_KEY || '').trim(),
    model: (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
    baseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').trim(),
  },
  deepseek: {
    apiKey: (process.env.DEEPSEEK_API_KEY || '').trim(),
    model: (process.env.DEEPSEEK_MODEL || 'deepseek-chat').trim(),
    baseUrl: (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').trim(),
  },
  rejectedKey: Boolean(rawAnthropicKey && !anthropicKeyLooksValid),
};

export const PAYMENTS = {
  demo: String(process.env.PAYMENTS_DEMO ?? 'true').toLowerCase() !== 'false',
};

// Manual payment destination shown at checkout. Members send the amount to this
// account with their payment reference, then an admin approves it.
export const PAYMENT_ACCOUNT = {
  provider: (process.env.PAYMENT_PROVIDER || 'EBIRR').trim(),
  number: (process.env.PAYMENT_ACCOUNT_NUMBER || '0958131880').trim(),
  name: (process.env.PAYMENT_ACCOUNT_NAME || '').trim(),
};

export const PRICING = {
  USD: { currency: 'USD', amount: 1000, display: '$10' },
  ETB: { currency: 'ETB', amount: 300000, display: '3,000 ETB' },
};

export function pricingForCountry(country) {
  return country === 'ET' ? PRICING.ETB : PRICING.USD;
}

// Countries offered at sign-up. ETB pricing applies to Ethiopia.
export const COUNTRIES = [
  { code: 'ET', name: 'Ethiopia', currency: 'ETB' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'USD' },
  { code: 'CA', name: 'Canada', currency: 'USD' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'USD' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'USD' },
  { code: 'KE', name: 'Kenya', currency: 'USD' },
  { code: 'DJ', name: 'Djibouti', currency: 'USD' },
  { code: 'SO', name: 'Somalia', currency: 'USD' },
  { code: 'SD', name: 'Sudan', currency: 'USD' },
  { code: 'SS', name: 'South Sudan', currency: 'USD' },
  { code: 'EG', name: 'Egypt', currency: 'USD' },
  { code: 'ZA', name: 'South Africa', currency: 'USD' },
  { code: 'NG', name: 'Nigeria', currency: 'USD' },
  { code: 'IN', name: 'India', currency: 'USD' },
  { code: 'PK', name: 'Pakistan', currency: 'USD' },
  { code: 'DE', name: 'Germany', currency: 'USD' },
  { code: 'FR', name: 'France', currency: 'USD' },
  { code: 'NL', name: 'Netherlands', currency: 'USD' },
  { code: 'SE', name: 'Sweden', currency: 'USD' },
  { code: 'NO', name: 'Norway', currency: 'USD' },
  { code: 'TR', name: 'Türkiye', currency: 'USD' },
  { code: 'AU', name: 'Australia', currency: 'USD' },
  { code: 'JP', name: 'Japan', currency: 'USD' },
  { code: 'CN', name: 'China', currency: 'USD' },
  { code: 'BR', name: 'Brazil', currency: 'USD' },
];

export const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));

export const TONES = ['Professional', 'Friendly', 'Direct', 'Warm', 'Playful', 'Formal'];
