import { isValid, checkBlock, sumObjectValues } from "../utils/Helpers";

// Set true for development for logging
const DEBUG = false;
const log = (...args) => DEBUG && console.log(...args);

async function calculateInsights() {
  try {
    const {
      globalWebsiteTime = {},
      totalWebsiteTime = {},
      storeBlockDay = {},
      storeGlobalDay = {},
      currentDay,
    } = await chrome.storage.local.get([
      "globalWebsiteTime",
      "totalWebsiteTime",
      "storeBlockDay",
      "storeGlobalDay",
      "currentDay",
    ]);

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayIndex = currentDay ?? new Date().getDay();
    const todayName = days[todayIndex];

    // Calculate today's totals
    const todayGlobalTotal = sumObjectValues(globalWebsiteTime);
    const todayBlockedTotal = sumObjectValues(totalWebsiteTime);

    // Calculate weekly totals
    let weeklyGlobalTotal = todayGlobalTotal;
    let weeklyBlockedTotal = todayBlockedTotal;
    let daysWithData = todayGlobalTotal > 0 ? 1 : 0;

    days.forEach((day) => {
      if (day !== todayName) {
        const dayGlobalData = storeGlobalDay[day];
        const dayBlockData = storeBlockDay[day];

        if (dayGlobalData && typeof dayGlobalData === "object") {
          const dayGlobalTotal = sumObjectValues(dayGlobalData);
          weeklyGlobalTotal += dayGlobalTotal;
          if (dayGlobalTotal > 0) daysWithData++;
        }

        if (dayBlockData && typeof dayBlockData === "object") {
          const dayBlockedTotal = sumObjectValues(dayBlockData);
          weeklyBlockedTotal += dayBlockedTotal;
        }
      }
    });

    // Calculate daily average
    const dailyAverage = daysWithData > 0 ? weeklyGlobalTotal / daysWithData : 0;

    // Get yesterday's data
    const yesterdayIndex = (todayIndex - 1 + 7) % 7;
    const yesterdayName = days[yesterdayIndex];
    const yesterdayGlobalData = storeGlobalDay[yesterdayName];
    const yesterdayBlockData = storeBlockDay[yesterdayName];

    const yesterdayTotal = sumObjectValues(yesterdayGlobalData);
    const yesterdayBlocked = sumObjectValues(yesterdayBlockData);

    // Calculate percentage of time on blocked sites
    const blockedPercentage = todayGlobalTotal > 0 ? (todayBlockedTotal / todayGlobalTotal) * 100 : 0;
    const weeklyBlockedPercentage = weeklyGlobalTotal > 0 ? (weeklyBlockedTotal / weeklyGlobalTotal) * 100 : 0;
    const yesterdayBlockedPercentage = yesterdayTotal > 0 ? (yesterdayBlocked / yesterdayTotal) * 100 : 0;

    // Calculate time spent comparisons from yesterday
    const timeSpentFromYesterday =
      yesterdayTotal > 0 ? ((yesterdayTotal - todayGlobalTotal) / yesterdayTotal) * 100 : 0;

    const blockedTimeFromYesterday =
      yesterdayBlocked > 0 ? ((yesterdayBlocked - todayBlockedTotal) / yesterdayBlocked) * 100 : 0;

    // Calculate difference from average
    const diffFromAverage = todayGlobalTotal - dailyAverage;

    // Helper function to calculate focus score for any day
    const calculateDayFocusScore = (dayGlobalTotal, dayBlockedTotal, prevDayBlockedTotal) => {
      if (dayGlobalTotal === 0) return 0;

      let score = 100;

      // Blocked percentage (max -40 points)
      const dayBlockedPercentage = dayGlobalTotal > 0 ? (dayBlockedTotal / dayGlobalTotal) * 100 : 0;
      score -= Math.min(40, dayBlockedPercentage * 0.8);

      // Compare blocked time to yesterday (max -30 points)
      if (prevDayBlockedTotal > 0) {
        const blockedImprovement = ((prevDayBlockedTotal - dayBlockedTotal) / prevDayBlockedTotal) * 100;
        if (blockedImprovement < 0) {
          // More blocked time than yesterday - deduct points
          score -= Math.min(30, Math.abs(blockedImprovement) * 0.6);
        } else {
          // Less blocked time than yesterday - add points
          score += Math.min(15, blockedImprovement * 0.6);
        }
      }

      return Math.max(0, Math.min(100, Math.round(score)));
    };

    // Calculate today's focus score
    let focusScore = 100;

    // Deduct points for high blocked percentage (max -40 points)
    focusScore -= Math.min(40, blockedPercentage * 0.8);

    // Compare blocked time to yesterday (max -30 points)
    if (yesterdayBlocked > 0) {
      const blockedImprovement = ((yesterdayBlocked - todayBlockedTotal) / yesterdayBlocked) * 100;
      if (blockedImprovement < 0) {
        // More blocked time than yesterday - deduct points
        focusScore -= Math.min(30, Math.abs(blockedImprovement) * 0.6);
      } else {
        // Less blocked time than yesterday - add points
        focusScore += Math.min(15, blockedImprovement * 0.6);
      }
    }

    focusScore = Math.max(0, Math.min(100, Math.round(focusScore)));

    // Calculate yesterday's focus score for comparison
    // Get day before yesterday's blocked time
    const dayBeforeYesterdayIndex = (yesterdayIndex - 1 + 7) % 7;
    const dayBeforeYesterdayName = days[dayBeforeYesterdayIndex];
    const dayBeforeYesterdayBlockData = storeBlockDay[dayBeforeYesterdayName];
    const dayBeforeYesterdayBlocked =
      dayBeforeYesterdayBlockData && typeof dayBeforeYesterdayBlockData === "object"
        ? sumObjectValues(dayBeforeYesterdayBlockData)
        : 0;

    const yesterdayFocusScore = calculateDayFocusScore(yesterdayTotal, yesterdayBlocked, dayBeforeYesterdayBlocked);

    // Calculate focus score change from yesterday
    const focusScoreFromYesterday = yesterdayFocusScore > 0 ? focusScore - yesterdayFocusScore : 0;

    // Calculate streak (consecutive days with focus score > 80)
    let streak = 0;

    // Pre-calculate all day totals to avoid repeated reduce calls
    const dayTotalsCache = {};
    days.forEach((day) => {
      const dayGlobalData = storeGlobalDay[day];
      const dayBlockData = storeBlockDay[day];
      dayTotalsCache[day] = {
        global: sumObjectValues(dayGlobalData),
        blocked: sumObjectValues(dayBlockData),
      };
    });

    if (focusScore > 79) {
      streak = 1;

      for (let i = 1; i < 7; i++) {
        const checkDayIndex = (todayIndex - i + 7) % 7;
        const checkDayName = days[checkDayIndex];

        const checkDayTotals = dayTotalsCache[checkDayName];
        if (!checkDayTotals || checkDayTotals.global === 0) break;

        const prevCheckDayIndex = (checkDayIndex - 1 + 7) % 7;
        const prevCheckDayName = days[prevCheckDayIndex];
        const prevCheckDayTotals = dayTotalsCache[prevCheckDayName];

        const dayScore = calculateDayFocusScore(
          checkDayTotals.global,
          checkDayTotals.blocked,
          prevCheckDayTotals ? prevCheckDayTotals.blocked : 0,
        );

        if (dayScore > 79) {
          streak++;
        } else {
          break;
        }
      }
    }

    // Find best and worst days based on blocked time
    let bestBlockedDay = null;
    let worstBlockedDay = null;

    const blockedDaysData = [];

    if (todayBlockedTotal > 0) {
      blockedDaysData.push({ name: todayName, blockedTime: todayBlockedTotal });
    }

    days.forEach((day) => {
      if (day !== todayName && dayTotalsCache[day]) {
        const dayBlockedTotal = dayTotalsCache[day].blocked;
        if (dayBlockedTotal > 0) {
          blockedDaysData.push({ name: day, blockedTime: dayBlockedTotal });
        }
      }
    });

    if (blockedDaysData.length > 0) {
      bestBlockedDay = blockedDaysData.reduce((best, current) =>
        current.blockedTime < best.blockedTime ? current : best,
      );
      worstBlockedDay = blockedDaysData.reduce((worst, current) =>
        current.blockedTime > worst.blockedTime ? current : worst,
      );
    }

    // Calculate daily average for blocked time
    const dailyBlockedAverage =
      blockedDaysData.length > 0
        ? blockedDaysData.reduce((sum, day) => sum + day.blockedTime, 0) / blockedDaysData.length
        : 0;

    // Calculate average blocked percentage
    const averageBlockedPercentage = dailyAverage > 0 ? (dailyBlockedAverage / dailyAverage) * 100 : 0;

    const insights = {
      todayTotal: todayGlobalTotal,
      todayBlocked: todayBlockedTotal,
      weeklyTotal: weeklyGlobalTotal,
      weeklyBlocked: weeklyBlockedTotal,
      dailyAverage,
      dailyBlockedAverage,
      averageBlockedPercentage,
      yesterdayTotal,
      yesterdayBlocked,
      blockedPercentage,
      weeklyBlockedPercentage,
      yesterdayBlockedPercentage,
      timeSpentFromYesterday,
      blockedTimeFromYesterday,
      focusScoreFromYesterday,
      yesterdayFocusScore,
      diffFromAverage,
      focusScore,
      streak,
      bestDay: bestBlockedDay?.name || todayName,
      bestDayBlockedTime: bestBlockedDay?.blockedTime || todayBlockedTotal,
      worstDay: worstBlockedDay?.name || todayName,
      worstDayBlockedTime: worstBlockedDay?.blockedTime || todayBlockedTotal,
      lastUpdated: Date.now(),
    };

    await chrome.storage.local.set({ insights });
    log("[Insights] Calculated:", insights);

    return insights;
  } catch (error) {
    console.error("[calculateInsights Error]:", error);
    return null;
  }
}

