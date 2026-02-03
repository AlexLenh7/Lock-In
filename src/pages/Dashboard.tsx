import { useEffect, useState } from "react";
import { PieChart } from "react-minimal-pie-chart";
import Insights from "./Insights";
import { formatTotalTime } from "../utils/Helpers";
import { PiMagnifyingGlassBold } from "react-icons/pi";
import { IoArrowBack } from "react-icons/io5";
import { type InsightsData } from "./Insights";
import { BsFire } from "react-icons/bs";
import { TbFocus2 } from "react-icons/tb";

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
  const [showInsights, setShowInsights] = useState<boolean>(false);
  const [scoreStreak, setScoreStreak] = useState<InsightsData | null>(null);

  const Days = [
    { id: 1, short: "Sun", name: "Sunday" },
    { id: 2, short: "Mon", name: "Monday" },
    { id: 3, short: "Tue", name: "Tuesday" },
    { id: 4, short: "Wed", name: "Wednesday" },
    { id: 5, short: "Thu", name: "Thursday" },
    { id: 6, short: "Fri", name: "Friday" },
    { id: 7, short: "Sat", name: "Saturday" },
  ];

  const today = Days[new Date().getDay()].name;

  const [currDay, setDay] = useState<string>(Days[new Date().getDay()].name);

  const generateColor = (seconds: number, totalSeconds: number) => {
    const ratio = totalSeconds > 0 ? seconds / totalSeconds : 0;
    const scaledRatio = Math.sqrt(ratio);
    const saturation = scaledRatio * 100;
    return `color-mix(in oklab, var(--color-primary) ${saturation}%, var(--color-secondary))`;
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

        const insightData = await chrome.storage.local.get(["insights"]);
        setScoreStreak(insightData.insights as InsightsData);

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

  const { focusScore, streak } = scoreStreak || { focusScore: 0, streak: 0 };

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

  if (showInsights) {
    return (
      <div className="w-full h-full flex justify-start flex-col">
        <button
          className="text-text animate-fade-in flex w-full justify-center items-center cursor-pointer p-1 border-2 border-primary-dark hover:border-primary hover:bg-primary-dark transition-all duration-300"
          onClick={() => setShowInsights(false)}
        >
          <IoArrowBack className="size-4 mr-1" /> Back to Dashboard
        </button>
        <Insights />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex justify-start flex-col">
      <div className="flex w-full h-fit flex-col">
        {/* Toggle Buttons */}
        <div className="flex w-full h-fit flex-row">
          <div className="grid grid-cols-2 w-full">
            <button
              onClick={() => setActive("global")}
              style={{ "--delay": `50ms` } as React.CSSProperties}
              className={`animate-fade-up animate-stagger col-1 p-1 flex justify-center cursor-pointer border-2 transition-all duration-300 ${
                active === "global"
                  ? "border-primary bg-primary-dark text-text"
                  : "bg-transparent hover:bg-primary-dark text-sub-text border-transparent"
              }`}
            >
              All Websites
            </button>
            <button
              onClick={() => setActive("block")}
              style={{ "--delay": `100ms` } as React.CSSProperties}
              className={`animate-fade-up animate-stagger col-2 p-1 flex justify-center cursor-pointer transition-all duration-300 border-2 ${
                active === "block"
                  ? "border-primary bg-primary-dark text-text"
                  : "bg-transparent hover:bg-primary-dark text-sub-text border-transparent"
              }`}
            >
              Blocked Websites
            </button>
          </div>
        </div>

        {/* Day Picker */}
        <ul className="relative w-full h-full flex-row grid grid-cols-7 mt-2 border-2 border-transparent p-0 list-none">
          {/* <div className="absolute bottom-0 w-full h-0.5 bg-bg-light rounded-full" /> */}
          <div
            className="absolute bottom-0 left-0 h-0.5 bg-primary shadow-[0_0_15px_currentColor] text-primary transition-all duration-300 ease-in-out z-0"
            style={{
              width: "14.28%", // 100% divided by 7 days
              transform: `translateX(${Days.findIndex((d) => d.name === currDay) * 100}%)`,
            }}
          />
          {Days.map((day) => (
            <li
              key={day.id}
              style={{ "--delay": `${day.id * 50}ms` } as React.CSSProperties}
              className="animate-fade-up animate-stagger flex w-full items-center justify-center z-10"
            >
              <button
                onClick={() => setDay(day.name)}
                className={`w-full flex justify-center items-center cursor-pointer p-1 hover:text-text transition-all duration-300 ${
                  currDay === day.name ? "text-text" : "text-sub-text"
                }`}
              >
                {day.short}
              </button>
            </li>
          ))}
        </ul>

        {/* Chart & List Area */}
        <div className="grid grid-cols-2 w-full mt-2 gap-2">
          <div className={`flex flex-col row-1 self-start p-1 ${active === "block" ? "col-1" : "col-2"}`}>
            <div className="animate-fade-in relative flex flex-col self-start">
              <div className="absolute inset-0 row flex items-center justify-center mb-6 pointer-events-none">
                <span
                  key={`${active}${currDay}`}
                  className="z-10 relative group text-secondary text-[10px] cursor-help whitespace-nowrap pointer-events-auto"
                >
                  {currDay !== today ? `${currDay}` : "Today"}'s Usage
                  <div className="absolute left-1/2 -translate-x-1/2 leading-tight top-full mt-1 p-1 text-xs w-35 text-text bg-bg-light rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-pre-line pointer-events-none">
                    Sites with 1 minute or less will not displayed but are still counted
                  </div>
                </span>
              </div>
              <div className="absolute pointer-events-none inset-0 flex items-center mt-2 justify-center text-text text-lg transition-all duration-300">
                {active === "block" ? sumWebsiteTime() : sumGlobalTime()}
              </div>
              <div key={`${active}${currDay}`} className="animate-pie-reveal animate-circular-wipe pointer-events-none">
                <PieChart
                  data={active === "block" ? chartData : chartGlobalData}
                  lineWidth={25}
                  paddingAngle={1}
                  lengthAngle={-360}
                />
              </div>
            </div>
          </div>

          <div className={`relative row-span-full ${active === "block" ? "col-2 row-1" : "col-1 row-1"}`}>
            <ul className="absolute inset-0 overflow-y-auto text-text flex flex-col scroll-smooth">
              {(active === "block" ? websiteTimes : globalTimes).map((site, index) => (
                <li
                  key={`${active}${index}${site.domain}`}
                  style={{ "--delay": `${index * 50}ms` } as React.CSSProperties}
                  className="flex animate-fade-up animate-stagger group justify-between gap-1 items-center whitespace-nowrap hover:bg-bg-light text-xs p-1.25 transition-all duration-100"
                >
                  <span className="flex flex-row items-center truncate">
                    <span
                      className="w-2 h-2 mr-1 shrink-0 flex items-center"
                      style={{ backgroundColor: site.color }}
                    ></span>
                    <span className="text-sub-text group-hover:text-text truncate">{site.domain}</span>
                  </span>
                  <span className="text-text">{formatTotalTime(site.seconds)}</span>
                </li>
              ))}
              {(active === "block" ? websiteTimes : globalTimes).length === 0 && (
                <li className="text-text p-1 text-xs w-full justify-center flex items-center">
                  Data unavalibale for {currDay}.
                </li>
              )}
            </ul>
          </div>
        </div>
        {/* Insights and stats */}
        <div className="grid grid-cols-2 flex-row mt-2">
          <div className="flex text-text col-1 justify-center items-center flex-col">
            <div
              style={{ "--delay": `50ms` } as React.CSSProperties}
              className="animate-fade-up animate-stagger flex flex-row whitespace-nowrap"
            >
              <TbFocus2 className="size-4 mr-1 text-secondary" />
              <div className="ml-1 text-secondary font-bold">{focusScore}/100</div>
            </div>
            <div
              style={{ "--delay": `100ms` } as React.CSSProperties}
              className="z-999 animate-fade-up animate-stagger text-sub-text group relative cursor-help"
            >
              Lock In Score
              <div className="absolute left-1/2 leading-tight -translate-x-1/2 -translate-y-3.5 top-full p-1 text-xs w-35 text-text bg-bg-light rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-pre-line pointer-events-none">
                Higher is better. Stay off blocked websites to increase score!
              </div>
            </div>
          </div>
          <div className="flex text-text col-2 justify-center items-center flex-col">
            <div
              style={{ "--delay": `50ms` } as React.CSSProperties}
              className="animate-fade-up animate-stagger flex flex-row whitespace-nowrap"
            >
              <BsFire className="size-4 mr-1 text-secondary" />
              <div className="ml-1 text-secondary font-bold">{streak}</div>
            </div>
            <div
              style={{ "--delay": `100ms` } as React.CSSProperties}
              className="animate-fade-up animate-stagger z-999 text-sub-text group relative cursor-help"
            >
              Daily Streak
              <div className="absolute left-1/2 leading-tight -translate-x-1/2 -translate-y-3.5 top-full p-1 text-xs w-35 text-text bg-bg-light rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-pre-line pointer-events-none">
                Keep your score above 80 to maintain your streak!
              </div>
            </div>
          </div>
        </div>
        <button
          style={{ "--delay": `100ms` } as React.CSSProperties}
          className="animate-fade-up animate-stagger text-text flex w-full justify-center items-center cursor-pointer mt-2 p-1 transition-all duration-300 hover:bg-primary-dark border-2 border-primary-dark hover:border-primary"
          onClick={() => setShowInsights(true)}
        >
          More Insights <PiMagnifyingGlassBold className="text-text size-4 ml-1" />
        </button>
      </div>
    </div>
  );
}
