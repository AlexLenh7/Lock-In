// when alarm goes off respond to it
chrome.alarms.onAlarm.addListener(async (alarm) => {
  // action for when alarm goes off
  console.log("[Alarm] 30 seconds passed...");
  const [currTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!currTab) return;

  const { currentSite, startTime } = await chrome.storage.local.get(["currentSite", "startTime"]);
  // make a check to see if tab has changed AND if blocked
  if (currTab.url === currentSite && startTime) {
    const now = Date.now();
    await commitTime(now, startTime, currentSite);
    await chrome.storage.local.set({ startTime: now });
  }
});

// create the alarm fires every minute
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("alarm", {
    periodInMinutes: 0.5,
  });
  updateContentScript();
  //cleanupOldStorageData();
});

chrome.runtime.onStartup.addListener(() => {
  updateContentScript();
});

// helper function checks if website is blocked
async function checkBlock(tabUrl) {
  const { website } = await chrome.storage.sync.get({ website: [] });
  if (tabUrl) {
    try {
      const tabDomain = new URL(tabUrl).hostname.replace(/^www\./, "");
      return website.some((site) => site.text === tabDomain); // returns t/f if website is blocked
    } catch (error) {
      console.log(error);
      return false;
    }
  }
  return false;
}

async function commitTime(now, start, url) {
  const delta = (now - start) / 1000;
  if (delta <= 0 || isNaN(delta)) return;

  const domain = new URL(url).hostname.replace(/^www\./, "");

  // 1. Always update Global Time
  const { globalWebsiteTime = {} } = await chrome.storage.local.get("globalWebsiteTime");
  globalWebsiteTime[domain] = (globalWebsiteTime[domain] || 0) + delta;

  // 2. Conditionally update Blocked Time and Countdown
  const isBlocked = await checkBlock(url);
  let updateData = { globalWebsiteTime };

  if (isBlocked) {
    const { totalWebsiteTime = {} } = await chrome.storage.local.get("totalWebsiteTime");
    totalWebsiteTime[domain] = (totalWebsiteTime[domain] || 0) + delta;

    const { maxTime } = await chrome.storage.sync.get({ maxTime: 1800 });
    const newMaxTime = Math.max(0, maxTime - delta);

    console.log(`[Timer] Subtraction: ${delta}. Remaining: ${newMaxTime}`);

    await chrome.storage.sync.set({ maxTime: newMaxTime });
    updateData.totalWebsiteTime = totalWebsiteTime;

    await chrome.storage.local.set({ showAction: newMaxTime <= 0 });
    console.log("block sites:", totalWebsiteTime);
  }

  await chrome.storage.local.set(updateData);
  console.log(`[Timer] Committed ${delta}s to ${domain}. Blocked: ${isBlocked}`);
  console.log("global sites:", globalWebsiteTime);
}

async function syncSession(tabUrl, reason) {
  console.log(`[Event] Triggered by: ${reason}`);
  const now = Date.now();

  // grab user settings
  const { globalSwitch, active, maxTime } = await chrome.storage.sync.get(["globalSwitch", "active", "maxTime"]);
  const { currentSite, startTime } = await chrome.storage.local.get(["currentSite", "startTime"]);

  // If the extension is OFF, stop everything immediately.
  if (globalSwitch === false || globalSwitch === undefined || active === undefined) {
    console.log("[Guard] Extension is Disabled. Allowing all traffic.");
    return;
  }

  // if site and start time already exists remove it and start a new session
  if (currentSite && startTime) {
    await chrome.storage.local.remove(["currentSite", "startTime"]);
    await commitTime(now, startTime, currentSite);
    console.log(`[Timer] Committing time for previous path: ${currentSite}`);
  }

  // tracks all valid sites
  if (tabUrl && !tabUrl.startsWith("chrome://") && !tabUrl.startsWith("chrome-extension://")) {
    const isBlocked = await checkBlock(tabUrl);
    await chrome.storage.local.set({
      startTime: now,
      currentSite: tabUrl,
      showAction: !(active && maxTime > 0),
    });
  }
}

// updates the content scripts with blocked sites as matches
async function updateContentScript() {
  const { website } = await chrome.storage.sync.get({ website: [] });

  const patterns = website.map((site) => {
    const domain = site.text.replace(/^https?:\/\//, "").replace(/^www\./, "");
    return `*://*.${domain}/*`;
  });

  try {
    // check for old scripts if they exists
    const oldScripts = await chrome.scripting.getRegisteredContentScripts();
    if (oldScripts.some((script) => script.id === "blockedSites")) {
      await chrome.scripting.unregisterContentScripts({ ids: ["blockedSites"] });
      console.log("content script unregistered");
    }

    // register updated scripts for each website
    if (patterns.length > 0) {
      await chrome.scripting.registerContentScripts([
        {
          id: "blockedSites",
          js: ["src/content.tsx"],
          matches: patterns,
          runAt: "document_start",
        },
      ]);
      console.log("Content Script Registered for:", patterns);
    }
  } catch (error) {
    console.log(error);
    console.error("Registration Failed:", error);
  }
}

// use chrome.tabs.onActivated to listen for tab switches
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    await syncSession(tab.url, "Tab Switch");
  }
});

// Checks if user doesn't switch tabs but updates current tab
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // if internal url content has changed we handle time between change
  if (changeInfo.url) {
    await syncSession(tab.url, "URL path change");
  }
});

// updates storage when settings change
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace !== "sync") return;
  console.log("[Settings] Change detected:", Object.keys(changes));

  if (changes.maxTime) {
    const { startTime } = await chrome.storage.local.get("startTime");
    if (startTime) {
      return;
    }
  }

  // handles timer and global switches to stop the clock immediately
  const globalOff = changes.globalSwitch && changes.globalSwitch.newValue === false;
  const timerOff = changes.active && changes.active.newValue === false;

  if (globalOff || timerOff) {
    console.log("[Cleanup] User disabled extension/timer. Stopping session.");

    const { startTime, currentSite } = await chrome.storage.local.get(["startTime", "currentSite"]);
    await chrome.storage.local.set({ showAction: false });
    // if start time exists then handle remaining time left
    if (startTime && currentSite) {
      await chrome.storage.local.remove(["currentSite", "startTime"]);
      const now = Date.now();
      commitTime(now, startTime, currentSite);
    }
  }

  // if website list changes in storage
  if (changes.website) {
    updateContentScript();
  }

  // evaluate the current tab based on new settings regardless
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab.url) {
    // We pass the latest changes directly to syncSession if possible,
    await syncSession(tab.url, "Settings Toggle");
  }
});

// updates timer when user closes tab
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const { currentSite, startTime } = await chrome.storage.local.get(["currentSite", "startTime"]);

  if (currentSite && startTime) {
    try {
      const now = Date.now();
      // If the tab closed was the one we were tracking, save the time
      commitTime(now, startTime, currentSite);
      await chrome.storage.local.remove(["currentSite", "startTime"]);
    } catch (error) {
      console.error("[Tab onRemove error]:", error);
    }
  }
});

async function cleanupOldStorageData() {
  await chrome.storage.local.remove(["totalWebsiteTime", "globalWebsiteTime", "currentSite", "startTime"]);
  console.log("[Cleanup] No old entries found.");
}
