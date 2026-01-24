import { type Website } from "../pages/Websites";

// Checks if the site has a valid url
export async function isValid(tabUrl: string | undefined): Promise<boolean> {
  if (!tabUrl) return false;
  // if url includes invalid strings
  if (tabUrl.startsWith("chrome://") || tabUrl.startsWith("chrome-extension://") || tabUrl.includes("newtab")) {
    return false;
  }
  return tabUrl.includes("://");
}

// helper function checks if website is blocked
export async function checkBlock(tabUrl: string) {
  try {
    const { website } = await chrome.storage.sync.get({ website: [] });
    if (tabUrl) {
      try {
        const tabDomain = new URL(tabUrl).hostname.replace(/^www\./, "");
        return (website as Website[]).some((site: Website) => site.text === tabDomain); // returns t/f if website is blocked
      } catch (error) {
        console.log(error);
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error("[checkBlock Error]:", error);
  }
}

export function formatTotalTime(totalSeconds: number) {
  if (totalSeconds <= 0 || isNaN(totalSeconds)) return "0s";

  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);

  const parts = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  if (days === 0 && hours === 0 && minutes === 0) {
    parts.push(`${seconds}s`);
  }
  return parts.join(" ");
}

export function formatTimeDifference(seconds: number) {
  const isNegative = seconds < 0;
  const absSeconds = Math.abs(seconds);

  if (absSeconds === 0 || isNaN(seconds)) return "0s";

  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const secs = Math.round(absSeconds % 60);

  const parts = [];

  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (hours === 0 && minutes === 0) parts.push(`${secs}s`);

  const timeStr = parts.join(" ");
  return isNegative ? `-${timeStr}` : `+${timeStr}`;
}