// handles true AFK status
async function handleAfkTime(currentSite, startTime) {
  if (currentSite && startTime) {
    await commitTime(Date.now(), startTime, currentSite);
    await chrome.storage.local.remove(["startTime", "currentSite"]);
  }
}

// listens for changes in idle state
chrome.idle.onStateChanged.addListener(async (newState) => {
  const { afkActive } = await chrome.storage.sync.get("afkActive");

  if (!afkActive) {
    log("[Idle State] AFK disabled");
    return;
  }

  // User enters idle state (after 30 seconds of inactivity)
  if (newState === "idle") {
    const { idleStart, afkReached, currentSite, startTime } = await chrome.storage.local.get([
      "idleStart",
      "afkReached",
      "currentSite",
      "startTime",
    ]);

    // commit remaining time when entering idle
    if (currentSite && startTime && !afkReached && !idleStart) {
      const now = Date.now();
      await commitTime(now, startTime, currentSite);
      await chrome.storage.local.set({ startTime: now });
      log("[Idle State] Committed pre-idle time chunk");
    }

    // If user was fully AFK and goes idle again, start fresh
    // if currentSite then user is still afk
    if (afkReached && currentSite) {
      // Create AFK alarm
      await chrome.storage.local.remove(["afkReached"]);
      await chrome.storage.local.set({ idleStart: Date.now() });
      chrome.alarms.create("AFKalarm", { periodInMinutes: 0.5 });

      log("[Idle State] User was AFK now idle again");
    } else if (!idleStart) {
      // Create AFK alarm to track idle time
      await chrome.storage.local.set({ idleStart: Date.now(), afkReached: false });
      chrome.alarms.create("AFKalarm", { periodInMinutes: 0.5 });

      log("[Idle State] User is idle, starting idle timer");
    } else {
      log("[Idle State] Already tracking idle time, ignoring state change");

      // If we were verifying a return, but the user went back to idle, cancel the check!
      const { pendingReturn } = await chrome.storage.local.get("pendingReturn");
      if (pendingReturn) {
        log("[Idle State] User went back to idle during verification. Resuming.");
        await chrome.storage.local.remove(["pendingReturn", "returnCheckTime"]);
      }
    }
  }
  // User returns to active state verify it manually
  else if (newState === "active") {
    log("[Idle State] User returned to active");
    await chrome.storage.local.set({
      pendingReturn: true,
      returnCheckTime: Date.now(),
    });
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    const [currTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!currTab) return;

    if (alarm.name === "alarm") {
      log("[Alarm] 30 seconds passed...");
      await checkDay();
      const { currentSite, startTime, afkReached, idleStart } = await chrome.storage.local.get([
        "currentSite",
        "startTime",
        "afkReached",
        "idleStart",
      ]);

      // Continue normal tracking if tab matches and we're not in AFK state
      if (currTab.url === currentSite && startTime && !afkReached && !idleStart) {
        const now = Date.now();
        await commitTime(now, startTime, currentSite);
        await chrome.storage.local.set({ startTime: now });
      }
    } else if (alarm.name === "AFKalarm") {
      const { currentSite, startTime, idleStart, afkReached, pendingReturn, returnCheckTime } =
        await chrome.storage.local.get([
          "currentSite",
          "startTime",
          "idleStart",
          "afkReached",
          "pendingReturn",
          "returnCheckTime",
        ]);

      if (pendingReturn === true && returnCheckTime) {
        const rawTime = (Date.now() - returnCheckTime) / 1000;
        //const activeDuration = Math.min(30, Math.floor(rawTime));
        let activeDuration = Math.round(rawTime);
        if (activeDuration <= 2) activeDuration = 0;
        else if (activeDuration >= 28) activeDuration = 30;
        // const isUserBack = Math.abs(activeDuration - 30) > 1 && activeDuration !== 0;
        const isUserBack = activeDuration !== 0 && activeDuration !== 30;

        log("isUserBack:", isUserBack, "[rawTime]:", rawTime, "[activeDuration]:", activeDuration);

        // If we detect 1+ seconds of movement elapsed from timer we reset
        if (isUserBack) {
          log("[Idle State] User confirmed back, resuming normal tracking");
          // Reset all idle/AFK related flags
          await chrome.storage.local.remove(["pendingReturn", "returnCheckTime", "idleStart", "afkReached"]);

          // Clear the AFK alarm since user is confirmed back
          chrome.alarms.clear("AFKalarm");

          // Resume session for current tab
          if (currTab.url) {
            await syncSession(currTab.url, "Confirmed return from idle");
          }
          return;
        }
        // If they went back to idle, keep waiting
        else if (idleStart) {
          log("[Idle State] User went back to idle/afk, continuing to track");
          await chrome.storage.local.remove(["pendingReturn", "returnCheckTime"]);
        } else {
          return;
        }
      }

      // user is fully afk skip tracking
      if (afkReached) {
        log("[AFK] Already reached threshold, skipping tracking");
        return;
      }

      // Check if user has reached true AFK time
      if (idleStart && !afkReached) {
        const totalIdleTime = Math.round((Date.now() - idleStart) / 1000);
        const { afkTime, afkActive } = await chrome.storage.sync.get(["afkTime", "afkActive"]);

        // User has reached true AFK threshold
        if (totalIdleTime >= afkTime && afkActive) {
          log(`[AFK] User reached AFK threshold (${afkTime}s), stopping tracking`);
          await handleAfkTime(currentSite, startTime);
          await chrome.storage.local.set({ afkReached: true });
          return;
        }
        log(`[AFK] Idle for ${totalIdleTime}s / ${afkTime}s, continuing to track`);

        // Continue committing time every 30 seconds while idle
        if (currTab.url === currentSite && startTime) {
          const now = Date.now();
          await commitTime(now, startTime, currentSite);
          await chrome.storage.local.set({ startTime: now });
        }
      }
    } else if (alarm.name === "UpdateInsights") {
      await calculateInsights();
    }
  } catch (error) {
    console.error("[Alarm Error]:", error);
  }
});

