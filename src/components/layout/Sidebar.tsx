import React from 'react';
import { Calendar } from '@/src/components/ui/calendar';

interface SidebarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export function Sidebar({ currentDate, onDateChange }: SidebarProps) {
  const goToToday = () => onDateChange(new Date());
  
  return (
    <aside className="hidden md:flex w-64 h-full border-r border-slate-200 flex-col bg-[#f1f5f9]">
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-xl font-bold text-[#0f172a] tracking-tight uppercase">Hellenic Group</h1>
        <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-[0.1em] mt-1">Meeting Room Reservation</p>
      </div>

      <nav className="flex-1 p-2 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-2 px-4">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Calendar</h2>
            <button onClick={goToToday} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:underline cursor-pointer">SHOW TODAY</button>
        </div>
        <Calendar
            mode="single"
            selected={currentDate}
            onSelect={(d) => d && onDateChange(d)}
            className="rounded-none text-xs bg-[#f1f5f9] w-full p-2 border border-slate-200"
        />
      </nav>
      
      <div className="p-4 border-t border-slate-200 text-[10px] text-slate-500 text-center">
          &copy; {new Date().getFullYear()} Hellenic Group. All rights reserved.
      </div>
    </aside>
  );
}
