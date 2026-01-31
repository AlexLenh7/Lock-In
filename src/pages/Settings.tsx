import { useEffect, useState } from "react";

export default function Settings() {
  const buttonStates = [
    { id: 1, state: "Block", description: "Prevents site visit" },
    { id: 2, state: "Warn", description: "Notification but can close out" },
    { id: 3, state: "Disabled", description: "Just disabled" },
  ];

  const [action, setAction] = useState<string | null>(null);
  const [time, setTime] = useState({ hours: 0, minutes: 0 });
  const [active, setActive] = useState<boolean | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [settingTab, setSettingTab] = useState<string>("Basic");
  const [afkTimer, setAfkTimer] = useState({ minutes: 1 });
  const [afkActive, setAfkActive] = useState<boolean | null>(null);

  function convertTime(totalSec: number) {
    const hour = Math.floor(totalSec / 3600);
    const min = Math.floor((totalSec % 3600) / 60);
    return { hour, min };
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const { maxTime, action, active, afkTime, afkActive } = await chrome.storage.sync.get([
          "maxTime",
          "action",
          "active",
          "afkTime",
          "afkActive",
        ]);

        // grab button states and update ui
        setAction(action as string);
        setActive(active as boolean);
        setAfkActive(afkActive as boolean);

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
  }, []);

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

  // saves action to storage on change
  useEffect(() => {
    chrome.storage.sync.set({ action });
  }, [action]);

  // check if settings are loaded before showing ui
  if (!isLoaded) {
    return <div className="bg-(--color-primary-background)"></div>;
  }

  return (
    <div>
      <div className="text-text">
        <div className="flex flex-row items-center w-full h-fit">
          <div className="grid-cols-2 grid my-4 w-full">
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
        </div>

        <div
          style={{ "--delay": `50ms` } as React.CSSProperties}
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
        <p
          style={{ "--delay": `100ms` } as React.CSSProperties}
          className="animate-fade-up animate-stagger flex justify-center mb-4 mt-1 text-sub-text"
        >
          Maximum time allowed
        </p>
        <div
          style={{ "--delay": `50ms` } as React.CSSProperties}
          className={`animate-fade-up animate-stagger relative grid grid-cols-3 items-center w-full border-2 transition-all duration-300 ease-in-out ${action === "Disabled" ? "border-bg-light" : "border-primary"} bg-transparent overflow-hidden`}
        >
          {/* Sliding button */}
          <div
            className={`absolute h-full transition-all duration-300 ease-in-out ${action === "Disabled" ? "bg-transparent" : "bg-primary-dark"}`}
            style={{
              width: "33.33%",
              transform: `translateX(${buttonStates.findIndex((b) => b.state === action) * 100}%)`,
            }}
          />
          {buttonStates.map((b) => (
            <button
              key={b.id}
              onClick={() => updateAction(b.state)}
              className={`z-10 flex justify-center items-center p-1 hover:bg-primary-dark cursor-pointer transition-all duration-300 col-${b.id} ${
                action === "Block"
                  ? `${b.state === action ? "text-text" : "text-sub-text"}`
                  : action === "Warn"
                    ? `${b.state === action ? "text-text" : "text-sub-text"}`
                    : `${b.state === action ? "text-sub-text" : "text-sub-text"} border-bg-light hover:bg-primary-dark`
              }`}
            >
              {b.state}
            </button>
          ))}
        </div>
        <div>
          {buttonStates.map((b) => (
            <p
              style={{ "--delay": `100ms` } as React.CSSProperties}
              className={`animate-fade-up animate-stagger flex justify-center items-center mt-1 ${action === b.state ? "text-sub-text" : "hidden"}`}
            >
              {b.description}
            </p>
          ))}
        </div>
        <div
          style={{ "--delay": `50ms` } as React.CSSProperties}
          className={`animate-fade-up animate-stagger grid grid-cols-2 w-full border-2 justify-center mt-4 transition-all duration-300 ${afkActive ? "border-primary" : "border-bg-light"}`}
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
        <span
          style={{ "--delay": `100ms` } as React.CSSProperties}
          className="animate-fade-up animate-stagger flex justify-center mt-1 text-sub-text"
        >
          Total time of inactivity before AFK state
        </span>
      </div>
    </div>
  );
}