// declare functions to run on start/update
async function startUpEvent() {
  try {
    log("[Starting Up Extension]");
    await updateContentScript();
    await resetAfkChecks();
    await calculateInsights();
    chrome.idle.setDetectionInterval(30);
    chrome.alarms.create("alarm", { periodInMinutes: 0.5 });
    chrome.alarms.create("UpdateInsights", { periodInMinutes: 5 });
  } catch (error) {
    console.error("[StartUp Error]:", error);
  }
}

chrome.runtime.onInstalled.addListener(async (details) => {
  log("[onInstalled Called]");
  if (details.reason === "install") {
    await chrome.storage.sync.set({
      globalSwitch: true,
      active: false,
      maxTime: 0,
      action: "Disabled",
      afkTime: 600,
      afkActive: true,
      redirect: "",
      nuke: false,
      website: [],
      theme: "default-dark",
      timerPause: false,
    });
  }
  await startUpEvent();
});

chrome.runtime.onStartup.addListener(async () => {
  log("[onStartup Called]");
  await startUpEvent();
});

// helper function checks for day to store times
async function checkDay() {
  try {
    const today = new Date().getDay();

    const [localData, syncData] = await Promise.all([
      chrome.storage.local.get([
        "currentDay",
        "globalWebsiteTime",
        "totalWebsiteTime",
        "storeGlobalDay",
        "storeBlockDay",
        "tmpMaxTime",
      ]),
      chrome.storage.sync.get(["active", "maxTime"]),
    ]);
    const { currentDay, globalWebsiteTime, totalWebsiteTime, storeGlobalDay, storeBlockDay, tmpMaxTime } = localData;
    const { active, maxTime } = syncData;

    if (currentDay === undefined) {
      log("[Setup] First run detected. Initializing currentDay.");
      await chrome.storage.local.set({ currentDay: today });
      await calculateInsights();
      return;
    }

    // Same day skip
    if (today === currentDay) {
      log("[CheckDay] Day is not over, skipping...");
      return;
    }

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const yesterdayName = days[currentDay]; // Use stored currentDay as the previous day

    const updatedStoreBlock = storeBlockDay || {};
    const updatedStoreGlobal = storeGlobalDay || {};

    // Save the PREVIOUS day's accumulated data
    updatedStoreBlock[yesterdayName] = totalWebsiteTime || {};
    updatedStoreGlobal[yesterdayName] = globalWebsiteTime || {};

    log(`[CheckDay] Saved data for ${yesterdayName}:`, {
      blocked: totalWebsiteTime,
      global: globalWebsiteTime,
    });

    // Handle gaps between days
    let counter = (currentDay + 1) % 7;
    while (counter !== today) {
      const gapDayName = days[counter];
      updatedStoreBlock[gapDayName] = null;
      updatedStoreGlobal[gapDayName] = null;
      counter = (counter + 1) % 7;
    }

    // store the all times into that day and update date
    // currentDay is stored as a number
    const updates = {
      storeBlockDay: updatedStoreBlock,
      storeGlobalDay: updatedStoreGlobal,
      currentDay: today,
    };

    log("CurrDay Blocked Times:", storeBlockDay);
    log("CurrDay Global Times:", storeGlobalDay);

    // reset times for the new day
    await resetTodayTimeData();

    if (active && (tmpMaxTime === undefined || tmpMaxTime <= 0)) {
      updates.tmpMaxTime = maxTime;
      updates.showAction = false;
    }

    await chrome.storage.local.set(updates);
    log(`[CheckDay] Rollover to ${days[today]} complete.`);
    await calculateInsights();
  } catch (error) {
    console.error("[checkDay Error]:", error);
  }
}

