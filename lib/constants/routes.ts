/**
 * Application Routes
 * Centralized route definitions for type-safe navigation
 */

export const ROUTES = {
  // Home
  HOME: '/',

  // Crowdfunding Projects
  PROJECTS: '/projects',
  PROJECT: (id: string) => `/project/${id}` as const,
  PROJECT_CREATE: '/project/create',

  // Founder/Startup
  CREATE_PROJECT: '/project/create',

  // User Dashboard
  DASHBOARD: '/dashboard',

  // User
  PROFILE: '/profile',

  // External - Mantle Explorer
  EXPLORER_TX: (hash: string) => `https://sepolia.mantlescan.xyz/tx/${hash}` as const,
  EXPLORER_ADDRESS: (address: string) => `https://sepolia.mantlescan.xyz/address/${address}` as const,
  EXPLORER_TOKEN: (address: string) => `https://sepolia.mantlescan.xyz/token/${address}` as const,
} as const;

// Navigation items for header
export const NAV_ITEMS = [
  { label: 'Home', href: ROUTES.HOME },
  { label: 'Projects', href: ROUTES.PROJECTS },
] as const;

// User navigation items (when wallet connected)
export const USER_NAV_ITEMS = [
  { label: 'Dashboard', href: ROUTES.DASHBOARD },
] as const;
