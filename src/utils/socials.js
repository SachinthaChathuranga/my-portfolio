/**
 * Shared Social Platforms Registry & Ordering Helpers
 * Supports YouTube, LinkedIn, Facebook, Instagram, TikTok & GitHub with custom ordering.
 */

export const SOCIAL_PLATFORMS = [
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourchannel", color: "#FF0033" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/yourprofile", color: "#0A66C2" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourprofile", color: "#1877F2" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourhandle", color: "#E4405F" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourhandle", color: "#00F2EA" },
  { key: "github", label: "GitHub", placeholder: "https://github.com/yourusername", color: "#E2E8F0" },
];

export const DEFAULT_SOCIAL_ORDER = SOCIAL_PLATFORMS.map((p) => p.key);

const PLATFORM_MAP = Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p.key, p]));

/**
 * Returns all known social keys in the user's chosen order (falling back cleanly to defaults).
 */
export function getOrderedSocialKeys(profile) {
  const custom = Array.isArray(profile?.socialOrder) ? profile.socialOrder : [];
  const validCustom = custom.filter((k) => Boolean(PLATFORM_MAP[k]));
  const missing = DEFAULT_SOCIAL_ORDER.filter((k) => !validCustom.includes(k));
  return [...validCustom, ...missing];
}

/**
 * Returns only configured (non-empty) social link entries in the user's exact chosen order.
 */
export function getActiveSocials(profile) {
  const socialsObj = profile?.socials || {};
  return getOrderedSocialKeys(profile)
    .map((key) => {
      const meta = PLATFORM_MAP[key];
      const href = String(socialsObj[key] || "").trim();
      return { ...meta, href };
    })
    .filter((item) => Boolean(item.href));
}
