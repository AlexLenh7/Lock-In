import { useState } from "react";

export type Website = { id: string; text: string };

interface Props {
  website: Website[];
  setWebsite: (newWebsites: Website[]) => void;
}

export default function Websites({ website, setWebsite }: Props) {
  // specify type for website to create the array

  const [text, setText] = useState<string>("");

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
    <div className="w-full h-fit flex flex-col mt-4">
      {/* Input field */}
      <div className="border-bg-light border-2">
        <div className="w-full flex flex-row gap-2">
          <div className="w-full text-text border-b-2 border-bg-light">
            <input
              type="text"
              placeholder="Enter a website (e.g. youtube.com)"
              className="w-full p-2 focus:outline-none focus:bg-primary hover:bg-primary-dark transition-all duration-300"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addWebsite()}
            />
          </div>
        </div>

        {/* List of websites */}
        <div className="overflow-y-auto max-h-50 divide-y-2 divide-bg-light">
          {website.length === 0 && (
            <p className="flex justify-center w-full text-text text-lg font-bold mt-4">No websites yet</p>
          )}
          {website.map((site) => (
            <input
              key={site.id}
              type="text"
              value={site.text}
              onChange={(e) => updateRemove(site.id, e.target.value)}
              className="w-full p-2 bg-transparent text-text focus:bg-primary focus:outline-none hover:bg-primary-dark transition-all duration-300"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
