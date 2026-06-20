import React, { useState, useEffect } from 'react';
import { XIcon, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Button } from '@/src/components/ui/button';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../../lib/firebase';

export function AdminSigninDialog({ open, onClose, onForgotPasswordClick, onSignupClick }: { open: boolean, onClose: () => void, onForgotPasswordClick: () => void, onSignupClick?: () => void }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Load remembered email on mount
  useEffect(() => {
    if (open) {
      const savedEmail = localStorage.getItem('admin_remembered_email');
      if (savedEmail) {
        setFormData(prev => ({ ...prev, email: savedEmail }));
        setRememberMe(true);
      }
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      // 2. Query Firestore to verify the user exists in the "admins" collection
      const adminDocRef = doc(db, 'admins', user.uid);
      let adminDocSnap;
      try {
        adminDocSnap = await getDoc(adminDocRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'admins/' + user.uid);
      }

      if (!adminDocSnap || !adminDocSnap.exists()) {
        // Not a registered admin. Sign out immediately.
        await signOut(auth);
        throw new Error('Access Denied. This user account lacks admin privileges.');
      }

      // Check if email is verified
      if (!user.emailVerified) {
        // Note: we can optionally force verification. Let's make it a warning helper,
        // or support it gracefully as asked by the user in: "verify email address to signin account".
        await signOut(auth);
        throw new Error('Please verify your email address before logging in. We sent you a verification link upon signup.');
      }

      // 3. Handle 'Remember Me'
      if (rememberMe) {
        localStorage.setItem('admin_remembered_email', formData.email);
      } else {
        localStorage.removeItem('admin_remembered_email');
      }

      alert('Admin signed in successfully!');
      onClose();
      setFormData({ email: '', password: '' });
    } catch (err: any) {
      console.error('Signin error:', err);
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
        setError('Invalid admin email address or password. If you recently created or migrated to a brand-new Firebase project, your previous admin user credentials no longer exist. Please sign up to create a new administrator account.');
      } else if (err?.code === 'auth/invalid-email') {
        setError('The email address format is invalid.');
      } else if (err?.code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in provider is not enabled on your Firebase project. To enable it, please open your Firebase Console, click on Authentication -> Sign-in Method, select Email/Password, select "Enable", and click Save.');
      } else {
        setError(err?.message || 'Failed to authenticate admin. Please check settings.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="rounded-none max-w-sm w-full" showCloseButton={false}>
        <DialogHeader className="bg-slate-100 p-4 flex flex-row items-center justify-between border-b border-slate-200">
          <DialogTitle className="text-slate-900 font-semibold text-base">Admin Sign In</DialogTitle>
          <DialogClose className="cursor-pointer text-slate-500 hover:text-slate-800 transition-colors" onClick={handleClose}>
            <XIcon className="size-4" />
          </DialogClose>
        </DialogHeader>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Email Address</Label>
            <Input 
              required 
              type="email" 
              placeholder="admin@company.com"
              className="rounded-none border-slate-300 focus:border-slate-900 text-sm" 
              value={formData.email} 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Password</Label>
            <div className="relative">
              <Input 
                required 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••"
                className="rounded-none border-slate-300 focus:border-slate-900 text-sm pr-10" 
                value={formData.password} 
                onChange={(e) => setFormData({...formData, password: e.target.value})} 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer flex items-center justify-center p-1"
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)} 
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900" 
              />
              <span>Remember Me</span>
            </label>
            <button 
              type="button" 
              onClick={onForgotPasswordClick} 
              className="text-xs text-blue-600 hover:underline hover:text-blue-800 font-medium cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full rounded-none bg-slate-900 hover:bg-slate-800 text-white font-semibold uppercase tracking-wider text-xs py-2 h-10 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Sign In
          </Button>

        </form>
      </DialogContent>
    </Dialog>
  );
}
