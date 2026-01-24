import { TbFocus2 } from "react-icons/tb";
import { ImEyeBlocked } from "react-icons/im";
import { ImTrophy } from "react-icons/im";
import { useEffect, useState } from "react";
import { formatTimeDifference, formatTotalTime } from "../utils/Helpers";
import { MdToday } from "react-icons/md";

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
    <div className="flex flex-col w-full h-full mb-4 mt-2">
      <div className="grid grid-cols-2 grid-rows-2 gap-4 w-full h-full">
        {/* Focus & Streak Card */}
        <div className="flex flex-col col-1 row-1 justify-center items-center hover:bg-primary-dark border-2 border-primary transition-all duration-300 p-2 text-[10px]">
          <div className="flex flex-row gap-1 mb-1 items-center">
            <TbFocus2 className="size-4 text-secondary" />
            <div className="text-secondary text-xs uppercase font-bold">Current Session</div>
          </div>
          <div className="text-text">Lock In Score: {focusScore}</div>
          <div className="text-text">Daily Streak: {streak}</div>
        </div>

        {/* Blocked Stats Card */}
        <div className="flex flex-col col-2 row-1 justify-center items-center hover:bg-primary-dark border-2 border-primary transition-all duration-300 p-2 text-[10px]">
          <div className="flex flex-row gap-1 mb-1 items-center">
            <ImEyeBlocked className="size-4 text-secondary" />
            <div className="text-secondary font-bold text-xs uppercase">Blocked</div>
          </div>
          <div className="text-text mt-1">
            Today: {formatTotalTime(todayBlocked)} ({blockedPercentage.toFixed(0)}%)
          </div>
          <div className="text-text ">
            Yesterday: {formatTotalTime(yesterdayBlocked)} ({yesterdayBlockedPercentage.toFixed(0)}%)
          </div>
          <div className="text-text ">Weekly: {formatTotalTime(weeklyBlocked)}</div>
        </div>

        {/* Comparison Card */}
        <div className="flex flex-col col-1 row-2 justify-center items-center hover:bg-primary-dark border-2 border-primary transition-all duration-300 p-2 text-[10px]">
          <div className="flex flex-row gap-1 mb-1 items-center">
            <MdToday className="size-4 text-secondary mb-1" />
            <div className="text-secondary uppercase font-bold mb-1 text-xs">vs Yesterday</div>
          </div>
          <div className="text-text ">Total Time: {timeSpentFromYesterday.toFixed(0)}%</div>
          <div className="text-text ">Blocked Time: {blockedTimeFromYesterday.toFixed(0)}%</div>
          <div className="text-text ">
            Lock In Score: {yesterdayFocusScore} ({focusScore >= yesterdayFocusScore ? "+" : "-"}
            {focusScoreFromYesterday.toFixed(0)}%)
          </div>
          <div className="text-sub-text mt-1">Average: {formatTimeDifference(diffFromAverage)}</div>
        </div>

        {/* Records/Trophy Card */}
        <div className="flex flex-col col-2 row-2 justify-center items-center hover:bg-primary-dark border-2 border-primary transition-all duration-300 p-2 text-[10px]">
          <div className="flex flex-row gap-1 mb-1 items-center">
            <ImTrophy className="text-secondary size-4" />
            <div className="text-secondary font-bold uppercase text-xs">Records</div>
          </div>
          <div className="w-full text-center">
            <div className="text-text truncate">
              Best: {bestDay} ({formatTotalTime(bestDayTime)})
            </div>
            <div className="text-text truncate">
              Worst: {worstDay} ({formatTotalTime(worstDayTime)})
            </div>
            <div className="mt-1 pt-1 text-sub-text">Average: {formatTotalTime(dailyAverage)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
