import { isValid } from "../utils/Helpers";

// handles true AFK status
async function handleAfkTime() {
  const { currentSite, startTime } = await chrome.storage.local.get(["currentSite", "startTime"]);
  if (currentSite && startTime) {
    await commitTime(Date.now(), startTime, currentSite);
    await chrome.storage.local.remove(["startTime", "currentSite"]);
  }
}

// handles user return from idle state
async function handleUserReturn() {
  const { idleStart, afkReached } = await chrome.storage.local.get(["idleStart", "afkReached"]);

  if (idleStart || afkReached) {
    // Mark that we need to verify if user is truly back
    await chrome.storage.local.set({
      pendingReturn: true,
      returnCheckTime: Date.now(),
    });

    await chrome.storage.local.remove(["idleStart"]);

    console.log("[Idle State] User returned, waiting 30s to verify...");
  }
}

// listens for changes in idle state
chrome.idle.onStateChanged.addListener(async (newState) => {
  const { afkActive } = await chrome.storage.sync.get("afkActive");

  if (!afkActive) {
    console.log("[Idle State] AFK disabled");
    return;
  }

  // User enters idle state (after 30 seconds of inactivity)
  if (newState === "idle") {
    const { idleStart, afkReached } = await chrome.storage.local.get(["idleStart", "afkReached"]);

    // If user was fully AFK and goes idle again, start fresh
    if (afkReached) {
      console.log("[Idle State] User was AFK, now idle again - resetting and starting fresh");
      await chrome.storage.local.remove(["afkReached", "tmpAfkTime"]);
      await chrome.storage.local.set({ idleStart: Date.now() });
      // Create AFK alarm
      chrome.alarms.create("AFKalarm", { periodInMinutes: 0.5 });
      console.log("[AFK Alarm] Created");
    } else if (!idleStart) {
      console.log("[Idle State] User is idle, starting idle timer");
      await chrome.storage.local.set({ idleStart: Date.now() });
      // Create AFK alarm to track idle time
      chrome.alarms.create("AFKalarm", { periodInMinutes: 0.5 });
      console.log("[AFK Alarm] Created");
    } else {
      console.log("[Idle State] Already tracking idle time, ignoring state change");
    }
  }
  // User returns to active state
  else if (newState === "active") {
    console.log("[Idle State] User returned to active");
    const { afkReached } = await chrome.storage.local.get("afkReached");

    // Clear AFK alarm since user is back

    // If user was fully AFK and returns, reset everything immediately
    if (afkReached) {
      console.log("[Idle State] User returned from full AFK, resetting all flags");
      await chrome.storage.local.remove(["afkReached", "tmpAfkTime", "idleStart"]);
      chrome.alarms.clear("AFKalarm");
      console.log("[AFK Alarm] Cleared");

      // Resume session for current tab
      const [currTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (currTab?.url) {
        await syncSession(currTab.url, "Return from full AFK");
      }
    } else {
      // Normal return verify for 30 seconds
      console.log("[Idle State] Keeping AFK alarm active for 30s verification");
      await handleUserReturn();
    }
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    const [currTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!currTab) return;

    await checkDay();

    if (alarm.name === "alarm") {
      console.log("[Alarm] 30 seconds passed...");
      const { currentSite, startTime, afkReached } = await chrome.storage.local.get([
        "currentSite",
        "startTime",
        "afkReached",
      ]);

      // Continue normal tracking if tab matches and we're not in AFK state
      if (currTab.url === currentSite && startTime && !afkReached) {
        const now = Date.now();
        await commitTime(now, startTime, currentSite);
        await chrome.storage.local.set({ startTime: now });
      }
    } else if (alarm.name === "AFKalarm") {
      const { currentSite, startTime, idleStart, afkReached, pendingReturn, returnCheckTime, tmpAfkTime } =
        await chrome.storage.local.get([
          "currentSite",
          "startTime",
          "idleStart",
          "afkReached",
          "pendingReturn",
          "returnCheckTime",
          "tmpAfkTime",
        ]);

      if (pendingReturn && returnCheckTime) {
        const timeSinceReturn = Math.round((Date.now() - returnCheckTime) / 1000);

        // If 30+ seconds passed and user is still active (no new idleStart)
        if (timeSinceReturn >= 30 && !idleStart) {
          console.log("[Idle State] User confirmed back, resuming normal tracking");
          // Reset all idle/AFK related flags
          await chrome.storage.local.remove([
            "pendingReturn",
            "returnCheckTime",
            "idleStart",
            "afkReached",
            "tmpAfkTime",
          ]);

          // Clear the AFK alarm since user is confirmed back
          chrome.alarms.clear("AFKalarm");
          console.log("[AFK Alarm] Cleared after confirmed return");

          // Resume session for current tab
          if (currTab.url) {
            await syncSession(currTab.url, "Confirmed return from idle");
          }
          return;
        }
        // If they went back to idle, keep waiting
        else if (idleStart) {
          console.log("[Idle State] User went back to idle, continuing to track");
          await chrome.storage.local.remove(["pendingReturn", "returnCheckTime"]);
          // Don't return - continue to AFK tracking below
        } else {
          // Still waiting for 30 seconds to pass
          return;
        }
      }

      // If already reached true AFK, stop all tracking
      if (afkReached) {
        console.log("[AFK] Already reached threshold, skipping tracking");
        return;
      }

      // Check if user has reached true AFK time
      if (idleStart && !afkReached) {
        const elapsed = Math.round((Date.now() - idleStart) / 1000);
        const { afkTime, afkActive } = await chrome.storage.sync.get(["afkTime", "afkActive"]);

        // Initialize tmpAfkTime if it doesn't exist
        const currentTmpAfkTime = tmpAfkTime !== undefined ? tmpAfkTime : afkTime;

        // User has reached true AFK threshold
        if (elapsed >= afkTime && afkActive) {
          console.log(`[AFK] User reached AFK threshold (${afkTime}s), stopping tracking`);
          await handleAfkTime();
          await chrome.storage.local.set({ afkReached: true });

          // Clear the AFK alarm since we've reached the threshold
          chrome.alarms.clear("AFKalarm");
          console.log("[AFK Alarm] Cleared after reaching threshold");
          return;
        }

        // User is idle but hasn't reached AFK threshold yet
        // Account for 30 second intervals between idle checks
        const newTmpAfkTime = Math.max(0, currentTmpAfkTime - 30);
        await chrome.storage.local.set({ tmpAfkTime: newTmpAfkTime });

        console.log(`[AFK] Idle for ${elapsed}s / ${afkTime}s (tmpAfkTime: ${newTmpAfkTime}s), continuing to track`);

        // Continue committing time every 30 seconds even while idle
        // Only stop when we reach the full AFK threshold
        if (currTab.url === currentSite && startTime) {
          const now = Date.now();
          await commitTime(now, startTime, currentSite);
          await chrome.storage.local.set({ startTime: now });
        }
      }
    }
  } catch (error) {
    console.error("[Alarm Error]:", error);
  }
});

// create the alarm fires 30 seconds
chrome.runtime.onInstalled.addListener(async () => {
  try {
    chrome.alarms.create("alarm", { periodInMinutes: 0.5 });
    chrome.alarms.create("AFKalarm", { periodInMinutes: 0.5 });
    await updateContentScript();
    chrome.idle.setDetectionInterval(30);
    await fullReset();
    await resetWeeklyData();
    //cleanupOldStorageData();
  } catch (error) {
    console.error("[onInstall Error]:", error);
  }
});

chrome.runtime.onStartup.addListener(async () => {
  try {
    await updateContentScript();
    await checkDay();
  } catch (error) {
    console.error("[onStartup Error]:", error);
  }
});

// helper function checks for day to store times
async function checkDay() {
  try {
    const { currentDay } = await chrome.storage.local.get("currentDay");
    const today = new Date().getDay();

    if (currentDay === undefined) {
      console.log("[Setup] First run detected. Initializing currentDay.");
      await chrome.storage.local.set({ currentDay: today });
      return;
    }

    // Check for same day before running
    if (today === currentDay) {
      console.log("[CheckDay] Day is not over, skipping...");
      return;
    }

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const yesterdayName = days[currentDay]; // Use stored currentDay as the previous day

    const {
      storeBlockDay = {},
      storeGlobalDay = {},
      globalWebsiteTime = {},
      totalWebsiteTime = {},
    } = await chrome.storage.local.get(["globalWebsiteTime", "totalWebsiteTime", "storeGlobalDay", "storeBlockDay"]);

    // Save the PREVIOUS day's accumulated data
    storeBlockDay[yesterdayName] = totalWebsiteTime;
    storeGlobalDay[yesterdayName] = globalWebsiteTime;

    console.log(`[CheckDay] Saved data for ${yesterdayName}:`, {
      blocked: totalWebsiteTime,
      global: globalWebsiteTime,
    });

    // Handle gaps between days
    let counter = (currentDay + 1) % 7;
    while (counter !== today) {
      const gapDayName = days[counter];
      storeBlockDay[gapDayName] = null;
      storeGlobalDay[gapDayName] = null;
      counter = (counter + 1) % 7;
    }

    // store the all times into that day and update date
    // currentDay is stored as a number
    await chrome.storage.local.set({ storeBlockDay, storeGlobalDay, currentDay: today });
    console.log("CurrDay Blocked Times:", storeBlockDay);
    console.log("CurrDay Global Times:", storeGlobalDay);
    // reset times for the new day
    await cleanupOldStorageData();
  } catch (error) {
    console.error("[checkDay Error]:", error);
  }
}

// helper function checks if website is blocked
async function checkBlock(tabUrl) {
  try {
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
  } catch (error) {
    console.error("[checkBlock Error]:", error);
  }
}

async function commitTime(now, start, url) {
  try {
    const delta = (now - start) / 1000;
    if (delta <= 0 || isNaN(delta)) return;

    const currDay = new Date().getDay();
    await chrome.storage.local.set({ currentDay: currDay });

    const domain = new URL(url).hostname.replace(/^www\./, "");

    const { globalWebsiteTime = {}, totalWebsiteTime = {} } = await chrome.storage.local.get([
      "globalWebsiteTime",
      "totalWebsiteTime",
    ]);
    globalWebsiteTime[domain] = (globalWebsiteTime[domain] || 0) + delta;

    const isBlocked = await checkBlock(url);
    let updateData = { globalWebsiteTime };

    // always track blocked sites even if timer isn't active
    if (isBlocked) {
      // ALWAYS UPDATE TIME ON BLOCKED SITES
      totalWebsiteTime[domain] = (totalWebsiteTime[domain] || 0) + delta;

      // ONLY UPDATE IF TIMER IS ACTIVE
      // TIMER ONLY CHANGES
      const { maxTime, active } = await chrome.storage.sync.get(["maxTime", "active"]);
      if (active) {
        const newMaxTime = Math.max(0, maxTime - delta);
        await chrome.storage.sync.set({ maxTime: newMaxTime });
        await chrome.storage.local.set({ showAction: newMaxTime <= 0 });
        console.log("[Timer Active] Remaining Time:", newMaxTime);
      } else {
        console.log(`[Timer Disable] adding: ${delta} to ${domain}`);
      }

      updateData.totalWebsiteTime = totalWebsiteTime;

      console.log("block sites:", totalWebsiteTime);
    }

    await chrome.storage.local.set(updateData);
    console.log(`[Timer] Committed ${delta}s to ${domain}. Blocked: ${isBlocked}`);
    console.log("global sites:", globalWebsiteTime);
  } catch (error) {
    console.error("[commitTime Error]:", error);
  }
}

async function syncSession(tabUrl, reason) {
  try {
    console.log(`[Event] Triggered by: ${reason}`);
    const now = Date.now();
    //const today = new Date().getDay();

    // grab user settings
    const { globalSwitch, active, maxTime } = await chrome.storage.sync.get(["globalSwitch", "active", "maxTime"]);
    const { currentSite, startTime } = await chrome.storage.local.get(["currentSite", "startTime"]);

    // make a check to see if scripts exist before blocking
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    if (!scripts.some((s) => s.id === "blockedSites")) {
      console.log("Scripts missing. re-registering");
      await updateContentScript();
    }

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
    if (await isValid(tabUrl)) {
      await chrome.storage.local.set({
        startTime: now,
        currentSite: tabUrl,
        showAction: !(active && maxTime > 0),
      });
    }
  } catch (error) {
    console.error("[syncSession Error]:", error);
  }
}

// updates the content scripts with blocked sites as matches
async function updateContentScript() {
  try {
    const { website } = await chrome.storage.sync.get("website");

    // if storage is empty/undefined don't wipe
    if (!website || website.length === 0) return;

    const patterns = website.map((site) => {
      const domain = site.text.replace(/^https?:\/\//, "").replace(/^www\./, "");
      return `*://*.${domain}/*`;
    });

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
    console.error("[updateContentScript Error]:", error);
  }
}

// use chrome.tabs.onActivated to listen for tab switches
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      await syncSession(tab.url, "Tab Switch");
    }
  } catch (error) {
    console.error("[onActivated Error]:", error);
  }
});

