import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Websites, { type Website } from "./pages/Websites";
import { FaLock } from "react-icons/fa";
import { FaLockOpen } from "react-icons/fa";
import { isValid } from "./utils/Helpers";
import { CgPlayListAdd } from "react-icons/cg";
import { CgPlayListRemove } from "react-icons/cg";
import { SiKofi } from "react-icons/si";
import { MdHelp } from "react-icons/md";
import Typewriter from "typewriter-effect";
import { IoMdColorPalette } from "react-icons/io";
import { LockInLogo } from "./components/LockInLogo";

function App() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [website, setWebsite] = useState<Website[]>([]);
  const [currSite, setCurrSite] = useState<string>("");
  const [globalSwitch, setGlobalSwitch] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [checkValid, setCheckValid] = useState<boolean>();
  const [currTheme, setTheme] = useState<string>("default-dark");
  const [quote, setQuote] = useState<string>("");
  const [showTheme, setShowTheme] = useState(false);

  const randomQuotes = [
    "Focus on the process, not just the results",
    "Your focus determines your reality",
    "What you focus on grows",
    "Less distraction, more action",
    "Focus on the journey, not the destination",
    "One thing at a time",
    "Focus on your goals, not your fear",
    "Do what you can, with what you have, where you are",
    "Don't watch the clock; do what it does. Keep going",
    "Eliminate distractions",
    "Support future updates by donating",
  ];

  const genRandQuote = () => {
    const num = Math.floor(Math.random() * randomQuotes.length);
    setQuote(randomQuotes[num]);
  };

  const themes = [
    { id: 1, theme: "default-dark", name: "Dark" },
    { id: 2, theme: "default-light", name: "Light" },
    { id: 3, theme: "synth", name: "Synth" },
    { id: 4, theme: "sunset", name: "Sunset" },
    { id: 5, theme: "lumen", name: "Lumen" },
    { id: 6, theme: "candy", name: "Candy" },
    { id: 7, theme: "mono", name: "Mono" },
  ];

  // grab the current site on mount / when popup opens
  const grabCurrSite = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.url) {
        try {
          const url = new URL(activeTab.url);
          const cleanName = url.hostname.replace(/^www\./, "");
          setCurrSite(cleanName);
          const checkValid = await isValid(activeTab?.url);
          setCheckValid(checkValid);
        } catch (e) {
          console.log("invalid URL", e);
        }
      }
    });
  };

  // Single loader to grab all data
  useEffect(() => {
    const loadData = async () => {
      try {
        const { globalSwitch, website, theme } = await chrome.storage.sync.get(["globalSwitch", "website", "theme"]);

        setGlobalSwitch(globalSwitch as boolean);
        setWebsite(website as Website[]);
        setTheme(theme as string);
        setIsLoaded(true);
        genRandQuote();
      } catch (error) {
        console.log(error);
      }
    };

    loadData();
    grabCurrSite();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", currTheme);
  }, [currTheme]);

  const handleTheme = async (theme: string) => {
    setTheme(theme);
    chrome.storage.sync.set({ theme: theme });
  };

  // handle global switch state
  const handleToggleGlobal = async () => {
    const newValue = !globalSwitch;
    setGlobalSwitch(newValue);
    await chrome.storage.sync.set({ globalSwitch: newValue });
  };

  // handle website states
  const handleUpdateWebsites = async (newWebsites: Website[]) => {
    setWebsite(newWebsites);
    await chrome.storage.sync.set({ website: newWebsites });
  };

  // add current focused Site
  const addCurr = () => {
    if (website.some((site) => site.text === currSite)) return;

    const newWebsite: Website = { id: Date.now().toString(), text: currSite };
    const updatedList = [newWebsite, ...website];

    // Update both State (UI) and Storage (Data) at once
    setWebsite(updatedList);
    chrome.storage.sync.set({ website: updatedList });
  };

  const navItems = [
    {
      key: 1,
      name: "Dashboard",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5 mr-1">
          <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75ZM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 0 1-1.875-1.875V8.625ZM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 0 1 3 19.875v-6.75Z" />
        </svg>
      ),
    },
    {
      key: 2,
      name: "Websites",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5 mr-1">
          <path d="M5.625 3.75a2.625 2.625 0 1 0 0 5.25h12.75a2.625 2.625 0 0 0 0-5.25H5.625ZM3.75 11.25a.75.75 0 0 0 0 1.5h16.5a.75.75 0 0 0 0-1.5H3.75ZM3 15.75a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75ZM3.75 18.75a.75.75 0 0 0 0 1.5h16.5a.75.75 0 0 0 0-1.5H3.75Z" />
        </svg>
      ),
    },
    {
      key: 3,
      name: "Settings",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5 mr-1">
          <path
            fill-rule="evenodd"
            d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"
            clip-rule="evenodd"
          />
        </svg>
      ),
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "Dashboard":
        return (
          <div className="flex-1 overflow-hidden flex flex-col relative">
            <Dashboard />
          </div>
        );
      case "Websites":
        return (
          <div className="flex-1 overflow-hidden flex flex-col relative">
            <Websites website={website} setWebsite={handleUpdateWebsites} />
          </div>
        );
      case "Settings":
        return (
          <div className="flex-1 overflow-hidden flex flex-col relative">
            <Settings />
          </div>
        );
      default:
        return null;
    }
  };

  // visual safe guard
  if (!isLoaded) {
    return;
  }

  return (
    <div
      data-theme={currTheme}
      className="flex p-4 w-full h-full flex-col justify-start border-2 border-text items-center bg-bg border-solid outline-none"
    >
      <div className="relative w-full justify-center items-center flex flex-col">
        <h1 className="text-text w-full flex justify-center items-center text-2xl font-extrabold tracking-widest z-10 leading-none mb-1">
          <div className="flex justify-center items-center">
            <span className="animate-reveal-l overflow-hidden whitespace-nowrap">L</span>
            <div className="animate-logo-spin flex items-center justify-center mx-0.5 shrink-0">
              <LockInLogo className="size-4.5" />
            </div>
            <span className="animate-reveal-r overflow-hidden whitespace-nowrap">CK IN</span>
          </div>
        </h1>
        <div>
          <p className="text-sub-text w-full flex items-center justify-center mb-2 text-xs tracking-wide">
            <>
              "
              <Typewriter
                onInit={(typewriter) => {
                  typewriter.typeString(`${quote}`).start();
                }}
                options={{
                  delay: 75,
                  skipAddStyles: true,
                  cursor: `.`,
                }}
              />
              "
            </>
          </p>
        </div>
      </div>
      {/* Add current site button */}
      <div className="grid grid-cols-2 w-full gap-2">
        <div
          className="col-1 overflow-hidden animate-fade-up animate-stagger"
          style={{ "--delay": `50ms` } as React.CSSProperties}
        >
          {currSite && checkValid && (
            <div>
              {website.some((site) => site.text === currSite) ? (
                <button
                  onClick={addCurr}
                  className={`overflow-hidden border-2 text-text w-full p-1 border-bg-light flex items-center transition-all duration-300 justify-center`}
                >
                  <CgPlayListRemove className="size-4 mr-1 shrink-0" />
                  Site already added
                </button>
              ) : (
                <button
                  onClick={addCurr}
                  className={`overflow-hidden cursor-pointer w-full hover:border-secondary hover:bg-primary border-2 text-text p-1 border-bg-light flex items-center transition-all duration-300 justify-center`}
                >
                  <CgPlayListAdd className="size-4 mr-1 shrink-0" />
                  <span className="truncate">{currSite}?</span>
                </button>
              )}
            </div>
          )}
          {!(currSite && checkValid) && (
            <div className="overflow-hidden border-2 text-text p-1 w-full border-bg-dark flex hover:border-bg-dark transition-all duration-300 justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                className="size-4 mr-1 text-sub-text"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              <span className="justify-center items-center text-sub-text">Unavaliable for tracking</span>
            </div>
          )}
          {/* <p className="flex justify-center text-sub-text">Quick add</p> */}
        </div>
        {/* Global Switch */}
        <div
          style={{ "--delay": `100ms` } as React.CSSProperties}
          className="col-2 grid grid-cols-2 animate-fade-up animate-stagger"
        >
          <button
            onClick={() => handleToggleGlobal()}
            className={`relative col-span-2 w-full flex items-center border-2 ${globalSwitch ? "border-primary" : "border-secondary"} cursor-pointer overflow-hidden transition-all duration-300`}
            aria-label="Toggle Extension"
          >
            <div
              className={`absolute top-0 left-0 h-full w-1/2 transition-transform duration-300 ease-in-out ${
                globalSwitch ? "translate-x-0 bg-primary" : "translate-x-full bg-secondary"
              }`}
            />
            <div
              className={`z-10 p-1 flex-1 flex items-center justify-center transition-colors duration-300 ${
                globalSwitch ? "text-text hover:bg-primary" : "text-sub-text hover:bg-primary"
              }`}
            >
              <FaLock className="mr-1" />
              On
            </div>
            <div
              className={`z-10 p-1 flex-1 flex items-center justify-center transition-colors duration-300 ${
                !globalSwitch ? "text-text hover:bg-secondary" : "text-sub-text hover:bg-secondary"
              }`}
            >
              <FaLockOpen className="mr-1" />
              Off
            </div>
          </button>
          {/* <p className="col-span-2 flex justify-center text-sub-text">Extension Toggle</p> */}
        </div>
      </div>
      <nav className="w-full h-fit my-3.5">
        <ul className="grid grid-cols-3 items-start w-full border-2 border-primary animate-fade-in">
          {navItems.map((item) => (
            <li
              style={{ "--delay": `${item.key * 50}ms` } as React.CSSProperties}
              className={`flex justify-center items-center col-${
                item.key
              } cursor-pointer animate-fade-up animate-stagger p-1 hover:bg-primary text-text transition-all duration-300 font-semibold uppercase tracking-wide ${
                activeTab === item.name ? "bg-primary" : "hover:bg-primary-dark"
              }`}
              onClick={() => setActiveTab(item.name)}
            >
              {item.icon}
              {item.name}
            </li>
          ))}
        </ul>
      </nav>
      <div className="w-full flex-1 min-h-0 overflow-hidden flex flex-col">{renderContent()}</div>

      {/* Footer content */}
      <div className="grid grid-cols-2 w-full mt-3 shrink-0">
        {!showTheme && (
          <div
            onClick={() => setShowTheme(true)}
            style={
              {
                "--delay": "50ms",
              } as React.CSSProperties
            }
            className="cursor-pointer hover:bg-primary-dark hover:border-primary transition-all duration-300 animate-fade-up animate-stagger grid col-span-full text-text w-full border-2 border-primary-dark overflow-hidden p-1"
          >
            <span className="flex flex-row justify-center items-center">
              <IoMdColorPalette className="size-4 mr-1" /> Current Theme:{" "}
              {themes.find((i) => i.theme === currTheme)?.name}
            </span>
          </div>
        )}
        {showTheme && (
          <div
            className="animate-fade-up animate-stagger grid col-span-full text-text w-full border-2 border-primary-dark overflow-hidden"
            style={
              {
                gridTemplateColumns: `repeat(${themes.length}, minmax(0, 1fr))`,
                "--delay": "50ms",
              } as React.CSSProperties
            }
          >
            {themes.map((theme, index) => (
              <button
                key={theme.id}
                style={{ "--delay": `${index * 50}ms` } as React.CSSProperties}
                className={`animate-fade-up animate-stagger cursor-pointer p-1 flex justify-center transition-all duration-300 ${
                  currTheme === theme.theme ? "bg-primary text-text" : "hover:bg-primary-dark text-sub-text"
                }`}
                onClick={() => handleTheme(theme.theme)}
              >
                {theme.name}
              </button>
            ))}
          </div>
        )}

        <div className="col-span-full mt-2">
          <div className="flex flex-row gap-2">
            <div
              style={{ "--delay": `50ms` } as React.CSSProperties}
              className="animate-fade-up animate-stagger flex flex-1 border-2 p-1 cursor-pointer transition-all duration-300 border-primary-dark hover:border-primary hover:bg-primary-dark justify-center items-center text-text"
            >
              <MdHelp className="size-4 mr-1" /> Help
            </div>
            <a
              href="https://ko-fi.com/alexprograms"
              target="_blank"
              style={{ "--delay": `100ms` } as React.CSSProperties}
              className="animate-fade-up animate-stagger flex flex-1 border-2 p-1 cursor-pointer transition-all duration-300 border-primary-dark hover:border-primary hover:bg-primary-dark justify-center items-center text-text"
            >
              <SiKofi className="size-4 mr-1" /> Donate
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
