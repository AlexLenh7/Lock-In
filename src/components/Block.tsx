import { useRef, useState } from "react";
import { IoClose } from "react-icons/io5";

interface BlockProp {
  onClose: () => void;
}
export default function Block({ onClose }: BlockProp) {
  const holdTime = 5000;
  const timerRef = useRef<number>(null);
  const [isHolding, setIsHolding] = useState(false);

  const startHold = () => {
    setIsHolding(true);
    // useRef to remember the timer state
    timerRef.current = setTimeout(() => {
      onClose();
      setIsHolding(false);
    }, holdTime);
  };

  const endHold = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current ?? undefined);
      setIsHolding(false);
    }
  };

  return (
    <div className="w-full h-full inset-0 flex justify-center items-start">
      <div className="bg-background rounded-lg p-4 mt-4 w-30vw max-w-125 h-auto flex justify-center flex-col border-block border-solid border-2 relative">
        <span className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 flex size-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-block opacity-75"></span>
          <span className="relative inline-flex size-4 rounded-full bg-block"></span>
        </span>
        <div className="p-8 flex justify-center flex-col">
          <div className="flex flex-row mb-4 justify-center">
            <span className="text-4xl font-Lexend font-bold text-text justify-center items-center flex">
              🔒 Lock Back In
            </span>
          </div>
          <p className="text-lg text-text justify-center flex">You've reached your time limit for today.</p>
          <p className="text-md text-secondary-text mt-4 justify-center flex">Stay focused and come back tomorrow!</p>
          <div className="flex justify-center w-full items-center mt-4">
            <div className="relative flex w-fit border-2 border-secondary-text overflow-hidden transition-all duration-300 hover:border-block">
              <div
                className="absolute top-0 left-0 pointer-events-none transition-all duration-300 h-full bg-block/40"
                style={{
                  width: isHolding ? "100%" : "0%",
                  transition: isHolding ? `width ${holdTime}ms linear` : `none`,
                }}
              />
              <button
                onMouseDown={startHold}
                onMouseLeave={endHold}
                onMouseUp={endHold}
                className="z-10 text-xs p-1 flex flex-row justify-center items-center text-secondary-text hover:text-block cursor-pointer transition-all duration-300"
              >
                <IoClose className="size-4 mr-1" />
                <span className="flex items-center justify-center">I understand and wish to continue</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
