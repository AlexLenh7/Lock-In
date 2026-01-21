import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Websites, { type Website } from "./pages/Websites";
import { FaLock } from "react-icons/fa";
import { FaLockOpen } from "react-icons/fa";
import { FaCheck } from "react-icons/fa6";
import { isValid } from "./utils/Helpers";

function App() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [website, setWebsite] = useState<Website[]>([]);
  const [currSite, setCurrSite] = useState<string>("");
  const [globalSwitch, setGlobalSwitch] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [checkValid, setCheckValid] = useState<boolean>();
  const [currTheme, setTheme] = useState<string>("default-dark");

  const themes = [
    { id: 1, theme: "default-dark", name: "Dark" },
    { id: 2, theme: "default-light", name: "Light" },
    { id: 3, theme: "neo-tokyo", name: "Tokyo" },
    { id: 4, theme: "aura", name: "Aura" },
    { id: 5, theme: "rose", name: "Rose" },
    { id: 6, theme: "mono", name: "Mono" },
    { id: 7, theme: "jade", name: "Jade" },
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
    // use a promise to ensure data loads before applying
    const loadData = async () => {
      try {
        const data = await chrome.storage.sync.get({
          globalSwitch: true,
          website: [],
          theme: "default-dark",
        });

        // document.documentElement.style.setProperty("--theme-hue", (data.theme as number).toString());

        setGlobalSwitch(data.globalSwitch as boolean);
        setWebsite(data.website as Website[]);
        setTheme(data.theme as string);
        setIsLoaded(true);
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
          <div className="flex-1">
            <Dashboard />
          </div>
        );
      case "Websites":
        return (
          <div className="flex-1">
            <Websites website={website} setWebsite={handleUpdateWebsites} />
          </div>
        );
      case "Settings":
        return (
          <div className="flex-1">
            <Settings />
          </div>
        );
      default:
        return null;
    }
  };

  // visual safe guard
  if (!isLoaded) {
    return <div className="bg-primary"></div>;
  }

  return (
    <div
      data-theme={currTheme}
      className="flex p-4 w-full h-full flex-col justify-start border-2 border-text items-center bg-bg border-solid outline-none"
    >
      <div className="relative w-full justify-center flex">
        <h1 className="text-text w-full flex justify-center text-2xl font-bold mb-4 tracking-widest z-10">LOCK IN.</h1>
        <h1 className="absolute text-primary w-full flex justify-center text-2xl font-bold mb-4 tracking-widest translate-y-0.5 translate-x-0.5">
          LOCK IN.
        </h1>
      </div>
      {/* Add current site button */}
      <div className="grid grid-cols-2 w-full gap-2">
        <div className="col-1 overflow-hidden">
          {currSite && checkValid && (
            <button
              className={`overflow-hidden border-2 text-text p-1 w-full border-bg-light cursor-pointer flex hover:border-secondary hover:bg-primary transition-all duration-300 justify-center`}
              onClick={addCurr}
            >
              {website.some((site) => site.text === currSite) ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    className="size-4 mr-1"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>

                  <span className="flex items-center justfiy-center">Site already added</span>
                </>
              ) : (
                <>
                  <FaCheck className="size-4 mr-1" />
                  <span className="justify-center items-center truncate">{currSite}?</span>
                </>
              )}
            </button>
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
          <p className="flex justify-center text-sub-text">Quick add</p>
        </div>
        {/* Global Switch */}
        <div className="col-2 grid grid-cols-2">
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
          <p className="col-span-2 flex justify-center text-sub-text">Extension Toggle</p>
        </div>
      </div>
      <nav className="w-full h-fit mt-4">
        <ul className="grid grid-cols-3 items-start w-full">
          {navItems.map((item) => (
            <li
              className={`flex justify-center items-center col-${
                item.key
              } cursor-pointer border-solid px-2 py-1 hover:bg-primary text-text transition-all duration-300 ${
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
      <div className="flex w-full h-full">{renderContent()}</div>
      <div className="grid grid-cols-2 w-full mt-4">
        {/* 1. Remove the middle wrapper div so buttons are direct children of the grid */}
        {/* 2. Use a fixed grid-cols-3 or inline style for the themes */}
        <div
          className="grid col-span-full text-text w-full border-2 border-primary-dark overflow-hidden"
          style={{ gridTemplateColumns: `repeat(${themes.length}, minmax(0, 1fr))` }}
        >
          {themes.map((theme) => (
            <button
              key={theme.id}
              className={`cursor-pointer p-1 flex justify-center transition-all duration-300 ${
                // Highlight the active theme
                currTheme === theme.theme ? "bg-primary text-text" : "hover:bg-primary-dark text-sub-text"
              }`}
              onClick={() => handleTheme(theme.theme)}
            >
              {theme.name}
            </button>
          ))}
        </div>

        <div className="col-span-full mt-4">
          <div className="flex flex-row gap-4">
            <div className="flex flex-1 border-2 p-1 cursor-pointer transition-all duration-300 border-primary-dark hover:border-primary hover:bg-primary-dark justify-center items-center text-text">
              Need Help?
            </div>
            <div className="flex flex-1 flex-col items-center justify-between border-2 p-1 cursor-pointer transition-all duration-300 hover:border-primary border-primary-dark hover:bg-primary-dark">
              <div className="flex text-text">Consider supporting!</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
