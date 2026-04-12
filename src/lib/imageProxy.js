/**
 * File proxy utilities — Supabase Edge Functions.
 * New files from Supabase Storage pass through unchanged.
 */

const SUPABASE_URL = "https://zamrusolomzustgenpin.supabase.co";
const FILE_PROXY_OPT_IN_KEY = "use_file_proxy";
const BLOCKED_DOMAINS = ["cdn.base44.com", "base44.com"];

function needsProxy(url) {
  if (!url) return false;
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) return false;
  try {
    const parsed = new URL(url);
    return BLOCKED_DOMAINS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

function mapLegacyUrl(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (!BLOCKED_DOMAINS.includes(parsed.hostname)) return url;

    const path = parsed.pathname.toLowerCase();
    if (path.includes('readynormnewlogosidewaystext')) return '/readynorm-logo-sideways.svg';
    if (path.includes('readynormnewlogowithtext')) return '/readynorm-logo-main.svg';
    if (path.includes('digitalsignaturereadynormalplaceholder')) return '/readynorm-logo-main.svg';

    return '/readynorm-logo-main.svg';
  } catch {
    return url;
  }
}

function isFileProxyEnabled() {
  try {
    return localStorage.getItem(FILE_PROXY_OPT_IN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function isExternalUrl(url) {
  if (!url) return false;
  if (url.startsWith('data:') || url.startsWith('blob:')) return false;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin !== window.location.origin;
  } catch {
    return false;
  }
}

export function getProxiedImageUrl(url) {
  if (!url) return "";
  const mappedUrl = mapLegacyUrl(url);
  if (needsProxy(mappedUrl) && isFileProxyEnabled()) {
    return `${SUPABASE_URL}/functions/v1/fileProxy?url=${encodeURIComponent(mappedUrl)}`;
  }
  return mappedUrl;
}

export function getProxiedFileUrl(url) {
  return getProxiedImageUrl(url);
}

export function getProxiedDownloadUrl(url, filename) {
  if (!url) return "";
  const mappedUrl = mapLegacyUrl(url);
  if (needsProxy(mappedUrl) && isFileProxyEnabled()) {
    let downloadUrl = `${SUPABASE_URL}/functions/v1/fileProxy?url=${encodeURIComponent(mappedUrl)}&download=true`;
    if (filename) downloadUrl += `&filename=${encodeURIComponent(filename)}`;
    return downloadUrl;
  }
  return mappedUrl;
}

export async function fetchProxiedImage(url) {
  return getProxiedImageUrl(url) || "";
}

export const BRAND_LOGOS = {
  sideways: "/readynorm-logo-sideways.svg",
  main: "/readynorm-logo-main.svg",
};

export default {
  getProxiedImageUrl,
  getProxiedFileUrl,
  getProxiedDownloadUrl,
  fetchProxiedImage,
  BRAND_LOGOS,
  isExternalUrl,
};