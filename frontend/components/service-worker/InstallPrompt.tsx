"use client";

import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
  getInstalledRelatedApps?: () => Promise<{ platform: string; url?: string; id?: string }[]>;
}

interface WindowWithMSStream extends Window {
  MSStream?: unknown;
}

const STORAGE_KEY_DISMISSED = "home-account-install-prompt-dismissed";
const STORAGE_KEY_IOS_SHOWN = "home-account-ios-instructions-shown";
const STORAGE_KEY_INSTALLED = "home-account-already-installed";

function isRunningAsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if ((window.navigator as NavigatorWithStandalone).standalone === true) return true;
  if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  return false;
}

function isIOSDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const notMSStream = !(window as WindowWithMSStream).MSStream;
  return isIOS && notMSStream;
}

async function checkInstalledRelatedApps(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as NavigatorWithStandalone;
  if (!nav.getInstalledRelatedApps) return false;

  try {
    const relatedApps = await nav.getInstalledRelatedApps();
    return relatedApps.length > 0;
  } catch {
    return false;
  }
}

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(true); // Start true to prevent flash

  const isIOS = isIOSDevice();

  const checkInstallationStatus = useCallback(async () => {
    // If running as standalone app, it's definitely installed
    if (isRunningAsStandalone()) {
      localStorage.setItem(STORAGE_KEY_INSTALLED, "true");
      return true;
    }

    // Check localStorage for previous installation
    if (localStorage.getItem(STORAGE_KEY_INSTALLED) === "true") {
      return true;
    }

    // Use getInstalledRelatedApps API if available (Chrome/Edge)
    const hasRelatedApp = await checkInstalledRelatedApps();
    if (hasRelatedApp) {
      localStorage.setItem(STORAGE_KEY_INSTALLED, "true");
      return true;
    }

    return false;
  }, []);

  /* -------- initial check -------- */
  useEffect(() => {
    const init = async () => {
      const installed = await checkInstallationStatus();
      setIsInstalled(installed);

      if (installed) {
        setShowPrompt(false);
        return;
      }

      // Check if user previously dismissed the prompt
      const dismissed = localStorage.getItem(STORAGE_KEY_DISMISSED);
      if (dismissed && !isIOS) {
        setShowPrompt(false);
        return;
      }

      // For iOS, show after delay; for others, wait for beforeinstallprompt
      if (isIOS) {
        const iosShown = localStorage.getItem(STORAGE_KEY_IOS_SHOWN);
        if (!iosShown) {
          setTimeout(() => setShowPrompt(true), 3000);
        }
      }
    };

    init();
  }, [isIOS, checkInstallationStatus]);

  useEffect(() => {
    if (isIOS || isInstalled) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Only show if not dismissed and not installed
      const dismissed = localStorage.getItem(STORAGE_KEY_DISMISSED);
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      localStorage.setItem(STORAGE_KEY_INSTALLED, "true");
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        localStorage.setItem(STORAGE_KEY_INSTALLED, "true");
        setIsInstalled(true);
        setShowPrompt(false);
      }
    };

    if (mediaQuery.matches) {
      localStorage.setItem(STORAGE_KEY_INSTALLED, "true");
      setIsInstalled(true);
      setShowPrompt(false);
    }

    mediaQuery.addEventListener("change", handleMediaChange);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, [isIOS, isInstalled]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      localStorage.setItem(STORAGE_KEY_IOS_SHOWN, "true");
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      localStorage.setItem(STORAGE_KEY_INSTALLED, "true");
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleClose = () => {
    if (isIOS) {
      setShowIOSInstructions(false);
      localStorage.setItem(STORAGE_KEY_IOS_SHOWN, "true");
    } else {
      // Save dismissal for non-iOS so prompt doesn't reappear
      localStorage.setItem(STORAGE_KEY_DISMISSED, "true");
    }
    setShowPrompt(false);
  };

  // Don't render anything if installed
  if (isInstalled) {
    return null;
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-6 left-6 z-50">
        <button
          onClick={handleInstallClick}
          className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-full shadow-2xl hover:scale-105 transition-all flex items-center gap-2 text-sm font-medium"
          aria-label="Instalar aplicación"
        >
          <span>📲</span>
          <span>Instalar App</span>
        </button>

        <button
          onClick={handleClose}
          className="absolute -top-2 -right-2 bg-white/80 dark:bg-gray-800/80 rounded-full p-1 shadow"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      {showIOSInstructions && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={handleClose}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Instalar en iOS
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Para instalar esta app en tu iPhone/iPad:
            </p>

            <ol className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 flex items-center justify-center text-xs font-semibold">
                  1
                </span>
                <span className="pt-0.5">
                  Pulsa el botón <strong style={{color: '#007AFF'}}>⬆️ Compartir</strong> en la barra inferior de Safari
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 flex items-center justify-center text-xs font-semibold">
                  2
                </span>
                <span className="pt-0.5">
                  Desplázate hacia abajo y toca <strong>&quot;Añadir a pantalla de inicio&quot;</strong>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 flex items-center justify-center text-xs font-semibold">
                  3
                </span>
                <span className="pt-0.5">
                  Pulsa <strong>&quot;Añadir&quot;</strong> arriba a la derecha
                </span>
              </li>
            </ol>

            <button
              onClick={handleClose}
              className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
