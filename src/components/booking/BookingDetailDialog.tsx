import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/src/components/ui/dialog';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Booking, Room } from '../../types';
import { X, Calendar, Clock, Building, Users, Coffee, Check, Shield, Trash2, Printer } from 'lucide-react';

interface BookingDetailDialogProps {
  booking: Booking | null;
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  rooms: Room[];
}

export function BookingDetailDialog({ booking, open, onClose, isAdmin, rooms }: BookingDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'approve' | 'reject' | 'cancel' | null>(null);

  if (!booking) return null;

  const roomName = rooms.find(r => r.id === booking.room_id)?.name || 'Unknown Room';

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day}-${months[parseInt(month, 10) - 1]}-${year}`;
  };

  const handleUpdateStatus = async (newStatus: 'approved' | 'rejected' | 'cancelled') => {
    setLoading(true);
    try {
      const bookingRef = doc(db, 'bookings', booking.id);
      await updateDoc(bookingRef, {
        status: newStatus,
        updated_at: new Date()
      });
      onClose();
    } catch (err) {
      console.error(`Error updating booking status to ${newStatus}:`, err);
      alert('Failed to update status. Please try again.');
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'bookings', booking.id));
      onClose();
    } catch (err) {
      console.error("Error deleting booking:", err);
      alert('Failed to delete booking. Please try again.');
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'rejected': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'cancelled': return 'bg-slate-50 text-slate-600 border-slate-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-none max-w-md p-0 overflow-hidden print-booking-content" showCloseButton={false}>
        {/* Nice top Banner */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-white/15 px-2 py-0.5">
              {roomName}
            </span>
            <span className="text-xs uppercase font-mono tracking-wider opacity-85">
              Reservation
            </span>
          </div>
          <DialogClose className="cursor-pointer text-white/70 hover:text-white transition-colors">
            <X className="size-4" />
          </DialogClose>
        </div>

        {/* Content body */}
        <div className="p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{booking.visitor_name}</h3>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{booking.department}</p>
            </div>
            <span className={`text-[9px] uppercase font-bold border px-2 py-0.5 ${getStatusColor(booking.status)}`}>
              {booking.status}
            </span>
          </div>

          <div className="border-t border-b border-slate-100 py-3 space-y-2 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-2.5">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Date: <strong className="text-slate-800">{formatDate(booking.booking_date)}</strong></span>
            </div>
            
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Time: <strong className="text-slate-800">{booking.start_time} - {booking.end_time}</strong></span>
            </div>

            <div className="flex items-center gap-2.5">
              <Building className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Org / Guest: <strong className="text-slate-800">{booking.company_name}</strong></span>
            </div>

            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Attendees: <strong className="text-slate-800">{booking.attendees}</strong></span>
            </div>

            <div className="flex items-center gap-2.5">
              <Coffee className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Catering: <strong className="text-slate-800">{booking.food_served ? `Served (${booking.food_type || 'Snack'})` : 'No Food Services'}</strong></span>
            </div>
          </div>

          {/* Admin Tools Area */}
          {isAdmin ? (
            <div className="pt-2 print-no-display">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Shield className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-[9px] uppercase font-bold tracking-widest text-[#0f172a]">
                  System Admin Controls
                </span>
              </div>

              {confirmAction ? (
                <div className="p-3 bg-amber-50 border border-amber-200 text-center space-y-2 rounded-none">
                  <p className="text-[10px] uppercase font-bold text-amber-800">
                    {confirmAction === 'delete' ? 'Delete this reservation record permanently?' : `Confirm ${confirmAction} this reservation?`}
                  </p>
                  <div className="flex gap-2 max-w-[200px] mx-auto">
                    <button
                      onClick={
                        confirmAction === 'delete' ? handleDelete : () => handleUpdateStatus(confirmAction === 'cancel' ? 'cancelled' : confirmAction)
                      }
                      disabled={loading}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[9px] py-1.5 uppercase rounded-none cursor-pointer"
                    >
                      {confirmAction === 'delete' ? 'Delete' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmAction(null)}
                      disabled={loading}
                      className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[9px] py-1.5 uppercase rounded-none cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    {booking.status === 'pending' && (
                      <>
                        <button
                          onClick={() => setConfirmAction('approve')}
                          disabled={loading}
                          className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase py-2 px-3 transition-colors rounded-none cursor-pointer"
                        >
                          <Check className="h-3 w-3" />
                          Approve
                        </button>
                        <button
                          onClick={() => setConfirmAction('reject')}
                          disabled={loading}
                          className="flex-1 flex items-center justify-center gap-1 border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 text-[10px] font-bold uppercase py-2 px-3 transition-colors rounded-none cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                          Reject
                        </button>
                      </>
                    )}

                    {booking.status === 'approved' && (
                      <button
                        onClick={() => setConfirmAction('cancel')}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-1 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-bold uppercase py-2 px-3 transition-colors rounded-none cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                        Cancel Approved Reservation
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => window.print()}
                      className="flex-1 py-2 flex items-center justify-center gap-1 text-[9px] font-bold uppercase text-slate-600 hover:text-slate-800 cursor-pointer border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print
                    </button>
                    <button
                      onClick={() => setConfirmAction('delete')}
                      disabled={loading}
                      className="flex-1 py-2 flex items-center justify-center gap-1 text-[9px] font-bold uppercase text-slate-400 hover:text-rose-600 cursor-pointer border border-dashed border-slate-200 hover:border-rose-200 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[9px] text-slate-400 text-center italic py-1">
              Contact an administrator to make changes to approved/pending requests.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
