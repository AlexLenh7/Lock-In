import { useEffect, useState } from "react";
import { checkBlock } from "../utils/Helpers";
import { isValidSyntax } from "../utils/Helpers";
import { MdOutlineTimelapse } from "react-icons/md";
import { TiWarningOutline } from "react-icons/ti";
import { RiRestTimeLine } from "react-icons/ri";
import { IoMdPause } from "react-icons/io";
import { IoMdPlay } from "react-icons/io";
import { PiArrowsCounterClockwiseBold } from "react-icons/pi";

export default function Settings() {
  const buttonStates = [
    { id: 1, state: "Redirect", description: "Redirects to a chosen site" },
    { id: 2, state: "Block", description: "Blocks content viewing" },
    { id: 3, state: "Warn", description: "Unobstructive warning when your time is up" },
    { id: 4, state: "Disabled", description: "Website action is disabled" },
  ];

  const [action, setAction] = useState<string | null>(null);
  const [time, setTime] = useState({ hours: 0, minutes: 0 });
  const [active, setActive] = useState<boolean | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  //const [settingTab, setSettingTab] = useState<string>("Basic");
  const [afkTimer, setAfkTimer] = useState({ minutes: 1 });
  const [afkActive, setAfkActive] = useState<boolean | null>(null);
  const [redirect, setRedirect] = useState<string>("");
  const [isAlert, setAlert] = useState<string>("");
  const [savedRedirect, setSavedRedirect] = useState<string>("");
  const [nuke, setNuke] = useState(false);
  const [showTimer, setShowTimer] = useState<number>(0);
  const [timerPause, setTimerPause] = useState(false);

  function convertTime(totalSec: number) {
    const hour = Math.floor(totalSec / 3600);
    const min = Math.floor((totalSec % 3600) / 60);
    return { hour, min };
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const [syncData, localData] = await Promise.all([
          chrome.storage.sync.get([
            "maxTime",
            "action",
            "active",
            "afkTime",
            "afkActive",
            "redirect",
            "nuke",
            "timerPause",
          ]),
          chrome.storage.local.get(["tmpMaxTime"]),
        ]);

        const { maxTime, action, active, afkTime, afkActive, redirect, nuke, timerPause } = syncData;
        const { tmpMaxTime } = localData;

        // grab button states and update ui
        setAction((action as string) || "Disabled");
        setActive((active as boolean) || false);
        setAfkActive((afkActive as boolean) || false);
        setRedirect((redirect as string) || "");
        setSavedRedirect((redirect as string) || "");
        setNuke((nuke as boolean) || false);
        setShowTimer((tmpMaxTime as number) || 0);
        setTimerPause((timerPause as boolean) || false);

        const { min: afkMin } = convertTime(afkTime as number);
        setAfkTimer({ minutes: afkMin });

        const { hour: timerHour, min: timerMin } = convertTime(maxTime as number);
        setTime({ hours: timerHour, minutes: timerMin });
        setIsLoaded(true);
      } catch (error) {
        console.log(error);
      }
    };
    loadData();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleStorageChange = (changes: any, namespace: string) => {
      if (namespace === "local" && changes.tmpMaxTime) {
        const newValue = changes.tmpMaxTime.newValue;
        if (newValue !== undefined) {
          setShowTimer(newValue);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const handleReset = () => {
    // Grab the time from maxTime
    const totalSeconds = time.hours * 3600 + time.minutes * 60;
    setShowTimer(totalSeconds);
    chrome.storage.local.set({ tmpMaxTime: totalSeconds, showAction: false });
  };

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h.toString()} hour : ${m.toString()} min`;
  };

  // Helper func visual time update
  const saveTime = (h: number, m: number) => {
    const newTime = { hours: h, minutes: m };
    const newTimeSec: number = newTime.hours * 3600 + newTime.minutes * 60;
    setTime(newTime);
    return newTimeSec;
  };

  const saveAfkTime = (m: number) => {
    const newTime = { minutes: m };
    const newTimeSec: number = newTime.minutes * 60;
    setAfkTimer(newTime);
    return newTimeSec;
  };

  // helper function to save active state on change
  const updateActive = (onOff: boolean) => {
    const newActive = !onOff;
    setActive(newActive);
    return newActive;
  };

  const updateAfkActive = (onOff: boolean) => {
    const newActive = !onOff;
    setAfkActive(newActive);
    return newActive;
  };

  // helper function to save action to storage on change
  const updateAction = (newAction: string) => {
    setAction(newAction);
    chrome.storage.sync.set({ action: newAction });
  };

  // helper function to update and save nuke setting
  const updateNuke = (shouldNuke: boolean) => {
    const newVal = !shouldNuke;
    setNuke(newVal);
    return newVal;
  };

  // helper function to update timer pause setting
  const updateTimerPause = (currentPause: boolean) => {
    const newVal = !currentPause;
    setTimerPause(newVal);
    return newVal;
  };

  // handles saving redirect site
  const handleKeyDown = async () => {
    const valid = await isValidSyntax(redirect);
    if (!valid) {
      setAlert("Please enter a valid domain!");
    } else {
      const urlToCheck = redirect.includes("://") ? redirect : "https://" + redirect;
      const blocked = await checkBlock(urlToCheck);
      if (blocked) {
        setAlert("Can't redirect to a blocked site!");
      } else {
        setSavedRedirect(redirect);
        chrome.storage.sync.set({ redirect });
        setAlert("Redirect saved!");
      }
    }
  };

  const handleBlur = async () => {
    const valid = await isValidSyntax(redirect);
    if (!valid) {
      setAlert("Please enter a valid domain!");
      setRedirect(savedRedirect);
    } else {
      const urlToCheck = redirect.includes("://") ? redirect : "https://" + redirect;
      const blocked = await checkBlock(urlToCheck);
      if (blocked) {
        setAlert("Can't redirect to a blocked site!");
        setRedirect(savedRedirect);
      } else {
        if (savedRedirect === redirect) {
          setAlert("");
        } else {
          setSavedRedirect(redirect);
          chrome.storage.sync.set({ redirect });
          setAlert("Redirect saved!");
        }
      }
    }
  };

  useEffect(() => {
    if (isAlert) {
      const timer = setTimeout(() => {
        setAlert("");
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isAlert]);

  // check if settings are loaded before showing ui
  if (!isLoaded) {
    return <div className="bg-bg"></div>;
  }

  return (
    <div className="w-full h-full flex justify-start flex-col">
      <div className="text-text">
        {/* <div className="flex flex-row items-center w-full h-fit">
          <div className="grid-cols-2 grid w-full">
            <button
              onClick={() => setSettingTab("Basic")}
              className={`col-1 flex justify-center p-1 cursor-pointer transition-all duration-300 border-2 ${
                settingTab === "Basic"
                  ? "border-primary text-text"
                  : "bg-transparent hover:bg-primary-dark text-sub-text border-transparent"
              }`}
            >
              Basic Blocking
            </button>
            <button
              onClick={() => setSettingTab("Preset")}
              className={`col-2 flex justify-center p-1 cursor-pointer transition-all duration-300 border-2 ${
                settingTab === "Preset"
                  ? "border-primary text-text"
                  : "bg-transparent hover:bg-primary-dark text-sub-text border-transparent"
              }`}
            >
              Preset Modes
            </button>
          </div>
        </div> */}
        {/* <div className="w-full flex-col flex justify-center mb-3">
          <div
            style={{ "--delay": `50ms` } as React.CSSProperties}
            className="animate-fade-up animate-stagger text-sub-text text-xs flex justify-center"
          >
            Configure your websites to stay locked in
          </div>
        </div> */}
        {/* Daily Maximum Time Setting */}
        <div style={{ "--delay": `50ms` } as React.CSSProperties} className="animate-fade-up animate-stagger">
          <div className="text-text flex justify-center items-center uppercase tracking-wide leading-0 mb-0.5">
            <MdOutlineTimelapse className="size-4 mr-1" />
            Time Limit
          </div>
          <p className="flex justify-center mb-1 text-sub-text leading-tight">Maximum time allowed (Resets daily)</p>
        </div>
        <div
          style={{ "--delay": `100ms` } as React.CSSProperties}
          className={`animate-fade-up animate-stagger grid grid-cols-3 w-full border-2 border-bg-light justify-center transition-all duration-300 ${active ? "border-primary" : "border-bg-light"}`}
        >
          {/* Hours Column */}
          <div className="grid grid-cols-2 col-1 w-full">
            <input
              className="text-center flex justify-center w-full focus:bg-transparent focus:outline-none focus:ring-0 focus:shadow-none"
              type="number"
              placeholder="0"
              value={time.hours || ""}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                const finalVal = isNaN(val) ? 0 : val;

                if (finalVal > 24) {
                  chrome.storage.sync.set({ maxTime: saveTime(0, time.minutes) });
                } else if (finalVal === 24) {
                  chrome.storage.sync.set({ maxTime: saveTime(finalVal, 0) });
                } else {
                  chrome.storage.sync.set({ maxTime: saveTime(finalVal, time.minutes) });
                }
              }}
              onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
            />
            <label className="flex items-center text-sub-text">{time.hours > 1 ? "hours" : "hour"}</label>
          </div>
          {/* Minutes Column */}
          <div className="grid grid-cols-2 col-2 w-full">
            <input
              className="text-center flex justify-center w-full focus:bg-transparent focus:outline-none focus:ring-0 focus:shadow-none"
              type="number"
              placeholder="0"
              value={time.minutes || ""}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                const finalVal = isNaN(val) ? 0 : val;

                if (finalVal >= 60) {
                  chrome.storage.sync.set({ maxTime: saveTime(time.hours, 0) });
                } else {
                  chrome.storage.sync.set({ maxTime: saveTime(time.hours, finalVal) });
                }
              }}
              onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
            />
            <span className="flex items-center text-sub-text">min</span>
          </div>
          <button
            className={`p-1 flex justify-center items-center col-3 cursor-pointer transition-all duration-300 ${
              active ? "text-text bg-primary-dark" : "text-sub-text hover:bg-primary-dark"
            }`}
            onClick={() => chrome.storage.sync.set({ active: updateActive(active as boolean) })}
          >
            {active ? "Enabled" : "Disabled"}
          </button>
        </div>
        {/* View timer */}
        {active && (
          <div style={{ "--delay": `100ms` } as React.CSSProperties} className="animate-stagger animate-fade-up">
            <div className="grid grid-cols-3 items-center p-2 bg-bg-dark mt-3 border-2 border-bg-light">
              <div className="col-span-1 text-text leading-tight flex justify-center">Current Session</div>
              <div className="col-span-1 flex justify-center items-center text-text font-bold tracking-wide">
                {formatTimer(showTimer)}
              </div>
              <div className="col-span-1 grid grid-cols-2 gap-1 h-full">
                <button
                  onClick={() => chrome.storage.sync.set({ timerPause: updateTimerPause(timerPause as boolean) })}
                  className={`relative group flex justify-center items-center cursor-pointer transition-all duration-300 border-2 ${
                    timerPause
                      ? "border-primary bg-primary-dark text-text"
                      : "border-bg-light text-sub-text hover:bg-primary-dark hover:text-text"
                  }`}
                >
                  {timerPause ? <IoMdPlay /> : <IoMdPause />}
                  <div className="absolute left-1/2 -translate-x-1/2 leading-tight top-full mt-1 p-1 text-xs w-fit text-text bg-bg-light rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-pre-line pointer-events-none">
                    {timerPause ? "Resume" : "Pause"}
                  </div>
                </button>
                <button
                  onClick={handleReset}
                  className="relative group p-1 flex justify-center items-center cursor-pointer transition-all duration-300 border-2 border-bg-light text-sub-text hover:bg-primary-dark hover:text-text"
                >
                  <PiArrowsCounterClockwiseBold />
                  <div className="absolute left-1/2 -translate-x-1/2 leading-tight top-full mt-1 p-1 text-xs w-fit text-text bg-bg-light rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-pre-line pointer-events-none">
                    Reset
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Website Action Settings */}
        <div style={{ "--delay": `50ms` } as React.CSSProperties} className="animate-fade-up animate-stagger">
          <span className="flex text-text justify-center items-center mt-3 uppercase tracking-wide leading-0 mb-0.5">
            <TiWarningOutline className="size-4 mr-1" />
            Website Actions
          </span>
          {buttonStates.map((b) => (
            <p
              className={`flex justify-center items-center mb-1 leading-tight ${action === b.state ? "text-sub-text" : "hidden"}`}
            >
              {b.description}
            </p>
          ))}
        </div>
        <div
          style={{ "--delay": `50ms` } as React.CSSProperties}
          className={`animate-fade-up animate-stagger relative grid grid-cols-4 items-center w-full border-2 transition-all duration-300 ease-in-out ${action === "Disabled" ? "border-bg-light" : "border-primary"} bg-transparent overflow-hidden`}
        >
          {/* Sliding button */}
          <div
            className={`absolute h-full transition-all duration-300 ease-in-out ${action === "Disabled" ? "bg-transparent" : "bg-primary-dark"}`}
            style={{
              width: "25%",
              transform: `translateX(${buttonStates.findIndex((b) => b.state === action) * 100}%)`,
            }}
          />
          {buttonStates.map((b) => (
            <button
              key={b.id}
              onClick={() => updateAction(b.state)}
              className={`z-10 flex justify-center items-center p-1 hover:bg-primary-dark cursor-pointer transition-all duration-300 col-${b.id} ${b.state === action && action !== "Disabled" ? "text-text" : "text-sub-text"} ${action !== "Block" && action !== "Warn" && action !== "Redirect" ? "border-bg-light" : ""}`}
            >
              {b.state}
            </button>
          ))}
        </div>
        {/* Redirect setting */}
        {action === "Redirect" && (
          <div style={{ "--delay": `100ms` } as React.CSSProperties} className="animate-stagger animate-fade-up">
            <div className="bg-bg-dark mt-3 p-2 border-2 border-bg-light">
              <input
                className={`text-center focus:border-primary focus:bg-primary-dark focus:hover:bg-primary-dark text-text w-full flex border-2 p-1 transition-all duration-300 hover:bg-primary-dark outline-none ${redirect.length > 0 ? `border-primary` : `border-bg-light`} truncate`}
                type="text"
                value={redirect}
                placeholder="Enter a site to be redirected"
                onChange={(e) => setRedirect(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleKeyDown()}
                onBlur={handleBlur}
              />
            </div>
          </div>
        )}
        {/* Block options */}
        {action === "Block" && (
          <div style={{ "--delay": `100ms` } as React.CSSProperties} className="animate-stagger animate-fade-up">
            <div className="col-2 grid grid-cols-2 p-2 bg-bg-dark mt-3 border-2 border-bg-light">
              <div className="col-1 w-full flex flex-col">
                <span className="flex items-center justify-start text-text leading-tight">Instant Purge</span>
                <span className="text-sub-text text-[10px] leading-tight">Tabs will be instantly deleted</span>
              </div>
              <div className="col-2 grid grid-cols-2">
                <button
                  onClick={() => chrome.storage.sync.set({ nuke: updateNuke(nuke as boolean) })}
                  className={`relative col-span-2 w-full flex items-center border-2 ${nuke ? "border-primary" : "border-primary"} cursor-pointer overflow-hidden transition-all duration-300`}
                >
                  <div
                    className={`absolute top-0 left-0 h-full w-1/2 transition-transform duration-300 ease-in-out ${
                      nuke ? "translate-x-0 bg-primary-dark" : "translate-x-full bg-primary-dark"
                    }`}
                  />
                  <div
                    className={`z-10 p-1 flex-1 flex items-center justify-center transition-colors duration-300 ${
                      nuke ? "text-text hover:bg-primary-dark" : "text-sub-text hover:bg-primary-dark"
                    }`}
                  >
                    Enabled
                  </div>
                  <div
                    className={`z-10 p-1 flex-1 flex items-center justify-center transition-colors duration-300 ${
                      !nuke ? "text-text hover:bg-primary-dark" : "text-sub-text hover:bg-primary-dark"
                    }`}
                  >
                    Disabled
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
        <div style={{ "--delay": `50ms` } as React.CSSProperties} className="animate-fade-up animate-stagger">
          <span className="text-text flex justify-center items-center uppercase tracking-wide mt-3 leading-0 mb-0.5">
            <RiRestTimeLine className="size-4 mr-1" />
            AFK Detection
          </span>
          <span className=" flex justify-center text-sub-text leading-tight mb-1">
            Total time of inactivity before tracking stops
          </span>
        </div>
        <div
          style={{ "--delay": `100ms` } as React.CSSProperties}
          className={`animate-fade-up animate-stagger grid grid-cols-2 w-full border-2 justify-center transition-all duration-300 ${afkActive ? "border-primary" : "border-bg-light"}`}
        >
          {/* AFK Minutes Input */}
          <div className="grid grid-cols-2 col-1 w-full">
            <input
              className="text-center flex justify-center w-full focus:bg-transparent focus:outline-none focus:ring-0 focus:shadow-none"
              type="number"
              placeholder="1"
              value={afkTimer.minutes || ""}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                const finalVal = isNaN(val) ? 0 : val;
                if (finalVal >= 60) {
                  chrome.storage.sync.set({ afkTime: saveAfkTime(1) });
                } else {
                  chrome.storage.sync.set({ afkTime: saveAfkTime(finalVal) });
                }
              }}
              onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
            />
            <label className="flex items-center text-sub-text">minutes</label>
          </div>

          <button
            className={`p-1 flex justify-center items-center col-2 cursor-pointer transition-all duration-300 ${
              afkActive ? "text-text bg-primary-dark" : " text-sub-text hover:bg-primary-dark"
            }`}
            onClick={() => chrome.storage.sync.set({ afkActive: updateAfkActive(afkActive as boolean) })}
          >
            {afkActive ? "Enabled" : "Disabled"}
          </button>
        </div>
      </div>
      {isAlert && (
        <div
          className={`${isAlert.includes("saved") ? "animate-fade" : "animate-shake-fade"} bg-primary text-text w-[95%] border-2 border-secondary shadow-lg shadow-secondary/50 p-1 flex justify-center absolute bottom-4 left-1/2 -translate-x-1/2 rounded`}
        >
          {isAlert}
        </div>
      )}
    </div>
  );
}
