import React, { useEffect, useRef, useState } from 'react';
import { X, Share2, Download, Copy, Check, MessageSquare, AlertCircle } from 'lucide-react';
import { Week, Employee, Shift, DAYS_OF_WEEK } from '../../types';
import { formatDateSpanish, formatShiftsForDay } from '../../utils/timeCalculations';

interface WhatsAppExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  week: Week;
  employees: Employee[];
  shifts: Shift[];
}

export const WhatsAppExportModal: React.FC<WhatsAppExportModalProps> = ({
  isOpen,
  onClose,
  week,
  employees,
  shifts,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Render image to canvas
    const renderCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const scale = 2; // Retina sharpness
      const width = 1100;
      const rowHeight = 70;
      const headerHeight = 160;
      const colHeaderHeight = 50;
      const footerHeight = 70;
      const totalHeight = headerHeight + colHeaderHeight + employees.length * rowHeight + footerHeight;

      canvas.width = width * scale;
      canvas.height = totalHeight * scale;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${totalHeight}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(scale, scale);

      // Background
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, 0, width, totalHeight);

      // Header Banner Gradient
      const grad = ctx.createLinearGradient(0, 0, width, headerHeight);
      grad.addColorStop(0, '#064e3b'); // emerald-900
      grad.addColorStop(0.5, '#0f766e'); // teal-700
      grad.addColorStop(1, '#115e59'); // teal-800
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, headerHeight);

      // Decorative accent line
      ctx.fillStyle = '#10b981'; // emerald-500
      ctx.fillRect(0, headerHeight - 4, width, 4);

      // Brand Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Mondino Farmacia y Perfumería', 48, 65);

      // Subtitle
      ctx.fillStyle = '#a7f3d0'; // emerald-200
      ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const startFormatted = formatDateSpanish(week.startDate);
      const endFormatted = formatDateSpanish(week.endDate);
      ctx.fillText(`Horarios — Semana del ${startFormatted} al ${endFormatted}`, 48, 105);

      // Group badge
      ctx.fillStyle = '#065f46';
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5;
      const badgeText = '📌 Grupo: Horarios Mondino';
      ctx.beginPath();
      ctx.roundRect(48, 118, 230, 26, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ecfdf5';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(badgeText, 58, 136);

      // Official Pharmacy Logo in Header
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = '/logo.png';
      const drawLogoOnCanvas = () => {
        try {
          const logoSize = 104;
          const logoX = width - 48 - logoSize;
          const logoY = 28;
          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(logoX, logoY, logoSize, logoSize, 18);
          ctx.fill();
          ctx.drawImage(logoImg, logoX + 6, logoY + 6, logoSize - 12, logoSize - 12);
          ctx.restore();
        } catch {
          // ignore
        }
      };
      if (logoImg.complete) {
        drawLogoOnCanvas();
      } else {
        logoImg.onload = () => {
          drawLogoOnCanvas();
          canvas.toBlob(blob => {
            if (blob) {
              setImageBlob(blob);
              setImageUrl(URL.createObjectURL(blob));
            }
          }, 'image/png');
        };
      }

      // Table layout calculations
      const startY = headerHeight;
      const empColWidth = 190;
      const dayColWidth = (width - empColWidth - 48 * 2) / 7;

      // Column Headers Background
      ctx.fillStyle = '#1e293b'; // slate-800
      ctx.fillRect(48, startY, width - 96, colHeaderHeight);

      // Column Headers Text
      ctx.fillStyle = '#94a3b8'; // slate-400
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('EMPLEADO', 60, startY + 31);

      DAYS_OF_WEEK.forEach((day, index) => {
        const x = 48 + empColWidth + index * dayColWidth;
        // Divider line
        ctx.fillStyle = '#334155';
        ctx.fillRect(x, startY, 1, colHeaderHeight);

        ctx.fillStyle = day.id === 'sun' ? '#fbbf24' : '#e2e8f0';
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const label = `${day.name.toUpperCase()}${day.id === 'sun' ? ' *' : ''}`;
        ctx.fillText(label, x + 12, startY + 31);
      });

      // Employee Rows
      let currentY = startY + colHeaderHeight;

      employees.forEach((emp, rIdx) => {
        // Row background
        ctx.fillStyle = rIdx % 2 === 0 ? '#1e293b' : '#0f172a';
        ctx.fillRect(48, currentY, width - 96, rowHeight);

        // Subtle bottom border
        ctx.fillStyle = '#334155';
        ctx.fillRect(48, currentY + rowHeight - 1, width - 96, 1);

        // Employee Avatar dot and Name
        ctx.fillStyle = emp.avatarColor || '#0d9488';
        ctx.beginPath();
        ctx.arc(65, currentY + rowHeight / 2, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(emp.name, 82, currentY + rowHeight / 2 + 5);

        // Shifts per day
        DAYS_OF_WEEK.forEach((day, cIdx) => {
          const x = 48 + empColWidth + cIdx * dayColWidth;

          // Vertical grid line
          ctx.fillStyle = '#334155';
          ctx.fillRect(x, currentY, 1, rowHeight);

          const dayShifts = shifts.filter(s => s.employeeId === emp.id && s.dayOfWeek === day.id);
          const shiftText = formatShiftsForDay(dayShifts);

          const isFranco = shiftText === 'Franco';
          const isSinTurno = shiftText === 'Sin turno';

          // Shift Pill background
          const pillX = x + 8;
          const pillY = currentY + 14;
          const pillW = dayColWidth - 16;
          const pillH = rowHeight - 28;

          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, 8);

          if (isFranco) {
            ctx.fillStyle = '#334155'; // slate-700
            ctx.fill();
            ctx.fillStyle = '#cbd5e1'; // slate-300
            ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText('Franco', pillX + (pillW - ctx.measureText('Franco').width) / 2, pillY + 26);
          } else if (isSinTurno) {
            ctx.fillStyle = '#1e293b';
            ctx.fill();
            ctx.fillStyle = '#64748b';
            ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText('—', pillX + (pillW - ctx.measureText('—').width) / 2, pillY + 26);
          } else {
            // Normal shift pill
            ctx.fillStyle = '#0d9488'; // teal-600
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

            // If split shift (contains '/')
            if (shiftText.includes('/')) {
              const parts = shiftText.split('/').map(p => p.trim());
              ctx.fillText(parts[0], pillX + (pillW - ctx.measureText(parts[0]).width) / 2, pillY + 18);
              if (parts[1]) {
                ctx.fillText(parts[1], pillX + (pillW - ctx.measureText(parts[1]).width) / 2, pillY + 34);
              }
            } else {
              ctx.fillText(shiftText, pillX + (pillW - ctx.measureText(shiftText).width) / 2, pillY + 27);
            }
          }
        });

        currentY += rowHeight;
      });

      // Footer Notes
      ctx.fillStyle = '#64748b';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(
        '* Domingo de apertura: 10:00 a 14:00 y 17:00 a 22:00. Lunes a sábado: 09:00 a 23:00.',
        48,
        totalHeight - 32
      );

      // Convert to blob and data URL
      canvas.toBlob(blob => {
        if (blob) {
          setImageBlob(blob);
          setImageUrl(URL.createObjectURL(blob));
        }
      }, 'image/png');
    };

    const timer = setTimeout(renderCanvas, 80);
    return () => clearTimeout(timer);
  }, [isOpen, week, employees, shifts]);

  const handleShareToWhatsApp = async () => {
    setErrorMsg(null);
    setSharing(true);

    try {
      const shareTitle = `Mondino - Horarios Semana ${week.id}`;
      const shareText = `*Mondino Farmacia y Perfumería*\nHorarios — Semana del ${formatDateSpanish(week.startDate)} al ${formatDateSpanish(week.endDate)}\nGrupo: Horarios Mondino`;

      // Check if navigator.canShare supports files
      if (imageBlob && navigator.canShare && navigator.canShare({ files: [new File([imageBlob], 'horarios-mondino.png', { type: 'image/png' })] })) {
        const file = new File([imageBlob], `horarios-mondino-${week.id}.png`, { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: shareTitle,
          text: shareText,
        });
      } else if (navigator.share) {
        // Fallback share without file
        await navigator.share({
          title: shareTitle,
          text: shareText,
        });
      } else {
        // Direct WhatsApp Web / App link fallback
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n(Descargá la imagen adjunta en la aplicación)`)}`;
        window.open(waUrl, '_blank');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share error:', err);
        setErrorMsg('El navegador no completó el envío directo. Puedes descargar la imagen o copiar el texto.');
      }
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `horarios-mondino-${week.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyImage = async () => {
    if (!imageBlob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': imageBlob,
        }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Copy image failed', err);
      handleDownload();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-whatsapp-export"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto animate-in fade-in"
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-0.5 shadow border border-teal-500/30 overflow-hidden shrink-0">
              <img
                src="/logo.png"
                alt="Logo Mondino"
                className="w-full h-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Compartir por WhatsApp</h3>
              <p className="text-xs text-slate-400">Grupo: <strong>Horarios Mondino</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div className="text-xs text-emerald-300 bg-emerald-950/50 border border-emerald-800/60 rounded-xl p-3 flex items-start gap-2.5">
            <span className="text-emerald-400 font-bold">✓</span>
            <div className="space-y-0.5">
              <p className="font-semibold text-emerald-200">Imagen profesional sin datos privados</p>
              <p className="text-emerald-300/80">
                La imagen generada incluye únicamente los turnos y el estado "Franco". Los precios por hora y sueldos están estrictamente excluidos.
              </p>
            </div>
          </div>

          {/* Canvas & Image Preview */}
          <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-2 overflow-hidden flex flex-col items-center justify-center min-h-[180px]">
            <canvas ref={canvasRef} className="hidden" />
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Horarios Semanales Mondino"
                className="w-full h-auto max-h-[300px] object-contain rounded-lg shadow-md border border-slate-800"
              />
            ) : (
              <div className="py-12 flex flex-col items-center gap-2 text-slate-400 text-sm">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                <span>Generando imagen de horarios...</span>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/60 rounded-lg p-2.5 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <button
              id="btn-share-whatsapp-action"
              onClick={handleShareToWhatsApp}
              disabled={!imageUrl || sharing}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-semibold py-3 px-4 shadow-lg shadow-emerald-950/50 text-sm transition disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              <span>{sharing ? 'Abriendo...' : 'Compartir imagen'}</span>
            </button>

            <button
              id="btn-download-image-action"
              onClick={handleDownload}
              disabled={!imageUrl}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-200 font-medium py-3 px-4 border border-slate-700 text-sm transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Descargar PNG</span>
            </button>

            <button
              id="btn-copy-image-action"
              onClick={handleCopyImage}
              disabled={!imageUrl}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-200 font-medium py-3 px-4 border border-slate-700 text-sm transition disabled:opacity-50"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiada' : 'Copiar imagen'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Semana {week.id} • Mondino Farmacia y Perfumería</span>
          <button onClick={onClose} className="hover:text-white transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