// Checks if user doesn't switch tabs but updates current tab
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    // if internal url content has changed we handle time between change
    if (changeInfo.url) {
      await syncSession(tab.url, "URL path change");
    }
  } catch (error) {
    console.error("[onUpdated Error]:", error);
  }
});

// updates storage when settings change
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  try {
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

      const oldList = changes.website.oldValue || [];
      const newList = changes.website.newValue || [];

      // remove blocked site time if block list changes
      const removeSites = oldList.filter((oldSite) => !newList.some((newSite) => newSite.text === oldSite.text));
      console.log("Found old site", removeSites);
      if (removeSites.length > 0) {
        const { totalWebsiteTime = {} } = await chrome.storage.local.get("totalWebsiteTime");

        removeSites.forEach((site) => {
          if (totalWebsiteTime[site.text]) {
            console.log("Removing time for: ", totalWebsiteTime[site.text]);
            delete totalWebsiteTime[site.text];
          }
        });
        await chrome.storage.local.set({ totalWebsiteTime });
      }
    }

    // evaluate the current tab based on new settings regardless
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab.url) {
      // We pass the latest changes directly to syncSession if possible,
      await syncSession(tab.url, "Settings Toggle");
    }
  } catch (error) {
    console.error("[onChange Error]:", error);
  }
});

// updates timer when user closes tab
chrome.tabs.onRemoved.addListener(async (tabId) => {
  try {
    await checkDay();
    const { currentSite, startTime } = await chrome.storage.local.get(["currentSite", "startTime"]);

    if (currentSite && startTime) {
      const now = Date.now();
      // If the tab closed was the one we were tracking, save the time
      commitTime(now, startTime, currentSite);
      await chrome.storage.local.remove(["currentSite", "startTime"]);
    }
  } catch (error) {
    console.error("[onRemove error]:", error);
  }
});

async function cleanupOldStorageData() {
  await chrome.storage.local.remove(["totalWebsiteTime", "globalWebsiteTime"]);
  console.log("[Cleanup] No old entries found.");
}

async function resetWeeklyData() {
  await chrome.storage.local.remove(["totalWebsiteTime", "globalWebsiteTime", "storeBlockDay", "storeGlobalDay"]);
}

async function fullReset() {
  await chrome.storage.local.remove(["pendingReturn", "returnCheckTime", "idleStart", "afkReached", "tmpAfkTime"]);
  console.log("[Cleanup] full reset.");
}
