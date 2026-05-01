import type { IronSessionOptions } from 'iron-session'

const rawPassword = process.env.IRON_SESSION_PASSWORD ?? process.env.DASHBOARD_PASSWORD

if (!rawPassword || rawPassword.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('IRON_SESSION_PASSWORD must be set and at least 32 characters long in production. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
  } else {
    // warn in dev and fall back to a deterministic padded value to avoid throwing
    // (still encourage setting a proper secret)
    // eslint-disable-next-line no-console
    console.warn('Warning: IRON_SESSION_PASSWORD is not set or shorter than 32 chars. Using a development fallback; set IRON_SESSION_PASSWORD for production.')
  }
}

const sessionPassword = rawPassword && rawPassword.length >= 32 ? rawPassword : (rawPassword ?? 'dev_secret').padEnd(32, '0')

export const ironSessionOptions: IronSessionOptions = {
  password: sessionPassword,
  cookieName: 'iron-session',
  // secure should be true in production (HTTPS)
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production'
  }
}
