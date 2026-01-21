import { createRoot } from "react-dom/client";
import OverlayManager from "./components/OverlayManager";
import tailwindStyles from "./index.css?inline";

console.log("Distraction blocker content script loaded");

function initializeExtension() {
  const container = document.createElement("div");
  container.id = "distraction-blocker-extension-root";

  const shadowRoot = container.attachShadow({ mode: "open" });

  const styleElement = document.createElement("style");
  styleElement.textContent = tailwindStyles;
  shadowRoot.appendChild(styleElement);

  const shadowContainer = document.createElement("div");
  shadowContainer.style.width = "100%";
  shadowContainer.style.height = "100%";
  shadowRoot.appendChild(shadowContainer);

  const initializeTheme = async () => {
    try {
      const { theme = "default-dark" } = await chrome.storage.sync.get(["theme"]);
      shadowContainer.setAttribute("data-theme", theme as string);

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "sync" && changes.theme) {
          shadowContainer.setAttribute("data-theme", changes.theme.newValue as string);
        }
      });

      document.body.appendChild(container);
      const root = createRoot(shadowContainer);
      root.render(<OverlayManager />);
    } catch (error) {
      console.error("[Theme Error]:", error);
    }
  };

  initializeTheme();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeExtension);
} else {
  initializeExtension();
}
