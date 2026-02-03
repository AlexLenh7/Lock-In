import { isValid, checkBlock } from "../utils/Helpers";

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
    const todayGlobalTotal = Object.values(globalWebsiteTime).reduce((sum, time) => sum + time, 0);
    const todayBlockedTotal = Object.values(totalWebsiteTime).reduce((sum, time) => sum + time, 0);

    // Calculate weekly totals
    let weeklyGlobalTotal = todayGlobalTotal;
    let weeklyBlockedTotal = todayBlockedTotal;
    let daysWithData = todayGlobalTotal > 0 ? 1 : 0;

    days.forEach((day) => {
      if (day !== todayName) {
        const dayGlobalData = storeGlobalDay[day];
        const dayBlockData = storeBlockDay[day];

        if (dayGlobalData && typeof dayGlobalData === "object") {
          const dayGlobalTotal = Object.values(dayGlobalData).reduce((sum, time) => sum + time, 0);
          weeklyGlobalTotal += dayGlobalTotal;
          if (dayGlobalTotal > 0) daysWithData++;
        }

        if (dayBlockData && typeof dayBlockData === "object") {
          const dayBlockedTotal = Object.values(dayBlockData).reduce((sum, time) => sum + time, 0);
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

    const yesterdayTotal =
      yesterdayGlobalData && typeof yesterdayGlobalData === "object"
        ? Object.values(yesterdayGlobalData).reduce((sum, time) => sum + time, 0)
        : 0;

    const yesterdayBlocked =
      yesterdayBlockData && typeof yesterdayBlockData === "object"
        ? Object.values(yesterdayBlockData).reduce((sum, time) => sum + time, 0)
        : 0;

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
        ? Object.values(dayBeforeYesterdayBlockData).reduce((sum, time) => sum + time, 0)
        : 0;

    const yesterdayFocusScore = calculateDayFocusScore(yesterdayTotal, yesterdayBlocked, dayBeforeYesterdayBlocked);

    // Calculate focus score change from yesterday
    const focusScoreFromYesterday = yesterdayFocusScore > 0 ? focusScore - yesterdayFocusScore : 0;

    // Calculate streak (consecutive days with focus score > 80)
    let streak = 0;

    if (focusScore > 79) {
      streak = 1;

      for (let i = 1; i < 7; i++) {
        const checkDayIndex = (todayIndex - i + 7) % 7;
        const checkDayName = days[checkDayIndex];
        const checkDayGlobalData = storeGlobalDay[checkDayName];
        const checkDayBlockData = storeBlockDay[checkDayName];

        if (!checkDayGlobalData || typeof checkDayGlobalData !== "object") {
          break;
        }

        const checkDayGlobalTotal = Object.values(checkDayGlobalData).reduce((sum, time) => sum + time, 0);
        const checkDayBlockedTotal =
          checkDayBlockData && typeof checkDayBlockData === "object"
            ? Object.values(checkDayBlockData).reduce((sum, time) => sum + time, 0)
            : 0;

        const prevCheckDayIndex = (checkDayIndex - 1 + 7) % 7;
        const prevCheckDayName = days[prevCheckDayIndex];
        const prevCheckDayBlockData = storeBlockDay[prevCheckDayName];
        const prevCheckDayBlockedTotal =
          prevCheckDayBlockData && typeof prevCheckDayBlockData === "object"
            ? Object.values(prevCheckDayBlockData).reduce((sum, time) => sum + time, 0)
            : 0;

        const dayScore = calculateDayFocusScore(checkDayGlobalTotal, checkDayBlockedTotal, prevCheckDayBlockedTotal);

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
      if (day !== todayName) {
        const dayBlockData = storeBlockDay[day];
        if (dayBlockData && typeof dayBlockData === "object") {
          const dayBlockedTotal = Object.values(dayBlockData).reduce((sum, time) => sum + time, 0);
          if (dayBlockedTotal > 0) {
            blockedDaysData.push({ name: day, blockedTime: dayBlockedTotal });
          }
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
    console.log("[Insights] Calculated:", insights);

    return insights;
  } catch (error) {
    console.error("[calculateInsights Error]:", error);
    return null;
  }
}

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

      if (pendingReturn === true && returnCheckTime) {
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
    await updateContentScript();
    chrome.idle.setDetectionInterval(30);
    await resetAfkChecks();
    //await resetInsights();
    //await resetWeeklyData();
    //cleanupTodayTimeData();
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
      await calculateInsights();
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
    await resetTodayTimeData();

    // Timer reset on day rollover
    const { tmpMaxTime } = await chrome.storage.local.get("tmpMaxTime");
    const { active, maxTime } = await chrome.storage.sync.get(["active", "maxTime"]);

    if (active && (tmpMaxTime === undefined || tmpMaxTime === null || tmpMaxTime <= 0)) {
      await chrome.storage.local.set({ tmpMaxTime: maxTime, showAction: false });
      console.log("[CheckDay] Timer expired or unused yesterday. Seeded fresh tmpMaxTime:", maxTime);
    } else if (active && tmpMaxTime > 0) {
      console.log("[CheckDay] Timer still counting down across midnight. Leaving tmpMaxTime at:", tmpMaxTime);
    }

    await calculateInsights();
  } catch (error) {
    console.error("[checkDay Error]:", error);
  }
}

// Handles redirect action when landing on a blocked site
async function handleRedirect(tabUrl) {
  try {
    const { action, redirect } = await chrome.storage.sync.get(["action", "redirect"]);

    // Redirect if action is set to Redirect and a valid redirect URL exists
    if (action !== "Redirect" || !redirect) {
      return;
    }

    // Check if the current URL is a blocked site
    const isBlocked = await checkBlock(tabUrl);
    if (!isBlocked) {
      return;
    }

    // Check if showAction is true (timer inactive or expired)
    const { showAction } = await chrome.storage.local.get("showAction");
    if (!showAction) {
      return;
    }

    // perform redirect
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (activeTab?.id) {
      const target = redirect.startsWith("http") ? redirect : `https://${redirect}`;
      chrome.tabs.update(activeTab.id, { url: target });
      console.log(`[Redirect] Blocked site detected. Redirecting tab ${activeTab.id} to ${target}`);
    }
  } catch (error) {
    console.error("[handleRedirect Error]:", error);
  }
}

async function handleNuke(tabUrl) {
  try {
    const { action, nuke } = await chrome.storage.sync.get(["action", "nuke"]);

    // Check if action is on block or nuke is active
    if (action !== "Block" || !nuke) {
      return;
    }

    // Check if the current URL is a blocked site
    const isBlocked = await checkBlock(tabUrl);
    if (!isBlocked) {
      return;
    }

    // Check if showAction is true (timer inactive or expired)
    const { showAction } = await chrome.storage.local.get("showAction");
    if (!showAction) {
      return;
    }

    // Delete current website
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (activeTab?.id) {
      // Ensure the redirect URL has a protocol
      chrome.tabs.remove(activeTab.id);
      console.log(`[Nuke] Nuke is enabled. Deleting tab ${activeTab.id}`);
    }
  } catch (error) {
    console.error("[handleRedirect Error]:", error);
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
      const { active } = await chrome.storage.sync.get(["active"]);
      let { tmpMaxTime } = await chrome.storage.local.get(["tmpMaxTime"]);

      // Saftey check if tmpMaxTime is missing
      if (active && (tmpMaxTime === undefined || tmpMaxTime === null)) {
        const { maxTime } = await chrome.storage.sync.get("maxTime");
        tmpMaxTime = maxTime;
        await chrome.storage.local.set({ tmpMaxTime });
        console.log("[Timer] tmpMaxTime was missing. Emergency seed from maxTime:", tmpMaxTime);
      }

      if (active) {
        const newMaxTime = Math.max(0, tmpMaxTime - delta);
        await chrome.storage.local.set({ tmpMaxTime: newMaxTime, showAction: newMaxTime <= 0 });
        console.log("[Timer Active] Remaining Time:", newMaxTime);
        if (shouldShowAction) {
          await handleRedirect(url);
          await handleNuke(url);
        }
      } else {
        console.log(`[Timer Disable] adding: ${delta} to ${domain}`);
      }
      updateData.totalWebsiteTime = totalWebsiteTime;
      console.log("block sites:", totalWebsiteTime);
    }

    await chrome.storage.local.set(updateData);
    await calculateInsights();
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
    const { globalSwitch, active } = await chrome.storage.sync.get(["globalSwitch", "active"]);
    const { currentSite, startTime, tmpMaxTime } = await chrome.storage.local.get([
      "currentSite",
      "startTime",
      "tmpMaxTime",
    ]);

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
        showAction: !(active && tmpMaxTime > 0),
      });

      await handleRedirect(tabUrl);
      await handleNuke(tabUrl);
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
      const newMaxTime = changes.maxTime.newValue;
      await chrome.storage.local.set({ tmpMaxTime: newMaxTime, showAction: false });
      console.log("[Settings] maxTime changed. Reseeded tmpMaxTime to:", newMaxTime);
    }
    // When active toggles ON, also seed tmpMaxTime from current maxTime if it wasn't just set above
    if (changes.active && changes.active.newValue === true && !changes.maxTime) {
      const { maxTime } = await chrome.storage.sync.get("maxTime");
      await chrome.storage.local.set({ tmpMaxTime: maxTime, showAction: false });
      console.log("[Timer] active toggled ON. Seeded tmpMaxTime from maxTime:", maxTime);
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
      await updateContentScript();

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
    const [currTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (isValid(currTab.url)) {
      return;
    } else {
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

async function resetTodayTimeData() {
  await chrome.storage.local.remove(["totalWebsiteTime", "globalWebsiteTime"]);
  console.log("[Cleanup] No old entries found.");
}

async function resetWeeklyData() {
  await chrome.storage.local.remove(["totalWebsiteTime", "globalWebsiteTime", "storeBlockDay", "storeGlobalDay"]);
}

async function resetAfkChecks() {
  await chrome.storage.local.remove(["pendingReturn", "returnCheckTime", "idleStart", "afkReached", "tmpAfkTime"]);
  console.log("[Cleanup] full reset.");
}

async function resetInsights() {
  await chrome.storage.local.remove(["insights"]);
}
