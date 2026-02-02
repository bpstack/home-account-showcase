"use client";

import { useEffect, useState } from "react";

export default function UpdateNotification() {
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);

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
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowUpdateNotification(false);
  };

  if (!showUpdateNotification) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 rounded-lg shadow-2xl animate-slide-up">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Nueva versión disponible</span>
        <button
          onClick={handleUpdate}
          className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded text-sm font-medium transition-colors"
        >
          Actualizar
        </button>
        <button
          onClick={handleDismiss}
          className="text-white/70 hover:text-white"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
