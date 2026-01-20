// Avatar utility functions using memoji avatars from CDN

const AVATAR_BASE_URL = 'https://cdn.jsdelivr.net/gh/alohe/memojis/png';
const AVATAR_COUNT = 27; // vibrent_1 through vibrent_27

/**
 * Generate a random avatar URL from the memoji collection
 */
export function getRandomAvatarUrl(): string {
  const randomNum = Math.floor(Math.random() * AVATAR_COUNT) + 1;
  return `${AVATAR_BASE_URL}/vibrent_${randomNum}.png`;
}

/**
 * Get a specific avatar URL by number (1-27)
 */
export function getAvatarUrl(num: number): string {
  const safeNum = Math.max(1, Math.min(AVATAR_COUNT, num));
  return `${AVATAR_BASE_URL}/vibrent_${safeNum}.png`;
}

/**
 * Get all available avatar URLs
 */
export function getAllAvatarUrls(): string[] {
  return Array.from({ length: AVATAR_COUNT }, (_, i) => getAvatarUrl(i + 1));
}