async function handleRedirect(action, redirect, isBlocked, showAction) {
  if (action !== "Redirect" || !redirect) return;

  if (isBlocked && showAction) {
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (activeTab?.id) {
      const target = redirect.startsWith("http") ? redirect : `https://${redirect}`;
      chrome.tabs.update(activeTab.id, { url: target });
    }
  }
}

async function handleNuke(action, nuke, isBlocked, showAction) {
  if (action !== "Block" || !nuke) return;

  if (isBlocked && showAction) {
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (activeTab?.id) {
      chrome.tabs.remove(activeTab.id);
    }
  }
}

async function commitTime(now, start, url) {
  try {
    const delta = (now - start) / 1000;
    if (delta <= 0 || isNaN(delta)) return;
    const domain = new URL(url).hostname.replace(/^www\./, "");

    const [localData, syncData] = await Promise.all([
      chrome.storage.local.get(["startTime", "globalWebsiteTime", "totalWebsiteTime", "tmpMaxTime", "showAction"]),
      chrome.storage.sync.get(["active", "maxTime", "timerPause", "action", "redirect", "nuke"]),
    ]);

    const updateData = {};

    // Update Global time
    const globalWebsiteTime = localData.globalWebsiteTime || {};
    globalWebsiteTime[domain] = (globalWebsiteTime[domain] || 0) + delta;
    updateData.globalWebsiteTime = globalWebsiteTime;

    const isBlocked = await checkBlock(url);

    // always track blocked sites even if timer isn't active
    if (isBlocked) {
      // ALWAYS UPDATE TIME ON BLOCKED SITES
      const totalWebsiteTime = localData.totalWebsiteTime || {};
      totalWebsiteTime[domain] = (totalWebsiteTime[domain] || 0) + delta;
      updateData.totalWebsiteTime = totalWebsiteTime;

      // ONLY UPDATE IF TIMER IS ACTIVE
      // TIMER ONLY CHANGES
      const active = syncData.active;
      let tmpMaxTime = localData.tmpMaxTime;
      const timerPause = syncData.timerPause || false;

      // Saftey check if tmpMaxTime is missing
      if (active && (tmpMaxTime === undefined || tmpMaxTime === null)) {
        tmpMaxTime = syncData.maxTime;
        log("[Timer] tmpMaxTime missing. Seeding:", tmpMaxTime);
      }

      if (active && !timerPause) {
        const newMaxTime = Math.max(0, tmpMaxTime - delta);
        const shouldShowAction = newMaxTime <= 0;
        updateData.tmpMaxTime = newMaxTime;

        // Only update showAction if it changed
        if (localData.showAction !== shouldShowAction) {
          updateData.showAction = shouldShowAction;
        }

        log("[Timer Active] Remaining Time:", newMaxTime);
        if (shouldShowAction) {
          await Promise.all([
            handleRedirect(url, syncData.action, syncData.redirect, isBlocked, shouldShowAction),
            handleNuke(url, syncData.action, syncData.nuke, isBlocked, shouldShowAction),
          ]).catch(console.error);
        }
      } else {
        log(`[Timer Disable] adding: ${delta} to ${domain}`);
      }
      log("block sites:", totalWebsiteTime);
    }

    await chrome.storage.local.set(updateData);
    log(`[Timer] Committed ${delta}s to ${domain}. Blocked: ${isBlocked}`);
    log("global sites:", globalWebsiteTime);
  } catch (error) {
    console.error("[commitTime Error]:", error);
  }
}

