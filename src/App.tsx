/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, XIcon, Menu, LogOut, CheckSquare, Settings, LayoutGrid, Shield } from 'lucide-react';
import { Sidebar } from './components/layout/Sidebar';
import { RoomGrid } from './components/layout/RoomGrid';
import { useBookings } from './hooks/useBookings';
import { Room, Booking } from './types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/src/components/ui/dialog';
import { Calendar } from '@/src/components/ui/calendar';
import { BookingForm } from '@/src/components/booking/BookingForm';
import { AdminSignupDialog } from './components/auth/AdminSignupDialog';
import { AdminSigninDialog } from './components/auth/AdminSigninDialog';
import { ForgotPasswordDialog } from './components/auth/ForgotPasswordDialog';
import { BookingDetailDialog } from './components/booking/BookingDetailDialog';
import { ReservationRequests } from './components/admin/ReservationRequests';
import { AdminSettings } from './components/admin/AdminSettings';
import { useRooms } from './hooks/useRooms';

import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';

const INITIAL_ROOMS: Room[] = [
  { id: 'harebell', name: 'Harebell' },
  { id: 'scandinavia', name: 'Scandinavia' },
  { id: 'far-east', name: 'Far East' },
  { id: 'nordic', name: 'Nordic' },
  { id: 'rooftop', name: 'Rooftop Cafeteria' },
];

