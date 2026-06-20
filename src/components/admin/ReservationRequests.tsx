import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Booking, Room } from '../../types';
import { Check, X, Clock, Trash2, Search, Building, Users, Calendar, Coffee, ShieldAlert, CheckCircle, AlertOctagon, Printer } from 'lucide-react';

interface ReservationRequestsProps {
  rooms: Room[];
  onBookingClick: (booking: Booking) => void;
}

export function ReservationRequests({ rooms, onBookingClick }: ReservationRequestsProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Delete Confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  // Status Confirmation state
  const [statusConfirm, setStatusConfirm] = useState<{ id: string, status: 'approved' | 'rejected' | 'cancelled' } | null>(null);

  useEffect(() => {
    // Read all bookings
    const q = query(collection(db, 'bookings'), orderBy('created_at', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            ...docData,
            // Convert native Firestore Timestamp or ISO Date string to real Date if needed
            created_at: docData.created_at?.toDate ? docData.created_at.toDate() : new Date(docData.created_at),
            updated_at: docData.updated_at?.toDate ? docData.updated_at.toDate() : new Date(docData.updated_at),
          } as Booking;
        });
        setBookings(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error reading bookings list:", err);
        setError("Failed to fetch reservation requests. Please ensure you are authorized or try again.");
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'bookings');
      }
    );

    return () => unsubscribe();
  }, []);

  // Cleanup old bookings (older than 30 days)
  useEffect(() => {
    const cleanupOldBookings = async () => {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        const q = query(
          collection(db, 'bookings'),
          where('created_at', '<', thirtyDaysAgo)
        );
        
        const snapshot = await getDocs(q);
        snapshot.forEach(async (docSnap) => {
          await deleteDoc(docSnap.ref);
        });
      } catch (err) {
        console.error("Error cleaning up old bookings:", err);
      }
    };
    
    cleanupOldBookings();
  }, []);

  const handleUpdateStatus = async (bookingId: string, newStatus: 'approved' | 'rejected' | 'cancelled') => {
    try {
      setStatusMessage(null);
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        status: newStatus,
        updated_at: new Date()
      });
      showTemporaryMessage('success', `Reservation successfully ${newStatus}!`);
    } catch (err: any) {
      console.error(`Error updating booking is ${bookingId} to ${newStatus}:`, err);
      showTemporaryMessage('error', `Failed to update status: ${err.message || err}`);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      setStatusMessage(null);
      await deleteDoc(doc(db, 'bookings', bookingId));
      showTemporaryMessage('success', 'Reservation request deleted permanently!');
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error(`Error deleting booking ${bookingId}:`, err);
      showTemporaryMessage('error', `Failed to delete reservation: ${err.message || err}`);
    }
  };

  const showTemporaryMessage = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  const getRoomName = (roomId: string) => {
    return rooms.find(r => r.id === roomId)?.name || 'Unknown Room';
  };

  // Filter logic
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.visitor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.department.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = selectedStatus === 'all' || booking.status === selectedStatus;
    const matchesRoom = selectedRoom === 'all' || booking.room_id === selectedRoom;

    return matchesSearch && matchesStatus && matchesRoom;
  });

  const getStatusBadgeStyles = (status: Booking['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'cancelled':
        return 'bg-slate-50 text-slate-600 border-slate-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Upper bar & Search */}
      <div className="bg-white p-4 border-b border-slate-200 space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-800 tracking-tight uppercase">Reservation Requests</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Manage and review room reservation requests</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] uppercase font-bold text-slate-400">
            <span className="px-2 py-1 bg-slate-100 rounded text-slate-600">Total: {bookings.length}</span>
            <span className="px-2 py-1 bg-amber-50 rounded text-amber-700 font-semibold">Pending: {bookings.filter(b => b.status === 'pending').length}</span>
            <span className="px-2 py-1 bg-emerald-50 rounded text-emerald-700 font-semibold">Approved: {bookings.filter(b => b.status === 'approved').length}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by visitor, company or department..."
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 focus:outline-none focus:border-slate-400 rounded-none bg-slate-50/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="search-bookings-input"
            />
          </div>

          <div className="flex gap-2">
            <select
              className="flex-1 text-xs px-2 py-2 border border-slate-200 focus:outline-none focus:border-slate-400 rounded-none bg-slate-50/50"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              id="status-filter-select"
            >
              <option value="all">All States</option>
              <option value="pending">Pending Requests</option>
              <option value="approved">Approved Requests</option>
              <option value="rejected">Rejected Requests</option>
              <option value="cancelled">Cancelled Requests</option>
            </select>

            <select
              className="flex-1 text-xs px-2 py-2 border border-slate-200 focus:outline-none focus:border-slate-400 rounded-none bg-slate-50/50"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              id="room-filter-select"
            >
              <option value="all">All Rooms</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-3 text-xs flex items-center justify-between font-medium border-b shrink-0 ${
          statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800 border-rose-100'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <AlertOctagon className="h-4 w-4 text-rose-600" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs">Dismiss</button>
        </div>
      )}

      {/* Main requests list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <Clock className="h-8 w-8 animate-spin mb-2 text-slate-300" />
            <p className="text-xs font-semibold uppercase tracking-wider">Syncing Reservation Requests...</p>
          </div>
        ) : error ? (
          <div className="h-64 bg-white border border-rose-100 p-6 flex flex-col items-center justify-center text-rose-600 text-center rounded-none">
            <ShieldAlert className="h-8 w-8 mb-2" />
            <p className="text-sm font-bold uppercase tracking-wider mb-1">Authorization Rejected</p>
            <p className="text-xs text-slate-500 max-w-sm">{error}</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white border border-slate-200 p-12 text-center text-slate-400 rounded-none">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">No Reservation Requests Found</p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto">Try clearing your filters or look for other keywords.</p>
          </div>
        ) : (
          filteredBookings.map((b) => (
            <div key={b.id} id={`booking-card-${b.id}`} className="bg-white border border-slate-200 transition-all duration-200 hover:border-slate-300 hover:shadow-sm rounded-none flex flex-col md:flex-row">
              {/* Left detail area */}
              <div className="flex-1 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-900 text-white text-[10px] font-bold uppercase px-2.5 py-1 tracking-wider">
                      {getRoomName(b.room_id)}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-2.5 py-1 border ${getStatusBadgeStyles(b.status)}`}>
                      {b.status}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium font-mono">
                    Created: {new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(b.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}{b.ip_address && ` • IP: ${b.ip_address}`}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs text-slate-700">
                  {/* Visitor */}
                  <div className="space-y-1">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Requester</span>
                    <div className="font-bold text-slate-900">{b.visitor_name}</div>
                    <div className="text-[10px] font-medium text-slate-500">{b.department}</div>
                    {/* IP display removed from here */}
                  </div>

                  {/* Company */}
                  <div className="space-y-1">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Guest / Organization</span>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Building className="h-3 w-3 text-slate-400" />
                      <span>{b.company_name}</span>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="space-y-1">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Reservation Time</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      <span>{b.booking_date}</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-600 font-mono pl-4.5">
                      {b.start_time} - {b.end_time}
                    </div>
                  </div>

                  {/* Logistics */}
                  <div className="space-y-1">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Logistics & Catering</span>
                    <div className="flex flex-col gap-1 text-[10px] font-semibold text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 text-slate-400" />
                        <span>{b.attendees} Attendees</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Coffee className="h-3 w-3 text-slate-400" />
                        <span>{b.food_served ? `Catering: ${b.food_type || 'Snack'}` : 'No Food Services'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right action controls */}
              <div className="bg-slate-50/50 p-5 shrink-0 flex flex-row md:flex-col justify-center items-center gap-3 border-t md:border-t-0 md:border-l border-slate-200 md:w-48">
                {b.status === 'pending' && (
                  statusConfirm?.id === b.id ? (
                    <div className="w-full flex flex-col gap-1 pt-1.5 border-t border-slate-200 mt-1 md:mt-0">
                      <span className="text-[9px] text-slate-800 font-bold uppercase tracking-tight text-center block mb-1">Confirm {statusConfirm.status}?</span>
                      <div className="flex gap-1">
                        <button 
                          onClick={async () => {
                            await handleUpdateStatus(statusConfirm.id, statusConfirm.status);
                            setStatusConfirm(null);
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] py-1 font-bold rounded-none cursor-pointer"
                        >
                          Yes
                        </button>
                        <button 
                          onClick={() => setStatusConfirm(null)}
                          className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[9px] py-1 font-bold rounded-none cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setStatusConfirm({ id: b.id, status: 'approved' })}
                        className="flex-1 w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase py-2 px-3 transition-colors rounded-none cursor-pointer"
                        id={`approve-btn-${b.id}`}
                      >
                        <Check className="h-3 w-3" />
                        Approve
                      </button>
                      <button
                        onClick={() => setStatusConfirm({ id: b.id, status: 'rejected' })}
                        className="flex-1 w-full flex items-center justify-center gap-1.5 border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 text-[10px] font-bold uppercase py-2 px-3 transition-colors rounded-none cursor-pointer"
                        id={`reject-btn-${b.id}`}
                      >
                        <X className="h-3 w-3" />
                        Reject
                      </button>
                    </>
                  )
                )}

                {b.status === 'approved' && (
                  statusConfirm?.id === b.id && statusConfirm.status === 'cancelled' ? (
                    <div className="w-full flex flex-col gap-1 pt-1.5 border-t border-slate-200 mt-1 md:mt-0">
                      <span className="text-[9px] text-slate-800 font-bold uppercase tracking-tight text-center block mb-1">Confirm cancel?</span>
                      <div className="flex gap-1">
                        <button 
                          onClick={async () => {
                            await handleUpdateStatus(statusConfirm.id, statusConfirm.status);
                            setStatusConfirm(null);
                          }}
                          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-[9px] py-1 font-bold rounded-none cursor-pointer"
                        >
                          Yes
                        </button>
                        <button 
                          onClick={() => setStatusConfirm(null)}
                          className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[9px] py-1 font-bold rounded-none cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col gap-1">
                      <button
                        onClick={() => setStatusConfirm({ id: b.id, status: 'cancelled' })}
                        className="w-full flex items-center justify-center gap-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 text-[10px] font-bold uppercase py-2 px-3 transition-colors rounded-none cursor-pointer"
                        id={`cancel-btn-${b.id}`}
                      >
                        <X className="h-3 w-3" />
                        Cancel
                      </button>
                      <button
                        onClick={() => onBookingClick(b)}
                        className="w-full flex items-center justify-center gap-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 text-[10px] font-bold uppercase py-2 px-3 transition-colors rounded-none cursor-pointer"
                      >
                        <Printer className="h-3 w-3" />
                        Print
                      </button>
                    </div>
                  )
                )}

                {b.status !== 'pending' && b.status !== 'approved' && (
                  <span className="text-[10px] text-slate-400 font-bold uppercase py-2 italic">
                    Resolved
                  </span>
                )}

                {/* Permanent Delete Confirmation toggle */}
                {deleteConfirmId === b.id ? (
                  <div className="w-full flex flex-col gap-1 pt-1.5 border-t border-slate-200 mt-1 md:mt-0">
                    <span className="text-[9px] text-rose-800 font-bold uppercase tracking-tight text-center">Are you sure?</span>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleDeleteBooking(b.id)}
                        className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-[9px] py-1 font-bold rounded-none cursor-pointer"
                        id={`confirm-delete-btn-${b.id}`}
                      >
                        Yes
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmId(null)}
                        className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[9px] py-1 font-bold rounded-none cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(b.id)}
                    className="w-full flex items-center justify-center gap-1.5 border border-slate-300 text-slate-600 bg-white hover:border-rose-400 hover:text-rose-600 text-[10px] font-bold uppercase py-2 px-3 transition-colors rounded-none cursor-pointer"
                    id={`delete-btn-${b.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete Record
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
