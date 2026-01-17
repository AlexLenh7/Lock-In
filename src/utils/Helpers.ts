// Checks if the site has a valid url
export async function isValid(tabUrl: string | undefined): Promise<boolean> {
  if (!tabUrl) return false;
  // if url includes invalid strings
  if (tabUrl.startsWith("chrome://") || tabUrl.startsWith("chrome-extension://") || tabUrl.includes("newtab")) {
    return false;
  }
  return tabUrl.includes("://");
}
