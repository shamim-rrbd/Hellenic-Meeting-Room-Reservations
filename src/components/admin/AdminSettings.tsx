import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, updatePassword } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Room } from '../../types';
import { Shield, Key, Eye, EyeOff, User, Briefcase, Mail, Calendar, Settings2, Info } from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  designation: string;
  email: string;
  createdAt: string;
}

interface AdminSettingsProps {
  rooms: Room[];
}

function formatAdminDate(dateVal: any): string {
  if (!dateVal) return 'N/A';
  try {
    let date: Date;
    if (typeof dateVal === 'object' && dateVal !== null && 'seconds' in dateVal) {
      date = new Date(dateVal.seconds * 1000);
    } else {
      date = new Date(dateVal);
    }
    
    if (isNaN(date.getTime())) return 'N/A';
    
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  } catch (err) {
    return 'N/A';
  }
}

export function AdminSettings({ rooms }: AdminSettingsProps) {
  const [adminsList, setAdminsList] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync core logged-in admin details
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileName, setProfileName] = useState('');
  const [profileDesignation, setProfileDesignation] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Active Workspace Rooms editing state fields
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomName, setEditRoomName] = useState('');
  const [editRoomCapacity, setEditRoomCapacity] = useState<number>(8);
  const [editRoomFacilities, setEditRoomFacilities] = useState('');
  const [editRoomStatus, setEditRoomStatus] = useState<'Online' | 'Offline' | 'Hybrid'>('Online');
  const [savingRoom, setSavingRoom] = useState(false);
  const [roomSaveSuccess, setRoomSaveSuccess] = useState<string | null>(null);
  const [roomSaveError, setRoomSaveError] = useState<string | null>(null);

  const startEditRoom = (room: Room) => {
    setEditingRoomId(room.id);
    setEditRoomName(room.name);
    setEditRoomCapacity(room.capacity ?? 8);
    setEditRoomFacilities(room.facilities || '');
    setEditRoomStatus(room.status || 'Online');
    setRoomSaveSuccess(null);
    setRoomSaveError(null);
  };

  const saveRoomDetails = async (roomId: string) => {
    if (!editRoomName.trim()) {
      setRoomSaveError("Room Name is required");
      return;
    }
    setSavingRoom(true);
    setRoomSaveError(null);
    setRoomSaveSuccess(null);
    try {
      const roomDocRef = doc(db, 'rooms', roomId);
      await updateDoc(roomDocRef, {
        name: editRoomName.trim(),
        capacity: Number(editRoomCapacity),
        facilities: editRoomFacilities.trim(),
        status: editRoomStatus,
      });
      setRoomSaveSuccess(`Successfully updated ${editRoomName}!`);
      setEditingRoomId(null);
    } catch (err: any) {
      console.error("Error updating room document in Firestore:", err);
      setRoomSaveError(err?.message || "Failed to update room configuration.");
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
    } finally {
      setSavingRoom(false);
    }
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setProfileEmail(user.email || '');
        try {
          const docRef = doc(db, 'admins', user.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setProfileName(data.name || '');
            setProfileDesignation(data.designation || '');
          }
        } catch (err) {
          console.error("Error loading profile fields:", err);
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubAuth();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setProfileError(null);
    setProfileSuccess(null);
    setUpdatingProfile(true);

    try {
      if (!profileName.trim()) {
        throw new Error("Admin Name must be set.");
      }
      if (!profileDesignation.trim()) {
        throw new Error("Designation must be set.");
      }

      // Update Firestore document
      const adminDocRef = doc(db, 'admins', currentUser.uid);
      await updateDoc(adminDocRef, {
        name: profileName.trim(),
        designation: profileDesignation.trim(),
      });

      // Optional: Password change
      if (newPassword) {
        if (newPassword.length < 6) {
          throw new Error("Password must be at least 6 characters long.");
        }
        if (newPassword !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        await updatePassword(currentUser, newPassword);
        setNewPassword('');
        setConfirmPassword('');
      }

      setProfileSuccess("Profile successfully updated!");
    } catch (err: any) {
      console.error("Error updating profile settings:", err);
      if (err?.code === 'auth/requires-recent-login') {
        setProfileError("For security, changing passwords requires a recent sign-in. Please sign out and sign back in to change your password.");
      } else {
        setProfileError(err?.message || "Failed to update profile settings.");
      }
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Load registered admins list
  useEffect(() => {
    const q = query(collection(db, 'admins'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as AdminUser));
        setAdminsList(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error reading admin list:", err);
        setError("Unable to retrieve directory of administrator profiles.");
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'admins');
      }
    );

    return () => unsubscribe();
  }, []);

  const getCapacityDescription = (room: Room) => {
    return `Capacity: ${room.capacity ?? 8} Persons | ${room.facilities || 'Standard executive setup'}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header bar */}
      <div className="bg-white p-4 border-b border-slate-200 shrink-0">
        <h1 className="text-base font-bold text-slate-800 tracking-tight uppercase">Admin Panel Settings</h1>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Configure details, manage rooms, and view administrator directory</p>
      </div>

      {/* Settings Grid Content */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4 hide-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Column 1: My Profile Settings */}
          <div className="bg-white border border-slate-200 p-4 space-y-4 rounded-none h-fit">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <User className="h-4 w-4 text-slate-800" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">My Profile Settings</h2>
            </div>
            
            {currentUser ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                      </span>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-200 focus:outline-none focus:border-slate-900 rounded-none font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      Designation
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                      </span>
                      <input
                        type="text"
                        value={profileDesignation}
                        onChange={(e) => setProfileDesignation(e.target.value)}
                        placeholder="e.g. Workspace Administrator"
                        className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-200 focus:outline-none focus:border-slate-900 rounded-none font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Email Address
                      </label>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">(Non-Editable)</span>
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                      </span>
                      <input
                        type="email"
                        value={profileEmail}
                        disabled
                        readOnly
                        className="w-full text-xs pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed rounded-none font-medium"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <Key className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Change Password</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min 6 characters"
                            className="w-full text-xs pl-3 pr-10 py-2 bg-white border border-slate-200 focus:outline-none focus:border-slate-900 rounded-none font-medium text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none bg-transparent border-0 cursor-pointer"
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm password"
                            className="w-full text-xs pl-3 pr-10 py-2 bg-white border border-slate-200 focus:outline-none focus:border-slate-900 rounded-none font-medium text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none bg-transparent border-0 cursor-pointer"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {profileError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-[10px] text-rose-700 font-medium leading-normal rounded-none">
                    {profileError}
                  </div>
                )}

                {profileSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-[10px] text-emerald-800 font-medium rounded-none">
                    {profileSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="w-full bg-slate-900 text-white hover:bg-slate-800 transition-colors py-2.5 px-4 text-xs font-bold uppercase tracking-widest rounded-none cursor-pointer flex justify-center items-center"
                >
                  {updatingProfile ? "Updating Account..." : "Save Settings"}
                </button>
              </form>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                Please sign in to manage your profile settings.
              </div>
            )}
          </div>

          {/* Column 2: System Details and Workspace Configuration */}
          <div className="space-y-4">
            {/* Section 1: Meeting Rooms Configuration */}
            <div className="bg-white border border-slate-200 p-4 space-y-3 rounded-none">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Settings2 className="h-4 w-4 text-slate-600" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Active Workspace Rooms</h2>
              </div>
              
              <div className="space-y-3 font-sans">
                {roomSaveSuccess && (
                  <div className="p-2 bg-emerald-50 border border-emerald-100 text-[10px] text-emerald-800 font-medium rounded-none">
                    {roomSaveSuccess}
                  </div>
                )}
                {roomSaveError && (
                  <div className="p-2 bg-rose-50 border border-rose-100 text-[10px] text-rose-800 font-medium rounded-none">
                    {roomSaveError}
                  </div>
                )}

                {rooms.map(room => {
                  const isEditing = editingRoomId === room.id;
                  
                  if (isEditing) {
                    return (
                      <div key={room.id} className="p-3.5 bg-slate-50 border border-slate-900 rounded-none space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Editing Room ID: {room.id}</span>
                          <button
                            type="button"
                            onClick={() => setEditingRoomId(null)}
                            className="text-[9px] text-slate-400 hover:text-slate-600 uppercase font-bold tracking-wider cursor-pointer bg-transparent border-none"
                          >
                            Cancel
                          </button>
                        </div>

                         <div className="space-y-2">
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                              Room Name
                            </label>
                            <input
                              type="text"
                              value={editRoomName}
                              onChange={(e) => setEditRoomName(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 focus:outline-none focus:border-slate-900 rounded-none font-medium text-slate-800"
                              placeholder="e.g. Executive Lounge"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-1">
                              <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                                Capacity (Pax)
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={editRoomCapacity}
                                onChange={(e) => setEditRoomCapacity(parseInt(e.target.value) || 1)}
                                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 focus:outline-none focus:border-slate-900 rounded-none font-medium text-slate-800"
                              />
                            </div>

                            <div className="col-span-2">
                              <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                                Facilities
                              </label>
                              <input
                                type="text"
                                value={editRoomFacilities}
                                onChange={(e) => setEditRoomFacilities(e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 focus:outline-none focus:border-slate-900 rounded-none font-medium text-slate-800"
                                placeholder="HDMI projector, smartboard etc."
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                              Room Status
                            </label>
                            <div className="flex gap-1.5">
                              {(['Online', 'Offline', 'Hybrid'] as const).map((statusOption) => (
                                <button
                                  key={statusOption}
                                  type="button"
                                  onClick={() => setEditRoomStatus(statusOption)}
                                  className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider border rounded-none cursor-pointer transition-all ${
                                    editRoomStatus === statusOption
                                      ? 'bg-slate-900 text-white border-slate-900'
                                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  {statusOption}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            disabled={savingRoom}
                            onClick={() => saveRoomDetails(room.id)}
                            className="flex-1 bg-slate-900 text-white hover:bg-slate-800 transition-colors py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer"
                          >
                            {savingRoom ? 'Saving...' : 'Save Details'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingRoomId(null)}
                            className="px-3 border border-slate-200 hover:bg-slate-100 text-slate-600 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={room.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-none flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="text-xs font-bold text-slate-900">{room.name}</div>
                        <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                          {getCapacityDescription(room)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEditRoom(room)}
                          className="px-2.5 py-1 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 text-[10px] font-bold uppercase tracking-wide rounded-none cursor-pointer transition-colors shrink-0"
                        >
                          Edit
                        </button>
                        <span className={`text-[8px] font-bold uppercase rounded px-2 py-0.5 tracking-wider shrink-0 ${
                          room.status === 'Offline'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200/50'
                            : room.status === 'Hybrid'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200/50'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200/50'
                        }`}>
                          {room.status || 'Online'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>


          </div>
        </div>

        {/* Section 3: Registered Administrators Directory */}
        <div className="bg-white border border-slate-200 p-4 space-y-3 rounded-none">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Administrator Accounts ({adminsList.length})</h2>
            </div>
          </div>

          {loading ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              <Clock className="h-5 w-5 animate-spin mx-auto mb-1 text-slate-300" />
              Loading administrators list...
            </div>
          ) : error ? (
            <div className="py-4 text-center text-rose-600 text-xs font-semibold uppercase">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-400 text-[9px] uppercase font-bold tracking-widest">
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Designation</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Registered Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {adminsList.map((admin) => (
                    <tr key={admin.id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-bold text-slate-900 flex items-center gap-2">
                        <div className="size-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] uppercase">
                          {admin.name.charAt(0)}
                        </div>
                        {admin.name}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-600">
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3 text-slate-400" />
                          {admin.designation}
                        </div>
                      </td>
                      <td className="py-2 px-3 pl-3 font-mono text-slate-500">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-400" />
                          {admin.email}
                        </div>
                      </td>
                      <td className="py-2 px-3 pl-3 text-slate-400 font-mono text-[10px]">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {formatAdminDate(admin.createdAt)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Simple clock icon replacement helper for loader in the settings
function Clock({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
      {...props}
    >
      <circle cx={12} cy={12} r={10} />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
    </svg>
  );
}
