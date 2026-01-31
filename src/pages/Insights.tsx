import { TbFocus2 } from "react-icons/tb";
import { ImEyeBlocked } from "react-icons/im";
import { ImTrophy } from "react-icons/im";
import { useEffect, useState } from "react";
import { formatTimeDifference, formatTotalTime } from "../utils/Helpers";
import { MdToday } from "react-icons/md";
import { IoMdTrendingUp } from "react-icons/io";
import { IoMdTrendingDown } from "react-icons/io";

export interface InsightsData {
  todayTotal: number;
  todayBlocked: number;
  weeklyTotal: number;
  weeklyBlocked: number;
  dailyAverage: number;
  yesterdayTotal: number;
  yesterdayBlocked: number;
  blockedPercentage: number;
  weeklyBlockedPercentage: number;
  yesterdayBlockedPercentage: number;
  timeSpentFromYesterday: number;
  blockedTimeFromYesterday: number;
  focusScoreFromYesterday: number;
  yesterdayFocusScore: number;
  diffFromAverage: number;
  focusScore: number;
  streak: number;
  bestDay: string;
  bestDayTime: number;
  worstDay: string;
  worstDayTime: number;
  lastUpdated: number;
}

export default function Insights() {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInsights = async () => {
      try {
        const data = await chrome.storage.local.get(["insights"]);
        if (data.insights) {
          setInsights(data.insights as InsightsData);
        }
        setLoading(false);
      } catch (error) {
        console.error("Failed to load insights:", error);
        setLoading(false);
      }
    };

    loadInsights();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleStorageChange = (changes: any, area: string) => {
      if (area === "local" && changes.insights) {
        setInsights(changes.insights.newValue);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  if (!insights) {
    return (
      <div className="w-full h-full justify-center items-center">
        <div className="text-sub-text">No data available yet. Start browsing to see your insights!</div>;
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full justify-center items-center">
        <div className="text-sub-text">Loading insights...</div>;
      </div>
    );
  }

  const {
    focusScore,
    streak,
    timeSpentFromYesterday,
    blockedTimeFromYesterday,
    focusScoreFromYesterday,
    yesterdayFocusScore,
    blockedPercentage,
    yesterdayBlockedPercentage,
    diffFromAverage,
    weeklyBlocked,
    todayBlocked,
    yesterdayBlocked,
    dailyAverage,
    bestDay,
    bestDayTime,
    worstDay,
    worstDayTime,
  } = insights || {
    focusScore: 0,
    streak: 0,
    timeSpentFromYesterday: 0,
    blockedTimeFromYesterday: 0,
    focusScoreFromYesterday: 0,
    yesterdayFocusScore: 0,
    blockedPercentage: 0,
    yesterdayBlockedPercentage: 0,
    diffFromAverage: 0,
    weeklyBlocked: 0,
    todayBlocked: 0,
    yesterdayBlocked: 0,
    dailyAverage: 0,
    bestDay: "",
    bestDayTime: 0,
    worstDay: "",
    worstDayTime: 0,
  };

  //const wastedMinutes = Math.floor(weeklyBlocked / 60);
  // const workouts = Math.floor(wastedMinutes / 120);
  //  const movies = Math.floor(wastedMinutes / 137);

  return (
    <div className="flex flex-col w-full h-full mt-4">
      <div className="grid grid-cols-2 grid-rows-2 gap-2 w-full h-full">
        {/* Focus Score Card */}
        <div
          style={{ "--delay": `50ms` } as React.CSSProperties}
          className="animate-fade-up animate-stagger flex flex-col hover:bg-primary-dark border-2 border-bg-light transition-all duration-300 p-2"
        >
          <div className="flex items-center gap-1 mb-1">
            <TbFocus2 className="size-4 text-secondary" />
            <span className="text-[12px] text-secondary uppercase">Current Session</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <span
              className={`text-2xl font-semibold flex items-center justify-center gap-1 ${focusScoreFromYesterday >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {focusScoreFromYesterday >= 0 ? <IoMdTrendingUp /> : <IoMdTrendingDown />}
              {focusScore}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-sub-text uppercase">Streak</span>
            <span className="text-[10px] font-semibold text-text">{streak}d</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-sub-text uppercase">vs Yesterday</span>
            <span
              className={`text-[10px] font-semibold ${focusScoreFromYesterday >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              <span className="text-text">{yesterdayFocusScore} </span>({focusScoreFromYesterday > 0 ? "+" : ""}
              {focusScoreFromYesterday})
            </span>
          </div>
        </div>

        {/* Blocked Stats Card */}
        <div
          style={{ "--delay": `100ms` } as React.CSSProperties}
          className="animate-fade-up animate-stagger flex flex-col hover:bg-primary-dark border-2 border-bg-light transition-all duration-300 p-2"
        >
          <div className="flex items-center gap-1 mb-1">
            <ImEyeBlocked className="size-4 text-secondary" />
            <span className="text-[12px] text-secondary uppercase">Blocked</span>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-sub-text uppercase">Today</span>
              <span className="text-sm font-semibold text-text">
                {formatTotalTime(todayBlocked)}{" "}
                <span className="text-secondary font-normal">({blockedPercentage.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-sub-text uppercase">Yesterday</span>
              <span className="text-sm font-semibold text-text">
                {formatTotalTime(yesterdayBlocked)}{" "}
                <span className="text-secondary font-normal">({yesterdayBlockedPercentage.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-sub-text uppercase">Weekly</span>
              <span className="text-sm font-semibold text-text">{formatTotalTime(weeklyBlocked)}</span>
            </div>
          </div>
        </div>

        {/* Comparison Card */}
        <div
          style={{ "--delay": `150ms` } as React.CSSProperties}
          className="animate-fade-up animate-stagger flex flex-col hover:bg-primary-dark border-2 border-bg-light transition-all duration-300 p-2"
        >
          <div className="flex items-center gap-1 mb-1">
            <MdToday className="size-4 text-secondary" />
            <span className="text-[12px] text-secondary uppercase">vs Yesterday</span>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-sub-text uppercase">Time</span>
              <span
                className={`text-sm font-semibold ${timeSpentFromYesterday >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {timeSpentFromYesterday > 0 ? "+" : ""}
                {timeSpentFromYesterday.toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-sub-text uppercase">Blocked</span>
              <span
                className={`text-sm font-semibold ${blockedTimeFromYesterday >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {blockedTimeFromYesterday > 0 ? "+" : ""}
                {blockedTimeFromYesterday.toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-sub-text uppercase">Avg Diff</span>
              <span className="text-sm font-semibold text-text">{formatTimeDifference(diffFromAverage)}</span>
            </div>
          </div>
        </div>

        {/* Records Card */}
        <div
          style={{ "--delay": `200ms` } as React.CSSProperties}
          className="animate-fade-up animate-stagger flex flex-col hover:bg-primary-dark border-2 border-bg-light transition-all duration-300 p-2"
        >
          <div className="flex items-center gap-1 mb-1">
            <ImTrophy className="size-4 text-secondary" />
            <span className="text-[12px] text-secondary uppercase">Records</span>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-1">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-green-500 uppercase">Best</span>
                <span className="text-[10px] text-sub-text uppercase">{bestDay}</span>
              </div>
              <span className="text-sm font-semibold text-text">{formatTotalTime(bestDayTime)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-red-500 uppercase">Worst</span>
                <span className="text-[10px] text-sub-text uppercase">{worstDay}</span>
              </div>
              <span className="text-sm font-semibold text-text">{formatTotalTime(worstDayTime)}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-sub-text uppercase">Daily Avg</span>
              <span className="text-sm font-semibold text-text">{formatTotalTime(dailyAverage)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
