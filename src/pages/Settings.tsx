import { useEffect, useState } from "react";

export default function Settings() {
  const buttonStates = [
    { id: 1, state: "Block", description: "Prevents site visit", color: "#b91717" },
    { id: 2, state: "Warn", description: "Notification but can close out", color: "#f49f38" },
    { id: 3, state: "Disable", description: "Just disabled", color: "#818181" },
  ];

  const [action, setAction] = useState<string | null>(null);
  const [time, setTime] = useState({ hours: 0, minutes: 0 });
  const [active, setActive] = useState<boolean | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await chrome.storage.sync.get({ maxTime: 30, action: "Block", active: false });

        // grab button states and update ui
        setAction(data.action as string);
        setActive(data.active as boolean);

        // grab and convert time from seconds to hours and minutes for display
        const totalSec = data.maxTime as number;
        const hour = Math.floor(totalSec / 3600);
        const min = Math.floor((totalSec % 3600) / 60);
        setTime({ hours: hour, minutes: min });
        setIsLoaded(true);
      } catch (error) {
        console.log(error);
      }
    };
    loadData();
  }, []);

  // save the time in seconds to storage
  const saveTime = (h: number, m: number) => {
    const newTime = { hours: h, minutes: m };
    const newTimeSec: number = newTime.hours * 3600 + newTime.minutes * 60;
    setTime(newTime);
    chrome.storage.sync.set({ maxTime: newTimeSec });
  };

  // helper function to save active state on change
  const updateActive = () => {
    const newActive = !active;
    setActive(newActive);
    chrome.storage.sync.set({ active: newActive });
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
    return (
      <div className="bg-background">
        <div className="text-text">Loading Settings...</div>
      </div>
    );
  }

  return (
    // TODO: Add a mode selector
    <div>
      <div className="rounded-lg text-text bg-secondary-background">
        <div>
          <h1 className="text-text my-2">Default Block Settings</h1>
          <div className="grid grid-cols-3 w-full border-2 justify-center">
            {/* Hours Column */}
            <div className="grid grid-cols-2 col-1 w-full">
              <input
                className="text-center flex justify-center w-full focus:bg-transparent focus:outline-none focus:ring-0 focus:shadow-none"
                type="number"
                placeholder="0"
                value={time.hours || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  // If the user clears the field, treat it as 0
                  const finalVal = isNaN(val) ? 0 : val;

                  if (finalVal > 24) {
                    saveTime(0, time.minutes); // Reset to 0 (and show placeholder) if invalid
                  } else {
                    saveTime(finalVal, time.minutes);
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
                    saveTime(time.hours, 0); // Reset to 0 (and show placeholder) if invalid
                  } else {
                    saveTime(time.hours, finalVal);
                  }
                }}
                onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
              />
              <span className="flex items-center">min</span>
            </div>
            <button
              className={`p-1 flex justify-center items-center col-3 cursor-pointer transition-all duration-300 ${
                active ? "bg-primary text-text" : "text-gray-500"
              }`}
              onClick={() => updateActive()}
            >
              {active ? "Enabled" : "Disabled"}
            </button>
          </div>
        </div>
        <p className="flex justify-center mb-4 mt-1 text-secondary-text">Maximum time allowed</p>
        <div className="relative grid grid-cols-3 items-center w-full border-2 border-(--secondary-text) bg-transparent overflow-hidden">
          {/* Sliding button */}
          <div
            className="absolute h-full transition-all duration-300 ease-in-out"
            style={{
              width: "103.34px",
              transform: `translateX(${buttonStates.findIndex((b) => b.state === action) * 100}%)`,
              backgroundColor: buttonStates.find((b) => b.state === action)?.color || "#818181",
            }}
          />
          {buttonStates.map((b) => (
            <button
              key={b.id}
              onClick={() => updateAction(b.state)}
              className={`z-10 flex justify-center items-center col-${
                b.id
              } p-1 cursor-pointer transition-colors duration-300${
                action === b.state
                  ? " text-text shadow-md" // Active Style
                  : "border-gray-500 text-gray-500 hover:border-text" // Inactive Style
              }`}
            >
              {b.state}
            </button>
          ))}
        </div>
        {buttonStates.map((b) => (
          <p
            className={`flex justify-center items-center mt-1 ${action === b.state ? "text-secondary-text" : "hidden"}`}
          >
            {b.description}
          </p>
        ))}
      </div>
    </div>
  );
}
