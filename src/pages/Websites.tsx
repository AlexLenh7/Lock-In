import { useEffect, useState, useRef } from "react";

export default function Websites() {
  // specify type for website to create the array
  type Website = { id: string; text: string };

  const [text, setText] = useState<string>("");
  const [website, setWebsite] = useState<Website[]>([]);
  const isInitialMount = useRef(true);
  const [currSite, setCurrSite] = useState<string>("");

  // we want to get the array of websites and populate the list when the component mounts
  // uses storage.sync since it acts as user settings
  useEffect(() => {
    chrome.storage.sync.get({ website: [] }, (data) => {
      setWebsite(data.website as Website[]);
    });

    // grab the current site on mount
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.url) {
        try {
          const url = new URL(activeTab.url);
          const cleanName = url.hostname.replace(/^www\./, "");
          setCurrSite(cleanName);
        } catch (e) {
          console.log("invalid URL", e);
        }
      }
    });
  }, []); // runs on first render

  //saves notes to chrome storage on change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    chrome.storage.sync.set({ website });
  }, [website]); // runs whenever state changes

  // helper function to check if website is valid
  const isValidSyntax = (str: string) => {
    try {
      const urlString = str.includes("://") ? str : "https://" + str;
      const url = new URL(urlString);
      const hostname = url.hostname;

      // Check for dots
      const parts = hostname.split(".");
      const tld = parts[parts.length - 1];
      const hasDot = parts.length > 1;
      const validTld = tld.length >= 2;

      return hasDot && validTld;
    } catch (e) {
      console.log("Debug - URL Constructor Failed", e);
      return false;
    }
  };

  // we want add website to push each onClick change in input
  const addWebsite = () => {
    const valid = text.trim();
    const siteExists = website.some((site) => site.text.toLowerCase() === valid.toLowerCase());

    // checks if string is empty
    if (!valid) return;

    // checks if string has valid syntax
    if (!isValidSyntax(valid)) {
      alert("Please enter a valid domain!");
      return;
    }

    // check if website already exists
    if (siteExists) {
      alert("Site exists!");
      return;
    }

    const newWebsite: Website = { id: Date.now().toString(), text: valid };
    setWebsite([newWebsite, ...website]);
    setText("");
  };

  // add current focused Site
  const addCurr = () => {
    // checks if site is already added
    const siteExists = website.some((site) => site.text === currSite);
    if (siteExists) return;

    const newWebsite: Website = { id: Date.now().toString(), text: currSite };
    setWebsite([newWebsite, ...website]);
  };

  const updateRemove = (id: string, newText: string) => {
    if (newText.trim() === "") {
      // if empty remove it
      setWebsite((prev) => prev.filter((w) => w.id !== id));
    } else {
      setWebsite((prev) => prev.map((w) => (w.id === id ? { ...w, text: newText } : w)));
    }
  };

  return (
    <div className="w-full h-fit flex flex-col mt-4">
      {/* Input field */}
      <div className="border-text border-2">
        <div className="w-full flex flex-row gap-2">
          <div className="flex w-full text-text">
            <input
              type="text"
              placeholder="Enter a website (e.g. youtube.com)"
              className="w-full p-2 focus:outline-none focus:border-primary"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addWebsite()}
            />
          </div>
        </div>

        {/* List of websites */}
        <div className="overflow-y-scroll max-h-75">
          {website.length === 0 && (
            <p className="flex justify-center w-full text-text text-lg font-bold mt-4">No websites yet</p>
          )}
          {website.map((site) => (
            <input
              key={site.id}
              type="text"
              value={site.text}
              onChange={(e) => updateRemove(site.id, e.target.value)}
              className="hover:bg-primary transition-all duration-300 w-full p-2 bg-transparent border-b border-box-outline text-text focus:border-primary outline-none"
            />
          ))}
        </div>
      </div>

      {/* Add current site button */}
      <div>
        {currSite && (
          <button
            className="border-2 border-text text-text rounded-lg p-2 w-full mt-4 cursor-pointer flex hover:border-primary"
            onClick={addCurr}
          >
            {website.some((site) => site.text === currSite) ? "Site already exists" : `Add ${currSite}?`}
          </button>
        )}
      </div>
    </div>
  );
}
