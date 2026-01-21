import { IoClose } from "react-icons/io5";

interface WarnProp {
  onClose: () => void;
}

export default function Warn({ onClose }: WarnProp) {
  return (
    <div className="w-full h-full inset-0 flex justify-end items-start">
      <div className="bg-(--brand-bg) rounded-lg p-4 mt-4 mr-8 w-30vw max-w-125 h-auto flex justify-center flex-col border-(--brand-text) border-solid border-2 relative pointer-events-auto">
        <span className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 flex size-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-(--brand-text) opacity-75"></span>
          <span className="relative inline-flex size-4 rounded-full bg-(--brand-text)"></span>
        </span>
        <div className="p-8 flex justify-center flex-col">
          <div className="flex flex-row mb-4 justify-center">
            <span className="text-4xl font-Lexend font-bold text-(--brand-text) justify-center items-center flex">
              ⚠️ Warning to Lock In
            </span>
          </div>
          <p className="text-lg text-(--brand-sub-text) justify-center flex">
            You've reached your time limit for today.
          </p>
          <p className="text-md text-(--brand-sub-text) mt-4 justify-center flex">
            Stay focused and come back tomorrow!
          </p>
          <div className="flex justify-center w-full items-center mt-4">
            <button
              onClick={onClose}
              className="text-xs flex flex-row justify-center items-center text-(--brand-sub-text) hover:text-(--brand-secondary) cursor-pointer transition-all duration-300"
            >
              <IoClose className="size-4 mr-1" />
              <span className="flex items-center justify-center">I understand and wish to continue</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