let syncSessionTimeout = null;
async function debouncedSyncSession(tabUrl, reason) {
  if (syncSessionTimeout) clearTimeout(syncSessionTimeout);

  syncSessionTimeout = setTimeout(() => {
    syncSession(tabUrl, reason).catch(console.error);
  }, 100);
}

async function syncSession(tabUrl, reason) {
  try {
    log(`[Event] Triggered by: ${reason}`);
    const now = Date.now();

    // grab user settings
    const [syncSettings, localData] = await Promise.all([
      chrome.storage.sync.get(["globalSwitch", "active"]),
      chrome.storage.local.get(["currentSite", "startTime", "tmpMaxTime"]),
    ]);
    const { globalSwitch, active } = syncSettings;
    const { currentSite, startTime, tmpMaxTime } = localData;

    // If the extension is OFF, stop everything immediately.
    if (globalSwitch === false || globalSwitch === undefined) {
      log("[Guard] Extension is Disabled. Allowing all traffic.");
      return;
    }

    // if site and start time already exists remove it and start a new session
    if (currentSite && startTime) {
      await commitTime(now, startTime, currentSite);
      await chrome.storage.local.remove(["currentSite", "startTime"]);
      log(`[Timer] Committing time for previous path: ${currentSite}`);
    }

    // tracks all valid sites
    if (await isValid(tabUrl)) {
      await chrome.storage.local.set({
        startTime: now,
        currentSite: tabUrl,
        showAction: !(active && tmpMaxTime > 0),
      });

      const { action, redirect, nuke } = await chrome.storage.sync.get(["action", "redirect", "nuke"]);
      const isBlocked = await checkBlock(tabUrl);
      const { showAction } = await chrome.storage.local.get("showAction");

      await Promise.all([
        handleRedirect(tabUrl, action, redirect, isBlocked, showAction),
        handleNuke(tabUrl, action, nuke, isBlocked, showAction),
      ]).catch(console.error);
    }
  } catch (error) {
    console.error("[syncSession Error]:", error);
  }
}

