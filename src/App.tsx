import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Websites from "./pages/Websites";

function App() {
  const [activeTab, setActiveTab] = useState("Dashboard");

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
      name: "Website",
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
          <div>
            <Dashboard />
          </div>
        );
      case "Website":
        return (
          <div>
            <Websites />
          </div>
        );
      case "Settings":
        return (
          <div>
            <Settings />
          </div>
        );
      default:
        return null;
    }
  };
  return (
    <div className="flex p-4 w-full h-full flex-col justify-start border items-center bg-background border-solid">
      <h1 className="text-text w-full flex justify-center text-xl">Lock In</h1>
      <nav className="w-full h-fit mt-4">
        <ul className="grid grid-cols-3 items-start w-full rounded-lg gap-2">
          {navItems.map((item) => (
            <li
              className={`flex justify-center items-center col-${
                item.key
              } cursor-pointer border-solid rounded-lg px-2 py-1 hover:bg-primary text-text transition-all duration-300 ${
                activeTab === item.name ? "bg-primary" : "hover:bg-primary"
              }`}
              onClick={() => setActiveTab(item.name)}
            >
              {item.icon}
              {item.name}
            </li>
          ))}
        </ul>
      </nav>
      <div className="w-full h-full">{renderContent()}</div>
    </div>
  );
}

export default App;
