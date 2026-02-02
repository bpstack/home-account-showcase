"use client";

import { useEffect, useState } from "react";

export default function UpdateNotification() {
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = () => {
      setShowUpdateNotification(true);
    };

    window.addEventListener("swUpdateAvailable", handleUpdateAvailable);

    return () => {
      window.removeEventListener("swUpdateAvailable", handleUpdateAvailable);
    };
  }, []);

  const handleUpdate = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      });
    }
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowUpdateNotification(false);
  };

  if (!showUpdateNotification) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`
          bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 rounded-lg shadow-2xl
          transition-all duration-300 cursor-pointer
          ${isHovered ? "scale-105 shadow-amber-500/25" : ""}
        `}
        onClick={handleUpdate}
      >
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <span className="text-sm font-medium">Nueva versión disponible</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUpdate();
            }}
            className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded text-sm font-medium transition-colors"
          >
            Actualizar
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            className="text-white/70 hover:text-white ml-1"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
