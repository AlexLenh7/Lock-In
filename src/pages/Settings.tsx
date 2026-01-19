import { useEffect, useState } from "react";

export default function Settings() {
  const buttonStates = [
    { id: 1, state: "Block", description: "Prevents site visit" },
    { id: 2, state: "Warn", description: "Notification but can close out" },
    { id: 3, state: "Disable", description: "Just disabled" },
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
      <div className="rounded-lg text-text">
        <div className="flex flex-row items-center w-full h-fit">
          <div className="grid-cols-2 grid my-4 w-full">
            <button
              onClick={() => setSettingTab("Basic")}
              className={`text-text col-1 flex justify-center p-1 cursor-pointer transition-all duration-300 ${
                settingTab === "Basic" ? "bg-(--color-primary)" : "bg-transparent hover:bg-(--color-primary-dark)"
              }`}
            >
              Basic Blocking
            </button>
            <button
              onClick={() => setSettingTab("Preset")}
              className={`text-text col-2 flex justify-center p-1 cursor-pointer transition-all duration-300 ${
                settingTab === "Preset" ? "bg-(--color-primary)" : "bg-transparent hover:bg-(--color-primary-dark)"
              }`}
            >
              Preset Modes
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 w-full border-2 border-(--color-primary) justify-center">
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
            <label className="flex items-center">{time.hours > 1 ? "hours" : "hour"}</label>
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
            <span className="flex items-center">min</span>
          </div>
          <button
            className={`p-1 flex justify-center items-center col-3 cursor-pointer transition-all duration-300 ${
              active ? "bg-(--color-primary) text-text" : " text-secondary-text"
            }`}
            onClick={() => chrome.storage.sync.set({ active: updateActive(active as boolean) })}
          >
            {active ? "Enabled" : "Disabled"}
          </button>
        </div>
        <p className="flex justify-center mb-4 mt-1 text-secondary-text">Maximum time allowed</p>
        <div className="relative grid grid-cols-3 items-center w-full border-2 border-(--color-primary) bg-transparent overflow-hidden">
          {/* Sliding button */}
          <div
            className="absolute h-full transition-all duration-300 ease-in-out bg-(--color-primary)"
            style={{
              width: "120px",
              transform: `translateX(${buttonStates.findIndex((b) => b.state === action) * 100}%)`,
            }}
          />
          {buttonStates.map((b) => (
            <button
              key={b.id}
              onClick={() => updateAction(b.state)}
              className={`z-10 flex justify-center items-center col-${
                b.id
              } p-1 cursor-pointer transition-colors hover:text-text duration-300${
                action === b.state
                  ? " text-text shadow-md" // Active Style
                  : " text-secondary-text hover:bg-(--color-primary-dark)" // Inactive Style
              }`}
            >
              {b.state}
            </button>
          ))}
        </div>
        <div>
          {buttonStates.map((b) => (
            <p
              className={`flex justify-center items-center mt-1 ${action === b.state ? "text-secondary-text" : "hidden"}`}
            >
              {b.description}
            </p>
          ))}
        </div>
        <div className="grid grid-cols-2 w-full border-2 border-(--color-primary) justify-center mt-4">
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
            <label className="flex items-center">minutes</label>
          </div>

          <button
            className={`p-1 flex justify-center items-center col-2 cursor-pointer transition-all duration-300 ${
              afkActive ? "bg-(--color-primary) text-text" : " text-secondary-text"
            }`}
            onClick={() => chrome.storage.sync.set({ afkActive: updateAfkActive(afkActive as boolean) })}
          >
            {afkActive ? "Enabled" : "Disabled"}
          </button>
        </div>
        <span className="flex justify-center mb-4 mt-1 text-secondary-text">
          Total time of inactivity before AFK state
        </span>
      </div>
    </div>
  );
}
