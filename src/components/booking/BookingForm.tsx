import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Checkbox } from '@/src/components/ui/checkbox';
import { collection, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Room } from '../../types';

interface BookingFormProps {
  rooms: Room[];
  onSuccess: () => void;
  defaultRoomId?: string;
  defaultTime?: string;
  defaultDate?: Date;
}

const formatDateToYYYYMMDD = (date?: Date) => {
  const targetDate = date || new Date();
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export function BookingForm({ rooms, onSuccess, defaultRoomId, defaultTime, defaultDate }: BookingFormProps) {
  const [formData, setFormData] = useState({
    visitor_name: '',
    company_name: '',
    department: '',
    attendees: 1,
    room_id: defaultRoomId || '',
    booking_date: formatDateToYYYYMMDD(defaultDate),
    start_time: defaultTime || '00:00',
    end_time: '00:00',
    food_served: false,
    food_type: 'Snack' as 'Snack' | 'Lunch' | 'Snack & Lunch',
  });

  const timeSlots = Array.from({ length: 18 }, (_, i) => {
    const hour24 = Math.floor(i / 2) + 9;
    const minute = (i % 2) * 30;
    const value = `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    const hour12 = hour24 % 12 || 12;
    const ampm = hour24 < 12 ? 'AM' : 'PM';
    const label = `${hour12.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${ampm}`;
    
    return { value, label };
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.start_time >= formData.end_time) {
        setError("End time must be after start time.");
        return;
    }
    setError(null);
    try {
        let ipAddress = 'unknown';
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            ipAddress = data.ip;
        } catch(e) {
            console.error("Failed to fetch IP", e);
        }

        await addDoc(collection(db, 'bookings'), { 
            ...formData, 
            status: 'pending', 
            created_at: new Date(), 
            updated_at: new Date(),
            ip_address: ipAddress 
        });
        onSuccess();
    } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'bookings');
    }
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
          <Label>Your Name</Label>
          <Input required className="rounded-none" value={formData.visitor_name} onChange={(e) => setFormData({...formData, visitor_name: e.target.value})} />
      </div>
      <div className="space-y-2">
          <Label>Department</Label>
          <Input required className="rounded-none" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} />
      </div>
      <div className="space-y-2">
          <Label>Guest Name / Organization</Label>
          <Input required className="rounded-none" value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label>Reservation Date</Label>
            <Input type="date" required className="rounded-none" value={formData.booking_date} onChange={(e) => setFormData({...formData, booking_date: e.target.value})} />
        </div>
        <div className="space-y-2">
            <Label>Room</Label>
            <Select onValueChange={(val) => setFormData({...formData, room_id: val})} value={formData.room_id}>
                <SelectTrigger className="w-full rounded-none">
                  <SelectValue placeholder="Select Room">
                    {rooms.find(r => r.id === formData.room_id)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-none">
                    {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
            </Select>

        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
              <Label>Start Time</Label>
              <Select onValueChange={(val) => setFormData({...formData, start_time: val})} value={formData.start_time}>
                <SelectTrigger className="w-full rounded-none">
                    <SelectValue placeholder="Select Start Time">
                      {timeSlots.find(s => s.value === formData.start_time)?.label}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-none">
                    {timeSlots.filter(slot => slot.value !== '09:00' && slot.value !== '17:30').map(slot => <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>)}
                </SelectContent>
              </Select>
          </div>
          <div className="space-y-2">
              <Label>End Time</Label>
              <Select onValueChange={(val) => setFormData({...formData, end_time: val})} value={formData.end_time}>
                <SelectTrigger className="w-full rounded-none">
                    <SelectValue placeholder="Select End Time">
                      {timeSlots.find(s => s.value === formData.end_time)?.label}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-none">
                    {timeSlots.filter(slot => slot.value !== '09:00' && slot.value !== '09:30').map(slot => <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>)}
                </SelectContent>
              </Select>
          </div>
      </div>
      <div className="space-y-2">
        <Label>Number of Attendees</Label>
        <Input type="number" min="1" required className="rounded-none" value={formData.attendees} onChange={(e) => setFormData({...formData, attendees: parseInt(e.target.value)})} />
      </div>

      <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
              <Checkbox checked={formData.food_served} className="rounded-none" onCheckedChange={(c) => setFormData({...formData, food_served: !!c})} />
              <Label>Food Served?</Label>
          </div>

          {formData.food_served && (
              <Select onValueChange={(val) => setFormData({...formData, food_type: val as any})} value={formData.food_type}>
                  <SelectTrigger className="rounded-none"><SelectValue placeholder="Select food type" /></SelectTrigger>
                  <SelectContent className="rounded-none">
                      <SelectItem value="Snack">Snack</SelectItem>
                      <SelectItem value="Lunch">Lunch</SelectItem>
                      <SelectItem value="Snack & Lunch">Snack & Lunch</SelectItem>
                  </SelectContent>
              </Select>
          )}
      </div>

      {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
      <Button type="submit" className="w-full bg-gray-900 text-white rounded-none cursor-pointer">Submit Request</Button>
    </form>
  );
}