let lastPatterns = null;
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

    const patternsString = JSON.stringify(patterns.sort());
    if (patternsString === lastPatterns) {
      log("Content script patterns unchanged, skipping update");
      return;
    }
    lastPatterns = patternsString;

    // check for old scripts if they exists
    const oldScripts = await chrome.scripting.getRegisteredContentScripts();
    if (oldScripts.some((script) => script.id === "blockedSites")) {
      await chrome.scripting.unregisterContentScripts({ ids: ["blockedSites"] });
      log("content script unregistered");
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
      log("Content Script Registered for:", patterns);
    }
  } catch (error) {
    console.error("[updateContentScript Error]:", error);
  }
}

async function returnIdleAfk() {
  try {
    const { pendingReturn, idleStart, afkReached } = await chrome.storage.local.get([
      "pendingReturn",
      "idleStart",
      "afkReached",
    ]);

    if (pendingReturn || idleStart || afkReached) {
      log("[URL Change] User returned from idle/AFK state");
      await chrome.storage.local.remove(["idleStart", "pendingReturn", "afkReached", "returnCheckTime"]);
    }
  } catch (error) {
    console.error("[returnIdleAfk Error]:", error);
  }
}

// use chrome.tabs.onActivated to listen for tab switches
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    const window = await chrome.windows.get(activeInfo.windowId);

    if (tab.url && window.focused) {
      await returnIdleAfk();
      await debouncedSyncSession(tab.url, "Tab Switch");
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
      await returnIdleAfk();
      await debouncedSyncSession(tab.url, "URL path change");
    }
  } catch (error) {
    console.error("[onUpdated Error]:", error);
  }
});

