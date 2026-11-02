import React, { useState } from 'react';
import { AdminBooking } from './AdminDashboard';
import { Badge } from '../common/Badge';
import { Phone, User, Check, Play, X, ArrowsClockwise, CheckCircle } from '@phosphor-icons/react';

interface BoxTimelineProps {
  bookings: AdminBooking[];
  onStatusChange: (id: string, status: AdminBooking['status']) => void;
  onMoveBooking?: (id: string, newBoxName: string, newStartTime: string) => void;
  boxesCount?: number;
}

export const BoxTimeline: React.FC<BoxTimelineProps> = ({
  bookings,
  onStatusChange,
  onMoveBooking,
  boxesCount = 3,
}) => {
  const boxes = Array.from({ length: boxesCount }).map((_, i) => `Бокс ${i + 1}`);
  const [movingBookingId, setMovingBookingId] = useState<string | null>(null);
  const [targetBox, setTargetBox] = useState<string>('Бокс 1');
  const [targetTime, setTargetTime] = useState<string>('12:00');

  const getStatusBadge = (status: string) => {
    const s = String(status || '').toLowerCase().trim();
    if (s === 'in_progress' || s.includes('моется') || s.includes('в работе')) {
      return <Badge variant="blue">Моется</Badge>;
    }
    if (s === 'completed' || s.includes('готов')) {
      return <Badge variant="success">Готова</Badge>;
    }
    if (s === 'done' || s.includes('завершен')) {
      return <Badge variant="neutral">Завершена</Badge>;
    }
    if (s === 'cancelled' || s.includes('отмен')) {
      return <Badge variant="danger">Отменена</Badge>;
    }
    return <Badge variant="warning">Ожидает</Badge>;
  };

  const handleOpenMove = (b: AdminBooking) => {
    setMovingBookingId(b.id);
    setTargetBox(b.box_name);
    setTargetTime(b.start_time);
  };

  const handleApplyMove = () => {
    if (movingBookingId && onMoveBooking) {
      onMoveBooking(movingBookingId, targetBox, targetTime);
      setMovingBookingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
          Таймлайн боксов
        </h2>
        <span className="text-[11px] font-mono text-text-secondary">
          3 поста • буфер 10 мин
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {boxes.map((boxName, boxIdx) => {
          const targetNum = String(boxIdx + 1);
          const boxBookings = bookings.filter((b) => {
            if (b.status === 'done' || b.status === 'cancelled') return false;
            const raw = String(b.box_name || b.box_id || '').trim();
            if (raw === boxName) return true;
            if (raw === targetNum) return true;
            const digits = raw.match(/\d+/);
            if (digits && digits[0] === targetNum) return true;
            if (!raw && boxIdx === 0) return true;
            return false;
          });

          return (
            <div
              key={boxName}
              className="astryx-card p-4 flex flex-col min-w-0"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
                <span className="font-semibold text-sm text-text-primary tracking-tight">
                  {boxName}
                </span>
                <span className="text-[11px] font-mono text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded border border-accent-blue/20">
                  {boxBookings.length}
                </span>
              </div>

              {boxBookings.length === 0 ? (
                <div className="py-10 text-center text-xs text-text-tertiary font-mono border border-dashed border-white/5 rounded-xl">
                  Свободен
                </div>
              ) : (
                <div className="space-y-3 flex-1">
                  {boxBookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-xl bg-base-surface border border-white/5 space-y-2"
                    >
                      {/* Time + Date + Status */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono font-bold text-accent-blue tabular-nums whitespace-nowrap">
                            {b.start_time} — {b.end_time}
                          </span>
                          {b.date && b.date !== 'Сегодня' && (
                            <span className="text-[10px] font-mono text-text-tertiary bg-white/[0.06] px-1.5 py-0.5 rounded">
                              {b.date}
                            </span>
                          )}
                        </div>
                        {getStatusBadge(b.status)}
                      </div>

                      {/* Car + Service */}
                      <div className="min-w-0">
                        <span className="block text-sm font-bold text-text-primary leading-tight truncate">
                          {b.car_model}
                        </span>
                        <span className="block text-xs text-text-secondary truncate mt-0.5">
                          {b.service_title}
                        </span>
                      </div>

                      {/* Client contacts */}
                      <div className="text-[11px] font-mono text-text-tertiary space-y-0.5 pt-1.5 border-t border-white/5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <User size={12} className="shrink-0" />
                          <span className="truncate">{b.client_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Phone size={12} className="shrink-0" />
                          <span className="truncate">{b.client_phone}</span>
                        </div>
                      </div>

                      {/* Action buttons: Status transition + Move slot */}
                      <div className="pt-2 flex flex-col gap-1.5 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          {b.status === 'pending' && (
                            <>
                              <button
                                onClick={() => onStatusChange(b.id, 'in_progress')}
                                className="flex-1 py-1.5 px-2.5 rounded-xl bg-accent-blue text-white text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-accent-blue-hover active:scale-[0.97] transition-all"
                              >
                                <Play size={12} weight="fill" /> Моется
                              </button>
                              <button
                                onClick={() => onStatusChange(b.id, 'cancelled')}
                                className="py-1.5 px-2.5 rounded-xl bg-base-darkest text-text-tertiary text-xs font-medium flex items-center justify-center gap-1 hover:text-rose-400 active:scale-[0.97] transition-all border border-white/5"
                                title="Отменить запись"
                              >
                                <X size={12} />
                              </button>
                            </>
                          )}
                          {b.status === 'in_progress' && (
                            <button
                              onClick={() => onStatusChange(b.id, 'completed')}
                              className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-600 text-white text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-emerald-500 active:scale-[0.97] transition-all"
                            >
                              <Check size={12} weight="bold" /> Готова к выдаче
                            </button>
                          )}
                          {b.status === 'completed' && (
                            <button
                              onClick={() => onStatusChange(b.id, 'done')}
                              className="flex-1 py-1.5 px-2.5 rounded-xl bg-base-darkest text-emerald-400 border border-emerald-500/30 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-emerald-950/20 active:scale-[0.97] transition-all"
                            >
                              <CheckCircle size={13} weight="fill" /> Завершить
                            </button>
                          )}
                          {b.status === 'done' && (
                            <span className="text-[11px] font-mono text-text-tertiary text-center w-full py-0.5">
                              ✓ Завершена (выдана)
                            </span>
                          )}
                          {b.status === 'cancelled' && (
                            <span className="text-[11px] font-mono text-rose-400/70 text-center w-full py-0.5">
                              Отменена
                            </span>
                          )}
                        </div>

                        {/* Move slot button (if not cancelled or done) */}
                        {b.status !== 'cancelled' && b.status !== 'done' && (
                          <button
                            onClick={() => handleOpenMove(b)}
                            className="w-full py-1 rounded-lg text-[11px] font-mono text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors flex items-center justify-center gap-1"
                          >
                            <ArrowsClockwise size={12} /> Перенести слот
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Relocation Modal */}
      {movingBookingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setMovingBookingId(null); }}
        >
          <div className="astryx-card w-full max-w-sm bg-base-elevated border border-white/10 p-5 rounded-2xl shadow-car-lacquer">
            <h3 className="text-sm font-bold text-text-primary mb-3">
              Перенос записи
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono text-text-secondary uppercase mb-1">
                  Новый бокс
                </label>
                <select
                  value={targetBox}
                  onChange={(e) => setTargetBox(e.target.value)}
                  className="w-full bg-base-surface border border-base-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                >
                  <option value="Бокс 1">Бокс 1</option>
                  <option value="Бокс 2">Бокс 2</option>
                  <option value="Бокс 3">Бокс 3</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-text-secondary uppercase mb-1">
                  Новое время
                </label>
                <input
                  type="time"
                  value={targetTime}
                  onChange={(e) => setTargetTime(e.target.value)}
                  className="w-full bg-base-surface border border-base-border rounded-xl px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-blue"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMovingBookingId(null)}
                  className="flex-1 py-2 rounded-xl border border-base-border text-xs text-text-secondary hover:text-text-primary"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleApplyMove}
                  className="flex-1 py-2 rounded-xl bg-accent-blue text-white text-xs font-semibold hover:bg-accent-blue-hover"
                >
                  Применить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
