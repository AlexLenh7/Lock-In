import { useEffect, useState } from "react";
import { PieChart } from "react-minimal-pie-chart";

// storage types
interface WebsiteData {
  [domain: string]: number;
}

interface DailyHistory {
  [dayName: string]: WebsiteData | null;
}

interface StorageData {
  globalWebsiteTime?: WebsiteData;
  totalWebsiteTime?: WebsiteData;
  storeBlockDay?: DailyHistory;
  storeGlobalDay?: DailyHistory;
  currentDay?: number;
}

interface SiteStat {
  domain: string;
  seconds: number;
  color: string;
}

export default function Dashboard() {
  const [websiteTimes, setWebsiteTimes] = useState<SiteStat[]>([]);
  const [globalTimes, setGlobalTimes] = useState<SiteStat[]>([]);
  const [active, setActive] = useState<string>("global");

  const Days = [
    { id: 1, short: "Sun", name: "Sunday" },
    { id: 2, short: "Mon", name: "Monday" },
    { id: 3, short: "Tue", name: "Tuesday" },
    { id: 4, short: "Wed", name: "Wednesday" },
    { id: 5, short: "Thu", name: "Thursday" },
    { id: 6, short: "Fri", name: "Friday" },
    { id: 7, short: "Sat", name: "Saturday" },
  ];

  const [currDay, setDay] = useState<string>(Days[new Date().getDay()].name);

  const generateColor = (seconds: number, totalSeconds: number) => {
    const ratio = totalSeconds > 0 ? seconds / totalSeconds : 0;
    const scaledRatio = Math.sqrt(ratio);
    const saturation = scaledRatio * 100;
    return `hsl(var(--theme-hue), ${Math.round(saturation)}%, 50%)`;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = (await chrome.storage.local.get([
          "globalWebsiteTime",
          "totalWebsiteTime",
          "storeBlockDay",
          "storeGlobalDay",
          "currentDay",
        ])) as StorageData;

        // Determine "Today" from storage (fallback to system time)
        const todayIndex = data.currentDay ?? new Date().getDay();
        const todayName = Days[todayIndex].name;

        // Decide which data source to use
        let blockData: WebsiteData = {};
        let globalData: WebsiteData = {};

        // Only use live data if the selected day matches Today's name.
        if (currDay === todayName) {
          blockData = data.totalWebsiteTime || {};
          globalData = data.globalWebsiteTime || {};
        } else {
          // Otherwise, pull from history using the day name as the key
          const blockHistory = data.storeBlockDay || {};
          const globalHistory = data.storeGlobalDay || {};

          blockData = blockHistory[currDay] || {};
          globalData = globalHistory[currDay] || {};
        }

        const convertStats = (data: WebsiteData) => {
          const entries = Object.entries(data)
            .filter(([, seconds]) => seconds >= 60)
            .sort((a, b) => b[1] - a[1]);

          const totalSeconds = entries.length > 0 ? Math.max(...entries.map(([, s]) => s)) : 1;

          return entries.map(([domain, seconds]) => ({
            domain,
            seconds,
            color: generateColor(seconds, totalSeconds),
          }));
        };

        setGlobalTimes(convertStats(globalData));
        setWebsiteTimes(convertStats(blockData));
      } catch (error) {
        console.log(error);
      }
    };

    loadData();
  }, [currDay]); // Re-run whenever the user clicks a different day

  const chartData = websiteTimes.map((site) => ({
    title: site.domain,
    value: site.seconds,
    color: site.color,
  }));

  const chartGlobalData = globalTimes.map((site) => ({
    title: site.domain,
    value: site.seconds,
    color: site.color,
  }));

  const sumWebsiteTime = () => {
    return formatTotalTime(websiteTimes.reduce((accumulator, site) => accumulator + site.seconds, 0));
  };
  const sumGlobalTime = () => {
    return formatTotalTime(globalTimes.reduce((accumulator, site) => accumulator + site.seconds, 0));
  };

  function formatTotalTime(totalSeconds: number) {
    if (totalSeconds <= 0 || isNaN(totalSeconds)) return "0s";

    const days = Math.floor(totalSeconds / (24 * 3600));
    const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.round(totalSeconds % 60);

    const parts = [];

    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    if (days === 0 && hours === 0 && minutes === 0) {
      parts.push(`${seconds}s`);
    }
    return parts.join(" ");
  }

  return (
    <div className="w-full h-full flex justify-start mt-4 flex-col">
      <div className="flex w-full h-fit flex-col">
        {/* Toggle Buttons */}
        <div className="flex w-full h-fit flex-row">
          <div className="grid grid-cols-2 w-full">
            <button
              onClick={() => setActive("global")}
              className={`text-text col-1 p-1 flex justify-center cursor-pointer transition-all duration-300 ${
                active === "global" ? "bg-(--color-primary)" : "bg-transparent hover:bg-(--color-primary-dark)"
              }`}
            >
              All Websites
            </button>
            <button
              onClick={() => setActive("block")}
              className={`text-text col-2 p-1 flex justify-center cursor-pointer transition-all duration-300 ${
                active === "block" ? "bg-(--color-primary)" : "bg-transparent hover:bg-(--color-primary-dark)"
              }`}
            >
              Blocked Websites
            </button>
          </div>
        </div>

        {/* Day Picker */}
        <ul className="relative w-full h-full flex-row grid grid-cols-7 mt-4 overflow-hidden border-2 border-transparent p-0 list-none">
          <div
            className="absolute h-full transition-all duration-300 ease-in-out bg-(--color-primary)"
            style={{
              width: "14.28%",
              transform: `translateX(${Days.findIndex((d) => d.name === currDay) * 100}%)`,
            }}
          />
          {Days.map((day) => (
            <li key={day.id} className="flex w-full items-center justify-center z-10">
              <button
                onClick={() => setDay(day.name)}
                className={`text-text w-full flex justify-center items-center cursor-pointer p-1 hover:text-text transition-all duration-300 ${
                  currDay === day.name ? "text-text" : "text-secondary-text hover:bg-(--color-primary-dark)"
                }`}
              >
                {day.short}
              </button>
            </li>
          ))}
        </ul>

        {/* Chart & List Area */}
        <div className="grid grid-cols-2 w-full h-full mt-4">
          <div className={`flex flex-col row-1 self-start ${active === "block" ? "col-1 pr-4" : "col-2 pl-4"}`}>
            <div className="relative flex flex-col self-start">
              <div className="absolute inset-0 row flex items-center justify-center mb-6 pointer-events-none">
                <span className="relative group text-text text-[0.625rem] cursor-help whitespace-nowrap pointer-events-auto">
                  Total Time
                  <div className="z-10 absolute left-1/2 -translate-x-1/2 top-full mt-1 p-1 text-xs w-35 text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-pre-line pointer-events-none">
                    Sites with 1 minute or less will not displayed but are still counted
                  </div>
                </span>
              </div>
              <div className="absolute pointer-events-none inset-0 flex items-center mt-2 justify-center text-text text-lg transition-all duration-300">
                {active === "block" ? sumWebsiteTime() : sumGlobalTime()}
              </div>
              <PieChart
                data={active === "block" ? chartData : chartGlobalData}
                lineWidth={25}
                paddingAngle={1}
                lengthAngle={-360}
              />
            </div>
          </div>

          <ul
            className={`text-text flex-col row-span-full h-fit max-h-40 scroll-smooth overflow-y-auto ${
              active === "block" ? "col-2 row-1 bg-transparent" : "col-1 row-1 bg-transparent"
            }`}
          >
            {(active === "block" ? websiteTimes : globalTimes).map((site) => (
              <li
                key={site.domain}
                className="flex group justify-between gap-1 items-center whitespace-nowrap hover:bg-(--color-primary-dark) text-xs leading-5 p-1"
              >
                <span
                  className="w-2 h-2 mr-1 shrink-0 flex items-center transition-all duration-300"
                  style={{ backgroundColor: site.color }}
                ></span>
                <span className="text-secondary-text group-hover:text-text truncate">{site.domain}</span>
                <span className="text-text">{formatTotalTime(site.seconds)}</span>
              </li>
            ))}
            {(active === "block" ? websiteTimes : globalTimes).length === 0 && (
              <li className="text-text p-1 text-xs w-full justify-center flex items-center">
                No data collected for {currDay} during this week.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