// updates storage when settings change
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  try {
    if (namespace !== "sync") return;
    log("[Settings] Change detected:", Object.keys(changes));

    if (changes.maxTime && !changes.tmpMaxTime) {
      const newMaxTime = changes.maxTime.newValue;
      await chrome.storage.local.set({ tmpMaxTime: newMaxTime, showAction: false });
      log("[Settings] maxTime changed. Reseeded tmpMaxTime to:", newMaxTime);
    }
    // When active toggles ON, also seed tmpMaxTime from current maxTime if it wasn't just set above
    if (changes.active && changes.active.newValue === true && !changes.maxTime) {
      const { maxTime } = await chrome.storage.sync.get("maxTime");
      await chrome.storage.local.set({ tmpMaxTime: maxTime, showAction: false });
      log("[Timer] active toggled ON. Seeded tmpMaxTime from maxTime:", maxTime);
    }

    // handles timer and global switches to stop the clock immediately
    const globalOff = changes.globalSwitch && changes.globalSwitch.newValue === false;
    const timerOff = changes.active && changes.active.newValue === false;
    const globalOn = changes.globalSwitch && changes.globalSwitch.newValue === true;
    const timerOn = changes.active && changes.active.newValue === true;

    // handles global switch off
    if (globalOff || timerOff) {
      log("[Cleanup] User disabled extension/timer. Stopping session.");

      const { startTime, currentSite } = await chrome.storage.local.get(["startTime", "currentSite"]);
      await chrome.storage.local.set({ showAction: false });
      // if start time exists then handle remaining time left
      if (startTime && currentSite) {
        await chrome.storage.local.remove(["currentSite", "startTime"]);
        const now = Date.now();
        await commitTime(now, startTime, currentSite);
      }
    }

    // handle global switch on
    if (globalOn || timerOn) {
      log("[Cleanup] User enabled extension/timer. start session.");
      const [currTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (currTab?.url) {
        await syncSession(currTab.url, "Settings Re-enabled");
      }
      return;
    }

    // if website list changes in storage
    if (changes.website) {
      await updateContentScript();

      const oldList = changes.website.oldValue || [];
      const newList = changes.website.newValue || [];

      // remove blocked site time if block list changes
      const removeSites = oldList.filter((oldSite) => !newList.some((newSite) => newSite.text === oldSite.text));
      log("Found old site", removeSites);
      if (removeSites.length > 0) {
        const { totalWebsiteTime = {} } = await chrome.storage.local.get("totalWebsiteTime");

        removeSites.forEach((site) => {
          if (totalWebsiteTime[site.text]) {
            log("Removing time for: ", totalWebsiteTime[site.text]);
            delete totalWebsiteTime[site.text];
          }
        });
        await chrome.storage.local.set({ totalWebsiteTime });
      }
    }

    const hasSessionRelevantChange = Object.keys(changes).some((key) => SESSION_RELEVANT_KEYS.has(key));
    if (hasSessionRelevantChange) {
      const [currTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (currTab?.url && (await isValid(currTab.url))) {
        await syncSession(currTab.url, "Settings Toggle");
      }
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
      await returnIdleAfk();
    }
  } catch (error) {
    console.error("[onRemove error]:", error);
  }
});

async function resetTodayTimeData() {
  await chrome.storage.local.remove(["totalWebsiteTime", "globalWebsiteTime"]);
  log("[Cleanup] No old entries found.");
}

async function resetWeeklyData() {
  await chrome.storage.local.remove(["totalWebsiteTime", "globalWebsiteTime", "storeBlockDay", "storeGlobalDay"]);
}

async function resetAfkChecks() {
  await chrome.storage.local.remove(["pendingReturn", "returnCheckTime", "idleStart", "afkReached"]);
  log("[Cleanup] full reset.");
}

async function resetInsights() {
  await chrome.storage.local.remove(["insights"]);
}
