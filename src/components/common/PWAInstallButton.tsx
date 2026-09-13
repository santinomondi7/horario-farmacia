import React, { useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        id="btn-pwa-install"
        onClick={install}
        className={`flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-medium shadow-sm transition-all ${
          compact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-xs md:text-sm'
        }`}
        title="Instalar como App en el dispositivo"
      >
        <Download className="w-4 h-4" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          id="btn-pwa-install-ios"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-950/40 hover:bg-teal-900/60 text-teal-200 font-medium active:scale-95 transition-all ${
            compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'
          }`}
          title="Instalar en iPhone o iPad"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar en iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 relative">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
                aria-label="Cerrar guía"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center shadow-md">
                  <img src="/icon.svg" alt="Mondino" className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Instalar Mondino</h3>
                  <p className="text-xs text-slate-400">En tu iPhone o iPad</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                  <div className="p-1.5 rounded-md bg-slate-700 text-teal-400 mt-0.5">
                    <Share className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Paso 1:</span> Toca el botón <strong>Compartir</strong> en la barra inferior de Safari.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                  <div className="p-1.5 rounded-md bg-slate-700 text-teal-400 mt-0.5">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Paso 2:</span> Desplaza hacia abajo y selecciona <strong>Agregar al inicio</strong>.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-teal-600 hover:bg-teal-500 py-2.5 text-sm font-semibold text-white shadow transition"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
