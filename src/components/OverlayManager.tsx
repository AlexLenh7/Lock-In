// src/components/OverlayManager.tsx
import { useEffect, useState } from "react";
import Block from "./Block";
import Warn from "./Warn";
import { type Website } from "../pages/Websites";

export default function OverlayManager() {
  const [isAction, setisAction] = useState<boolean>(false);
  const [localAction, setLocalAction] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const {
        action,
        globalSwitch,
        website = [],
      } = await chrome.storage.sync.get(["action", "globalSwitch", "website"]);
      const { showAction } = await chrome.storage.local.get(["showAction"]);

      const currentHostname = window.location.hostname.replace(/^www\./, "");
      const isSiteBlocked = (website as Website[]).some((site) => site.text === currentHostname);

      const shouldShow = (showAction as boolean) && isSiteBlocked;

      setisAction(shouldShow);
      setLocalAction(action as string);

      // another check for global switch
      if (globalSwitch === false) {
        setisAction(false);
        return;
      }
    };

    checkStatus();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleStorageChange = (changes: any, area: string) => {
      if (area === "sync" || area === "local") {
        if (changes.showAction || changes.active || changes.website || changes.globalSwitch) {
          checkStatus();
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
  }, []);

  const handleClose = () => {
    setisAction(false);
  };

  if (!isAction || !localAction) return null;

  if (localAction === "Block") {
    return (
      <div className="fixed inset-0 w-full h-full z-2147483647 flex justify-center items-center">
        <div style={{ "--delay": `50ms` } as React.CSSProperties} className="animate-fade-up animate-stagger">
          <Block onClose={handleClose} />
        </div>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-lg -z-10"></div>
      </div>
    );
  }

  if (localAction === "Warn") {
    return (
      <div className="fixed inset-0 w-screen h-screen z-2147483647 pointer-events-none">
        <div style={{ "--delay": `50ms` } as React.CSSProperties} className="animate-fade-down animate-stagger">
          <Warn onClose={handleClose} />
        </div>
      </div>
    );
  }
}