export default function App() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };
  
  const bookings = useBookings(selectedDate);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAdminSignupOpen, setIsAdminSignupOpen] = useState(false);
  const [isAdminSigninOpen, setIsAdminSigninOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<{ roomId: string, time: string } | null>(null);

  // Authentication & Admin status
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const { rooms } = useRooms(isAdmin);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'settings'>('dashboard');

  // Booking detail view
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<Booking | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Sync auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
          if (adminDoc.exists() || currentUser.email === 'smshamim007@gmail.com') {
            setIsAdmin(true);
            // Sign-in redirects: once authorized, go to admin dashboard menu smoothly
            setActiveTab('dashboard');

            if (!adminDoc.exists() && currentUser.email === 'smshamim007@gmail.com') {
              try {
                await setDoc(doc(db, 'admins', currentUser.uid), {
                  name: currentUser.displayName || 'Primary Administrator',
                  designation: 'System Administrator',
                  email: currentUser.email,
                  createdAt: new Date().toISOString(),
                });
                console.log("Auto-seeded admin document for:", currentUser.email);
              } catch (writeErr) {
                console.error("Failed to auto-seed admin document:", writeErr);
              }
            }
          } else {
            setIsAdmin(false);
          }
        } catch (err) {
          console.error("Error confirming administrator role status:", err);
          if (currentUser.email === 'smshamim007@gmail.com') {
            setIsAdmin(true);
            setActiveTab('dashboard');
          } else {
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
        setActiveTab('dashboard');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (window.location.pathname === '/signup/admin') {
        setIsAdminSignupOpen(true);
    } else if (window.location.pathname === '/signin/admin') {
        setIsAdminSigninOpen(true);
    }
  }, []);

  const handleCellClick = (roomId: string, timeSlot: string) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const compareDate = new Date(selectedDate);
      compareDate.setHours(0, 0, 0, 0);

      if (compareDate < today) {
          alert("Bookings cannot be made for past dates.");
          return;
      }

      setSelectedBooking({ roomId, time: timeSlot });
      setIsFormOpen(true);
  };

  const handleBookingClick = (booking: Booking) => {
      setSelectedBookingDetail(booking);
      setIsDetailOpen(true);
  };

  return (
    <div className="flex h-screen bg-slate-200 md:p-2 flex-col md:flex-row gap-0 md:gap-2">
      <Sidebar currentDate={selectedDate} onDateChange={setSelectedDate} />
      
      <main className="flex-1 flex flex-col bg-white overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between h-14 border-b border-slate-200 bg-[#f1f5f9] px-4 shrink-0 mt-0">
          <div>
            <h1 className="text-sm font-bold text-[#0f172a] uppercase tracking-tight">Hellenic Group</h1>
            <p className="text-[8px] uppercase font-semibold text-slate-500 tracking-[0.1em]">Meeting Room Reservation</p>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)} 
            className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-700 bg-white cursor-pointer rounded-none flex items-center justify-center transition-colors h-[32px] w-[32px]"
          >
            <Menu className="size-4" />
          </button>
        </div>

        <header className="h-16 border-b border-slate-200 px-4 md:px-6 flex items-center justify-center md:justify-between shrink-0 bg-white flex-col md:flex-row">
          <div className="flex items-center justify-center md:justify-start gap-2 md:gap-4 overflow-x-auto whitespace-nowrap py-2 hide-scrollbar w-full md:w-auto h-full">
            {activeTab === 'dashboard' ? (
              <>
                <button 
                  onClick={() => changeDate(-1)}
                  className="p-1 hover:bg-slate-100 rounded-none cursor-pointer shrink-0"
                  title="Previous Day"
                >
                    <ChevronLeft className="size-4" />
                </button>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider truncate">
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </h2>
                <button 
                  onClick={() => changeDate(1)}
                  className="p-1 hover:bg-slate-100 rounded-none cursor-pointer shrink-0"
                  title="Next Day"
                >
                    <ChevronRight className="size-4" />
                </button>
              </>
            ) : activeTab === 'requests' ? (
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-slate-800 shrink-0" />
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider truncate">
                  Administrator Request Center
                </h2>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Settings className="size-4 text-slate-800 shrink-0" />
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider truncate">
                  System Settings
                </h2>
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2 relative">
            {/* New Booking Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger className="bg-slate-900 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer hover:bg-slate-800 transition-colors">
                  + New Booking
              </DialogTrigger>
              <DialogContent className="rounded-none max-w-lg w-[90vw] mx-auto sm:w-full sm:mx-auto" showCloseButton={false}>
                  <DialogHeader className="bg-slate-100 p-4 flex flex-row items-center justify-between">
                      <DialogTitle className="text-xs font-bold uppercase tracking-widest text-[#0f172a]">New Booking Request</DialogTitle>
                      <DialogClose className="cursor-pointer mt-1">
                          <XIcon className="size-4" />
                      </DialogClose>
                  </DialogHeader>
                  <BookingForm rooms={rooms} onSuccess={() => setIsFormOpen(false)} defaultRoomId={selectedBooking?.roomId} defaultTime={selectedBooking?.time.split(' - ')[0]} defaultDate={selectedDate} />
              </DialogContent>
            </Dialog>

            {/* Hamburger Icon directly to the right of New Booking button when signed in as Admin */}
            {isAdmin && (
              <div className="relative">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-700 bg-white cursor-pointer rounded-none flex items-center justify-center transition-colors h-[32px] w-[32px]"
                  title="Admin Settings Menu"
                  id="admin-hamburger-btn"
                >
                  <Menu className="size-4" />
                </button>
                
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-54 bg-white border border-slate-200 shadow-xl z-50 rounded-none overflow-hidden animate-in fade-in duration-100">
                    <div className="p-2.5 border-b border-slate-100 bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-widest px-4 flex items-center gap-1.5">
                      <Shield className="size-3 text-slate-500" />
                      System Admin
                    </div>
                    
                    <button
                      onClick={() => { setActiveTab('dashboard'); setIsMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-[10px] uppercase font-bold tracking-wider flex items-center gap-2 hover:bg-slate-50 border-r-4 cursor-pointer transition-colors ${activeTab === 'dashboard' ? 'border-r-slate-950 text-slate-900 bg-slate-50/50' : 'border-r-transparent text-slate-500'}`}
                      id="menu-item-dashboard"
                    >
                      <LayoutGrid className="size-3.5 text-slate-400" />
                      Dashboard
                    </button>

                    <button
                      onClick={() => { setActiveTab('requests'); setIsMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-[10px] uppercase font-bold tracking-wider flex items-center gap-2 hover:bg-slate-50 border-r-4 cursor-pointer transition-colors ${activeTab === 'requests' ? 'border-r-slate-950 text-slate-900 bg-slate-50/50' : 'border-r-transparent text-slate-500'}`}
                      id="menu-item-requests"
                    >
                      <CheckSquare className="size-3.5 text-slate-400" />
                      Reservation Request
                    </button>

                    <button
                      onClick={() => { setActiveTab('settings'); setIsMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-[10px] uppercase font-bold tracking-wider flex items-center gap-2 hover:bg-slate-50 border-r-4 cursor-pointer transition-colors ${activeTab === 'settings' ? 'border-r-slate-950 text-slate-900 bg-slate-50/50' : 'border-r-transparent text-slate-500'}`}
                      id="menu-item-settings"
                    >
                      <Settings className="size-3.5 text-slate-400" />
                      Settings
                    </button>

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      onClick={async () => { 
                        setIsMenuOpen(false);
                        setActiveTab('dashboard');
                        await signOut(auth);
                      }}
                      className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-colors"
                      id="menu-item-signout"
                    >
                      <LogOut className="size-3.5 text-rose-400" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Inner Panel Viewports */}
        {activeTab === 'requests' ? (
          <ReservationRequests rooms={rooms} onBookingClick={handleBookingClick} />
        ) : activeTab === 'settings' ? (
          <AdminSettings rooms={rooms} />
        ) : (
          <RoomGrid 
            rooms={rooms} 
            bookings={bookings} 
            date={selectedDate} 
            onCellClick={handleCellClick} 
            onBookingClick={handleBookingClick}
          />
        )}

        {/* Mobile Slide-out Menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[100] flex md:hidden">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
            <div className="w-80 max-w-[80vw] bg-white h-full ml-auto flex flex-col relative z-50 shadow-2xl animate-in slide-in-from-right duration-200">
               <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-[#f1f5f9]">
                    <span className="font-bold uppercase tracking-wider text-xs text-slate-800">Menu</span>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 cursor-pointer"><XIcon className="size-5 text-slate-600" /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 bg-white justify-center">
                   <button className="bg-slate-900 text-white px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer w-full text-center hover:bg-slate-800 transition-colors"
                     onClick={() => { setIsMobileMenuOpen(false); setIsFormOpen(true); }}>
                     + New Booking
                   </button>
                   
                   <div>
                       <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 flex justify-between items-center">
                           Calendar
                           <button onClick={(e) => { e.preventDefault(); setSelectedDate(new Date()); setIsMobileMenuOpen(false); }} className="hover:text-slate-600 hover:underline">TODAY</button>
                       </h3>
                       <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(d) => { if(d) { setSelectedDate(d); setIsMobileMenuOpen(false); } }}
                            className="rounded-none text-xs bg-slate-50 w-full p-2 border border-slate-200 flex justify-center mx-auto"
                        />
                   </div>

                   {isAdmin && (
                       <div className="mt-2">
                          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
                              <Shield className="size-3"/> Administrator Panel
                          </h3>
                          <div className="flex flex-col border border-slate-200 bg-white">
                            <button
                              onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                              className={`w-full text-left px-4 py-3 text-[10px] uppercase font-bold tracking-wider flex items-center gap-2 hover:bg-slate-50 border-l-2 transition-colors ${activeTab === 'dashboard' ? 'border-l-slate-950 text-slate-900 bg-slate-50/50' : 'border-l-transparent text-slate-500'}`}
                            >
                              <LayoutGrid className="size-3.5" /> Dashboard
                            </button>
                            <button
                              onClick={() => { setActiveTab('requests'); setIsMobileMenuOpen(false); }}
                              className={`w-full text-left px-4 py-3 text-[10px] uppercase font-bold tracking-wider flex items-center gap-2 hover:bg-slate-50 border-l-2 transition-colors ${activeTab === 'requests' ? 'border-l-slate-950 text-slate-900 bg-slate-50/50' : 'border-l-transparent text-slate-500'}`}
                            >
                              <CheckSquare className="size-3.5" /> Reservation Requests
                            </button>
                            <button
                              onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
                              className={`w-full text-left px-4 py-3 text-[10px] uppercase font-bold tracking-wider flex items-center gap-2 hover:bg-slate-50 border-l-2 transition-colors ${activeTab === 'settings' ? 'border-l-slate-950 text-slate-900 bg-slate-50/50' : 'border-l-transparent text-slate-500'}`}
                            >
                              <Settings className="size-3.5" /> System Settings
                            </button>
                            <button
                              onClick={async () => { 
                                setIsMobileMenuOpen(false);
                                setActiveTab('dashboard');
                                await signOut(auth);
                              }}
                              className="w-full text-left px-4 py-3 text-[10px] uppercase font-bold tracking-wider flex items-center gap-2 hover:bg-rose-50 text-rose-600 border-l-2 border-l-transparent border-t border-t-slate-100 transition-colors"
                            >
                              <LogOut className="size-3.5" /> Sign Out
                            </button>
                          </div>
                       </div>
                   )}
               </div>
               <div className="text-[10px] text-slate-400 text-center p-4 border-t border-slate-100">
                    &copy; 2026 Hellenic Group. All rights reserved.
               </div>
            </div>
          </div>
        )}
      </main>

      <AdminSignupDialog 
        open={isAdminSignupOpen} 
        onClose={() => setIsAdminSignupOpen(false)} 
        onSigninClick={() => { setIsAdminSignupOpen(false); setIsAdminSigninOpen(true); }}
      />
      <AdminSigninDialog 
        open={isAdminSigninOpen} 
        onClose={() => setIsAdminSigninOpen(false)} 
        onForgotPasswordClick={() => { setIsAdminSigninOpen(false); setIsForgotPasswordOpen(true); }} 
        onSignupClick={() => { setIsAdminSigninOpen(false); setIsAdminSignupOpen(true); }}
      />
      <ForgotPasswordDialog open={isForgotPasswordOpen} onClose={() => setIsForgotPasswordOpen(false)} />
      
      {/* Booking details observer dialog overlay */}
      <BookingDetailDialog
        booking={selectedBookingDetail}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        isAdmin={isAdmin}
        rooms={rooms}
      />
    </div>
  );
}
