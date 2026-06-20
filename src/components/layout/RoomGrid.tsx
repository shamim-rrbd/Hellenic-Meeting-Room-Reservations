import React from 'react';
import { Clock } from 'lucide-react';
import { Booking, Room } from '../../types';

interface RoomGridProps {
  rooms: Room[];
  bookings: Booking[];
  date: Date;
  onCellClick: (roomId: string, timeSlot: string) => void;
  onBookingClick?: (booking: Booking) => void;
}

const ROOM_HOURS = Array.from({ length: 16 }, (_, i) => {
  const hour = 9 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? '30' : '00';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

const SLOTS = [
    '09:30 - 10:00', '10:00 - 10:30', '10:30 - 11:00', '11:00 - 11:30', 
    '11:30 - 12:00', '12:00 - 12:30', '12:30 - 13:00', '13:00 - 13:30', 
    '13:30 - 14:00', '14:00 - 14:30', '14:30 - 15:00', '15:00 - 15:30', 
    '15:30 - 16:00', '16:00 - 16:30', '16:30 - 17:00', '17:00 - 17:30'
];

export function RoomGrid({ rooms, bookings, date, onCellClick, onBookingClick }: RoomGridProps) {
  
  const isSlotBooked = (roomId: string, slot: string) => {
    const [slotStart, slotEnd] = slot.split(' - ');
    return bookings.find(item => {
      if (item.room_id !== roomId) return false;
      if (item.status === 'rejected' || item.status === 'cancelled') return false;

      const toMinutes = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };

      const bStart = toMinutes(item.start_time);
      const bEnd = toMinutes(item.end_time);
      const sStart = toMinutes(slotStart);
      const sEnd = toMinutes(slotEnd);

      return bStart < sEnd && bEnd > sStart;
    });
  };

  const isBookingStartSlot = (booking: Booking, slot: string) => {
    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    // Find all slots that overlap with this booking
    const overlappingSlots = SLOTS.filter(s => {
      const [ss, se] = s.split(' - ');
      return toMinutes(booking.start_time) < toMinutes(se) && toMinutes(booking.end_time) > toMinutes(ss);
    });

    if (overlappingSlots.length === 0) return false;
    return overlappingSlots[0] === slot;
  };

  return (
    <div className="flex-grow flex flex-col h-full overflow-x-auto hide-scrollbar">
      <div className="flex flex-col h-full min-w-[700px] md:min-w-0">
        {/* ROOM HEADERS */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="w-24 border-r border-slate-200 flex items-center justify-center">
            <Clock className="size-4 text-slate-400" />
        </div>
        <div 
          className="flex-grow grid"
          style={{ gridTemplateColumns: `repeat(${rooms.length}, minmax(0, 1fr))` }}
        >
            {rooms.map((room) => (
                <div key={room.id} className="group relative py-3.5 text-center border-r border-slate-200 flex flex-col justify-center select-none cursor-help transition-colors hover:bg-slate-100">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-widest text-slate-800 truncate px-1">
                      {room.name}
                    </div>

                    {/* Styled Interactive Tooltip */}
                    <div className="pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-slate-900 text-white text-[10px] p-2.5 shadow-xl z-50 rounded-none text-left font-sans transition-all duration-150 border border-slate-800">
                      <div className="font-bold uppercase tracking-wider text-[10px] text-white border-b border-slate-800 pb-1 flex justify-between items-center">
                        <span>{room.name} Info</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-sm font-bold uppercase ${
                          room.status === 'Offline'
                            ? 'bg-rose-900 border border-rose-800 text-rose-200'
                            : room.status === 'Hybrid'
                            ? 'bg-indigo-950 border border-indigo-900 text-indigo-200'
                            : 'bg-emerald-950 border border-emerald-900 text-emerald-200'
                        }`}>{room.status || 'Online'}</span>
                      </div>
                      <div className="space-y-1.5 mt-2">
                        <div>
                          <span className="text-slate-500 font-bold uppercase text-[8px] tracking-wider block leading-none mb-0.5">Max Occupancy</span>
                          <span className="font-semibold text-xs text-white">{room.capacity || 8} Persons</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold uppercase text-[8px] tracking-wider block leading-none mb-0.5">Included Resources / Facilities</span>
                          <span className="font-medium text-[10px] text-slate-300 leading-normal block">
                            {room.facilities || 'Standard executive setup (Dual display/HDMI)'}
                          </span>
                        </div>
                      </div>
                      {/* Triangle Arrow */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full border-4 border-transparent border-b-slate-900"></div>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* TIMELINE GRID */}
      <div className="flex-grow flex overflow-y-auto hide-scrollbar">
        {/* Time Axis */}
        <div className="w-24 border-r border-slate-200 bg-white grid grid-rows-[repeat(16,minmax(0,1fr))] shrink-0">
          {SLOTS.map(slot => (
            <div key={slot} className="border-b border-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-bold px-1 text-center hover:bg-slate-50 transition-colors">{slot}</div>
          ))}
        </div>

        {/* Grid Area */}
        <div 
          className="flex-grow grid relative max-md:border-r-0 border-r border-slate-200 min-h-0"
          style={{ gridTemplateColumns: `repeat(${rooms.length}, minmax(0, 1fr))` }}
        >
             {rooms.map(room => {
                 const slotsToSkip = new Set<string>();
                 return (
                    <div key={room.id} className="border-r border-slate-100 relative grid grid-rows-[repeat(16,minmax(0,1fr))] min-h-0">
                        {SLOTS.map((slot, index) => {
                            // Check if we should skip this slot because it's part of a merged booking
                            if (slotsToSkip.has(`${room.id}-${slot}`)) return null;

                            const booking = isSlotBooked(room.id, slot);
                            
                            if (booking) {
                                const isStart = isBookingStartSlot(booking, slot);
                                if (isStart) {
                                    // Calculate span
                                    const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
                                    const startM = toMinutes(booking.start_time);
                                    const endM = toMinutes(booking.end_time);
                                    const span = Math.max(1, (endM - startM) / 30);
                                    
                                    // Mark covered slots for skipping
                                    for (let i = 1; i < span; i++) {
                                        if (SLOTS[index + i]) {
                                            slotsToSkip.add(`${room.id}-${SLOTS[index + i]}`);
                                        }
                                    }

                                    const isPending = booking.status === 'pending';
                                    
                                    const format12Hour = (time24: string) => {
                                        if (!time24) return '';
                                        const [hStr, mStr] = time24.split(':');
                                        const h = parseInt(hStr, 10);
                                        if (isNaN(h)) return time24;
                                        const hour12 = h % 12 || 12;
                                        const ampm = h < 12 ? 'A.M' : 'P.M';
                                        return `${hour12.toString().padStart(2, '0')}:${mStr} ${ampm}`;
                                    };

                                    return (
                                        <div 
                                            key={slot} 
                                            style={{ gridRow: `span ${span}` }}
                                            className={`border-b border-white flex flex-col justify-center px-2 py-1 select-none cursor-pointer ${
                                                isPending 
                                                ? 'bg-amber-100 hover:bg-amber-200 border-l-2 border-l-amber-500' 
                                                : 'bg-emerald-100 hover:bg-emerald-200 border-l-2 border-l-emerald-600'
                                            }`}
                                            onClick={() => onBookingClick?.(booking)}
                                            id={`slot-${room.id}-${slot.replace(/[: ]/g, '')}`}
                                        >
                                            <p className={`font-bold text-[11px] ${isPending ? 'text-amber-900' : 'text-emerald-900'} truncate`}>
                                                {booking.visitor_name}
                                            </p>
                                            <p className={`text-[11px] ${isPending ? 'text-amber-700' : 'text-emerald-700'} truncate`}>
                                                {booking.company_name}
                                            </p>
                                            {span >= 2 && (
                                                <p className={`text-[11px] ${isPending ? 'text-amber-700' : 'text-emerald-700'} truncate`}>
                                                    Booked: {format12Hour(booking.start_time)} - {format12Hour(booking.end_time)}
                                                </p>
                                            )}
                                        </div>
                                    );
                                }
                                return null; // Not the start of the booking, will be spanned over
                            }

                            return (
                                <div 
                                    key={slot} 
                                    className="border-b border-slate-100 cursor-pointer hover:bg-slate-50" 
                                    onClick={() => onCellClick(room.id, slot)}
                                    id={`slot-empty-${room.id}-${slot.replace(/[: ]/g, '')}`}
                                ></div>
                            );
                        })}
                    </div>
                 );
             })}
        </div>
      </div>
      </div>
    </div>
  );
}
