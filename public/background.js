// when alarm goes off respond to it
chrome.alarms.onAlarm.addListener(async (alarm) => {
  // action for when alarm goes off
  console.log("[Alarm] 30 seconds passed...");
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currTab = tabs[0];
  if (!currTab) return;
  const { currentSite, startTime } = await chrome.storage.local.get(["currentSite", "startTime"]);
  // make a check to see if tab has changed AND if blocked
  if (currTab.id === currentSite && (await checkBlock(currTab.id))) {
    // if current is different than stored then subtract the time
    await handleTotalTime(Date.now(), startTime);
    await chrome.storage.local.set({ startTime: Date.now() });
  }
});

// create the alarm fires every minute
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("alarm", {
    periodInMinutes: 0.5,
  });
});

async function handleTab(tabId, timeClicked) {
  // grab all instances of data from storage when called
  const data = await chrome.storage.sync.get({
    globalSwitch: true,
    website: [],
    maxTime: 1800,
    active: false,
    action: "Block",
  });
  const { globalSwitch, website, maxTime, active, action } = data;

  if (!globalSwitch) return; // early check if global switch is on or off

  if (!active) {
    // check if timer is activated if not then skip to content script
    // inject the content script based off action
    return;
  }

  try {
    if (maxTime > 0) {
      // store the initial time clicked and current website
      chrome.storage.local.set({ startTime: timeClicked, currentSite: tabId });
    }
  } catch (error) {
    console.log(error);
  }
}

// helper function to calculate total time
async function handleTotalTime(currStartTime, storedStartTime) {
  const { maxTime } = await chrome.storage.sync.get({ maxTime: 1800 }); // grab the most updated time
  const timeSeconds = (currStartTime - storedStartTime) / 1000;
  let updateTime = Math.round(maxTime - timeSeconds); // grab the time in seconds spent

  console.log(`[Timer] Subtraction: ${timeSeconds.toFixed(2)}s. Remaining: ${updateTime.toFixed(2)}s`);

  // check if update time is negative and redirect to content script
  if (updateTime <= 0) {
    updateTime = 0;
    console.log("[Action] Time limit reached. Redirecting...");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await redirect(tab.id);
    }
  }
  await chrome.storage.sync.set({ maxTime: updateTime });
}

// helper function redirect based off block state
async function redirect(tabId) {
  const data = await chrome.storage.sync.get(["action", "active", "globalSwitch"]);

  // prevent redirect
  if (data.action === undefined || data.active === undefined) {
    console.log("[Guard] Storage not ready, skipping enforcement.");
    return;
  }

  const action = data.action;

  // if action is block then redirect
  if (action === "Block") {
    console.log("Setting is Block, Redirect Blocking site");
    return chrome.tabs.update(tabId, { url: "https://www.google.com" });
  }

  // if timer is disabled but action isn't then do action
  if (action === "Disable") {
    console.log("Setting is Disable, do nothing");
    return;
  }

  if (action === "Warn") {
    console.log("Setting is Warn, give warn notification");
    return;
  }
}

// helper function checks if website is blocked
async function checkBlock(tabId) {
  const currTab = await chrome.tabs.get(tabId);
  const { website } = await chrome.storage.sync.get({ website: [] });
  if (currTab.url) {
    try {
      const tabDomain = new URL(currTab.url); // grabs the url of the tab
      const cleanUrl = tabDomain.hostname.replace(/^www\./, ""); // clean up the url
      return website.some((site) => site.text === cleanUrl); // returns t/f if website is blocked
    } catch (error) {
      console.log(error);
      return false;
    }
  }
  return false;
}

async function syncSession(tabId, reason) {
  console.log(`[Event] Triggered by: ${reason}`);
  const timeClicked = Date.now(); // grabs the time instance when user changes tabs
  const { globalSwitch, active, currentSite, startTime } = await chrome.storage.sync.get([
    "globalSwitch",
    "active",
    "currentSite",
    "startTime",
  ]);
  const { maxTime } = await chrome.storage.sync.get({ maxTime: 1800 });

  if (globalSwitch === undefined) return;

  if (active === undefined) return;

  // If the extension is OFF, stop everything immediately.
  if (globalSwitch === false) {
    console.log("[Guard] Extension is Disabled. Allowing all traffic.");
    return;
  }

  console.log(maxTime);
  console.log(active);

  // check if currentsite and startTime exists and timer is enabled
  if (currentSite && startTime) {
    console.log(`[State] Closing session for tab: ${currentSite}`);
    // make a check to see if tab has changed and update the time
    // if current is different than stored then subtract the time
    await handleTotalTime(timeClicked, startTime);
    await chrome.storage.local.remove(["currentSite", "startTime"]);
  }

  // check if new site is blocked if not then store it
  // should not store non blocked sites
  if (await checkBlock(tabId)) {
    if (active && maxTime > 0) {
      console.log(`[State] Opening new session for blocked tab: ${tabId}`);
      handleTab(tabId, timeClicked);
    } else {
      console.log(`timer is disabled redirecting...`);
      redirect(tabId);
    }
  }
}

// use chrome.tabs.onActivated to listen for tab switches
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await syncSession(activeInfo.tabId, "Tab Switch");
});

// Checks if user doesn't switch tabs but updates current tab
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const { currentSite } = await chrome.storage.local.get(["currentSite"]);

  if (changeInfo.status === "complete" && tabId !== currentSite) {
    await syncSession(tabId, "URL Update");
  }
});

// updates storage when settings change
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace !== "sync") return;
  console.log("[Settings] Change detected:", Object.keys(changes));

  // handles timer and global switches to stop the clock immediately
  const globalOff = changes.globalSwitch?.newValue === false;
  const timerOff = changes.active?.newValue === false;

  console.log("global", globalOff);
  console.log("timer", timerOff);

  if (globalOff || timerOff) {
    console.log("[Cleanup] User disabled extension/timer. Stopping session.");
    const { startTime } = await chrome.storage.local.get("startTime");
    if (startTime) {
      await handleTotalTime(Date.now(), startTime);
      await chrome.storage.local.remove(["currentSite", "startTime"]);
    }
  }

  // evaluate the current tab based on new settings regardless
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.id) {
    // We pass the latest changes directly to syncSession if possible,
    await syncSession(tab.id, "Settings Toggle");
  }
});

// updates timer when user closes tab
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const { currentSite, startTime } = await chrome.storage.local.get(["currentSite", "startTime"]);

  // If the tab closed was the one we were tracking, save the time
  if (tabId === currentSite && startTime) {
    await handleTotalTime(Date.now(), startTime);
    await chrome.storage.local.remove(["currentSite", "startTime"]);
  }
});
