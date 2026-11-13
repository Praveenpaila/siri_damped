import React, { useEffect, useRef, useState } from 'react';
import { LineChart, Orbit, Flame, Activity } from 'lucide-react';

export default function LiveCharts({ physics, liveMetrics, fluid }) {
  const [activeTab, setActiveTab] = useState('displacement'); // 'displacement', 'phase', 'energy'
  const canvasRef = useRef(null);

  // Render canvas charts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !physics?.points || physics.points.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(1, '#070a12');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Padding
    const padX = 55;
    const padY = 35;
    const plotW = width - padX - 25;
    const plotH = height - padY * 2;

    // Draw Grid Lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let i = 0; i <= 5; i++) {
      const y = padY + (i / 5) * plotH;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(width - 25, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 6; i++) {
      const x = padX + (i / 6) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, padY);
      ctx.lineTo(x, height - padY);
      ctx.stroke();
    }
    ctx.setLineDash([]); // Reset line dash

    const points = physics.points;
    const maxT = points[points.length - 1].t || 10;

    // TAB 1: Displacement vs Time x(t)
    if (activeTab === 'displacement') {
      // Find max amplitude
      const maxX = Math.max(1, ...points.map(p => Math.abs(p.x)));
      const scaleY = (plotH / 2) / (maxX * 1.15);
      const centerY = padY + plotH / 2;

      // Axis labels
      ctx.fillStyle = '#64748b';
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText(`+${maxX.toFixed(1)}cm`, padX - 8, padY + 12);
      ctx.fillText('0 cm', padX - 8, centerY + 4);
      ctx.fillText(`-${maxX.toFixed(1)}cm`, padX - 8, padY + plotH);

      ctx.textAlign = 'center';
      ctx.fillText('0s', padX, height - 12);
      ctx.fillText(`${(maxT / 2).toFixed(1)}s`, padX + plotW / 2, height - 12);
      ctx.fillText(`${maxT.toFixed(1)}s`, width - 25, height - 12);

      // Draw Center Equilibrium Axis (0 cm)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padX, centerY);
      ctx.lineTo(width - 25, centerY);
      ctx.stroke();

      // Draw Upper and Lower Exponential Decay Envelopes
      if (physics.regime === 'underdamped') {
        // Upper Envelope (+x0 * e^-gamma*t)
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        points.forEach((p, idx) => {
          if (p.upperEnvelope !== null) {
            const px = padX + (p.t / maxT) * plotW;
            const py = centerY - p.upperEnvelope * scaleY;
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
        });
        ctx.stroke();

        // Lower Envelope (-x0 * e^-gamma*t)
        ctx.beginPath();
        points.forEach((p, idx) => {
          if (p.lowerEnvelope !== null) {
            const px = padX + (p.t / maxT) * plotW;
            const py = centerY - p.lowerEnvelope * scaleY;
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Main Displacement Waveform x(t)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      points.forEach((p, idx) => {
        const px = padX + (p.t / maxT) * plotW;
        const py = centerY - p.x * scaleY;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.shadowBlur = 0; // reset glow

      // Draw Current Live Simulation Time Marker
      if (liveMetrics?.elapsedTime) {
        const liveT = liveMetrics.elapsedTime;
        if (liveT <= maxT) {
          const liveX = padX + (liveT / maxT) * plotW;
          const liveY = centerY - (liveMetrics.currentX || 0) * scaleY;

          // Vertical indicator line
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(liveX, padY);
          ctx.lineTo(liveX, height - padY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Pulse Dot
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(liveX, liveY, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } 
    // TAB 2: Phase Space Portrait (Velocity v vs Position x)
    else if (activeTab === 'phase') {
      const maxX = Math.max(1, ...points.map(p => Math.abs(p.x)));
      const maxV = Math.max(1, ...points.map(p => Math.abs(p.v)));
      const centerX = padX + plotW / 2;
      const centerY = padY + plotH / 2;
      const scaleX = (plotW / 2) / (maxX * 1.15);
      const scaleY = (plotH / 2) / (maxV * 1.15);

      // Axes
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padX, centerY);
      ctx.lineTo(width - 25, centerY);
      ctx.moveTo(centerX, padY);
      ctx.lineTo(centerX, height - padY);
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = '#64748b';
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('+X (cm)', width - 35, centerY - 8);
      ctx.fillText('+V (cm/s)', centerX + 35, padY + 15);

      // Trajectory curve (Inward spiral)
      const grad = ctx.createLinearGradient(padX, padY, width - 25, height - padY);
      grad.addColorStop(0, '#a855f7');
      grad.addColorStop(0.5, '#06b6d4');
      grad.addColorStop(1, '#10b981');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.2;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      points.forEach((p, idx) => {
        const px = centerX + p.x * scaleX;
        const py = centerY - p.v * scaleY;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Attractor center point (0,0)
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Live position marker on phase space
      if (liveMetrics) {
        const livePx = centerX + (liveMetrics.currentX || 0) * scaleX;
        const livePy = centerY - (liveMetrics.currentV || 0) * scaleY;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(livePx, livePy, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // TAB 3: Energy Dissipation (Kinetic, Potential, Dissipated Heat)
    else if (activeTab === 'energy') {
      const maxE = Math.max(0.001, ...points.map(p => p.kineticEnergy + p.potentialEnergy + p.dissipatedEnergy));
      const scaleY = plotH / (maxE * 1.1);

      // Labels
      ctx.fillStyle = '#64748b';
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText(`${maxE.toFixed(3)} J`, padX - 8, padY + 12);
      ctx.fillText('0 J', padX - 8, height - padY);

      // Draw Dissipated Thermal Energy (Red/Orange area)
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((p, idx) => {
        const px = padX + (p.t / maxT) * plotW;
        const py = height - padY - p.dissipatedEnergy * scaleY;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      // Draw Kinetic Energy (Cyan)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((p, idx) => {
        const px = padX + (p.t / maxT) * plotW;
        const py = height - padY - p.kineticEnergy * scaleY;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      // Draw Potential Energy (Emerald)
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((p, idx) => {
        const px = padX + (p.t / maxT) * plotW;
        const py = height - padY - p.potentialEnergy * scaleY;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
  }, [physics, liveMetrics, activeTab]);

  return (
    <div className="flex flex-col rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md overflow-hidden shadow-xl">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/70 border-b border-slate-800">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveTab('displacement')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'displacement'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Displacement x(t)</span>
          </button>

          <button
            onClick={() => setActiveTab('phase')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'phase'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Orbit className="w-3.5 h-3.5" />
            <span>Phase Space (v vs x)</span>
          </button>

          <button
            onClick={() => setActiveTab('energy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'energy'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Energy Dissipation</span>
          </button>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono">
          {activeTab === 'displacement' && (
            <>
              <div className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" />
                <span>x(t)</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-0.5 bg-amber-400 border-t border-dashed inline-block" />
                <span>±x₀e⁻ᵞᵗ</span>
              </div>
            </>
          )}
          {activeTab === 'phase' && (
            <div className="flex items-center gap-1.5 text-purple-400">
              <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
              <span>Attractor Spiral</span>
            </div>
          )}
          {activeTab === 'energy' && (
            <>
              <div className="flex items-center gap-1 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                <span>KE</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>PE</span>
              </div>
              <div className="flex items-center gap-1 text-orange-400">
                <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                <span>Heat</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="p-3">
        <canvas
          ref={canvasRef}
          width={720}
          height={260}
          className="w-full h-[220px] sm:h-[250px] rounded-xl border border-slate-800/80"
        />
      </div>
    </div>
  );
}

