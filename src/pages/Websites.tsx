import { useEffect, useState } from "react";
import { isValidSyntax } from "../utils/Helpers";

export type Website = { id: string; text: string };

interface Props {
  website: Website[];
  setWebsite: (newWebsites: Website[]) => void;
}

export default function Websites({ website, setWebsite }: Props) {
  // specify type for website to create the array
  const [text, setText] = useState<string>("");
  const [isAlert, setAlert] = useState<string>("");

  useEffect(() => {
    if (isAlert) {
      const timer = setTimeout(() => {
        setAlert("");
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isAlert]);

  // we want add website to push each onClick change in input
  const addWebsite = async () => {
    const valid = text.trim();
    const urlString = valid.includes("://") ? valid : "https://" + valid;
    const domain = new URL(urlString).hostname.replace(/^www\./, "");

    const siteExists = website.some((site) => site.text.toLowerCase() === valid.toLowerCase());

    // checks if string is empty
    if (!valid) return;

    const isValid = await isValidSyntax(valid);

    // checks if string has valid syntax
    if (!isValid) {
      setAlert("Please enter a valid domain!");
      return;
    }

    // check if website already exists
    if (siteExists) {
      setAlert("Site already exists!");
      return;
    }

    const newWebsite: Website = { id: Date.now().toString(), text: domain };
    setWebsite([newWebsite, ...website]);
    setText("");
  };

  const updateRemove = (id: string, newText: string) => {
    let newWebsites;
    if (newText.trim() === "") {
      // If the user clears the text, remove the item
      newWebsites = website.filter((w) => w.id !== id);
    } else {
      // Otherwise, update the text
      newWebsites = website.map((w) => (w.id === id ? { ...w, text: newText } : w));
    }
    setWebsite(newWebsites); // Trigger save and update
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Input field */}
      <div className="border-bg-light border-2 animate-fade-in flex flex-col h-fit overflow-hidden">
        <div className="w-full flex flex-row gap-2 shrink-0">
          <div className="w-full text-text border-b-2 border-bg-light transition-all duration-200">
            <input
              type="text"
              placeholder="Enter a website (e.g. youtube.com)"
              className="w-full p-2 focus:outline-none focus:bg-primary hover:bg-primary-dark transition-all duration-200"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addWebsite()}
            />
          </div>
        </div>

        {/* List of websites */}
        <div className="overflow-y-auto divide-y-2 divide-bg-light h-full">
          {website.length === 0 && (
            <p className="flex justify-center w-full text-text text-lg font-bold mt-4">No websites yet</p>
          )}
          {website.map((site, index) => (
            <span
              style={{ "--delay": `${index * 50}ms` } as React.CSSProperties}
              className="animate-fade-up transition-all duration-200 animate-stagger justify-between items-center flex hover:bg-primary-dark text-text focus-within:bg-primary focus-within:hover:bg-primary"
            >
              <input
                key={site.id}
                type="text"
                value={site.text}
                onChange={(e) => updateRemove(site.id, e.target.value)}
                className="w-full p-2 bg-transparent focus:outline-none"
              />
            </span>
          ))}
        </div>
      </div>
      {isAlert && (
        <div className="bg-primary text-text w-[95%] border-2 border-secondary shadow-lg shadow-secondary/50 p-1 flex justify-center absolute bottom-4 left-1/2 -translate-x-1/2 rounded animate-shake-fade">
          {isAlert}
        </div>
      )}
    </div>
  );
}
