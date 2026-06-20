import React, { useState } from 'react';
import { XIcon, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Button } from '@/src/components/ui/button';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../../lib/firebase';

export function ForgotPasswordDialog({ open, onClose }: { open: boolean, onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Verify that the admin account actually exists in Firestore
      const q = query(collection(db, 'admins'), where('email', '==', email.trim().toLowerCase()));
      let snap;
      try {
        snap = await getDocs(q);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'admins');
      }

      if (!snap || snap.empty) {
        throw new Error('No administrator account could be found with that email address.');
      }

      // 2. Trigger password reset email via Firebase Auth
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err?.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setError(null);
    setSuccess(false);
    setEmail('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="rounded-none max-w-sm w-full" showCloseButton={false}>
        <DialogHeader className="bg-slate-100 p-4 flex flex-row items-center justify-between border-b border-slate-200">
          <DialogTitle className="text-slate-900 font-semibold text-base">Reset Password</DialogTitle>
          <DialogClose className="cursor-pointer text-slate-500 hover:text-slate-800 transition-colors" onClick={handleClose}>
            <XIcon className="size-4" />
          </DialogClose>
        </DialogHeader>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-fade-in">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-6 text-center space-y-4 flex flex-col items-center">
            <CheckCircle2 className="size-12 text-emerald-600 animate-bounce" />
            <h3 className="text-base font-bold text-slate-900">Reset Email Sent</h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
              An administrator account has been located! We've sent password reset instructions to your email address. Please check your inbox.
            </p>
            <Button 
              onClick={handleClose}
              className="mt-4 px-6 rounded-none bg-slate-900 hover:bg-slate-800 text-white font-semibold uppercase tracking-wider text-xs py-2 cursor-pointer"
            >
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Enter your registered admin email address below, and we'll verify your credentials and send you an link to safely reset your password.
            </p>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Email Address</Label>
              <Input 
                required 
                type="email" 
                placeholder="admin@company.com"
                className="rounded-none border-slate-300 focus:border-slate-900 text-sm" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full rounded-none bg-slate-900 hover:bg-slate-800 text-white font-semibold uppercase tracking-wider text-xs py-2 h-10 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Send Reset Link
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
