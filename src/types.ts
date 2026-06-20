export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface Room {
  id: string;
  name: string;
  capacity?: number;
  facilities?: string;
  status?: 'Online' | 'Offline' | 'Hybrid';
}

export interface Booking {
  id: string;
  room_id: string;
  visitor_name: string;
  company_name: string;
  department: string;
  attendees: number;
  food_served: boolean;
  food_type?: 'Snack' | 'Lunch';
  booking_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  status: BookingStatus;
  created_at: Date;
  updated_at: Date;
  ip_address?: string;
}
