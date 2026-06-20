import React, { useState } from 'react';
import { XIcon, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Button } from '@/src/components/ui/button';
import { createUserWithEmailAndPassword, sendEmailVerification, fetchSignInMethodsForEmail } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../../lib/firebase';

export function AdminSignupDialog({ open, onClose, onSigninClick }: { open: boolean, onClose: () => void, onSigninClick?: () => void }) {
  const [step, setStep] = useState<'signup' | 'verification' | 'success'>('signup');
  const [formData, setFormData] = useState({ name: '', designation: '', email: '', password: '' });
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // In firebase-auth, we want to pre-check or just let the creation handle it.
      // But to be extra friendly, we proceed to verification first as the user requested.
      setStep('verification');
    } catch (err: any) {
      setError(err?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code !== '064520') {
      setError('Invalid unique administrator code. Please try again.');
      return;
    }

    setLoading(true);
    try {
      // Attempt to create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      // Send email verification
      try {
        await sendEmailVerification(user);
      } catch (emailErr) {
        console.warn('Could not send verification email:', emailErr);
      }

      // Store additional admin information in Firestore under their UID
      try {
        await setDoc(doc(db, 'admins', user.uid), {
          name: formData.name,
          designation: formData.designation,
          email: formData.email,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'admins/' + user.uid);
      }

      setStep('success');
      setFormData({ name: '', designation: '', email: '', password: '' });
      setCode('');
    } catch (err: any) {
      console.error('Signup error:', err);
      if (err?.code === 'auth/email-already-in-use') {
        setError('An administrative or user account with this email address already exists.');
      } else if (err?.code === 'auth/weak-password') {
        setError('The password is too weak. Please use at least 6 characters.');
      } else if (err?.code === 'auth/invalid-email') {
        setError('The email address format is invalid.');
      } else if (err?.code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in provider is not enabled on your Firebase project. To enable it, please open your Firebase Console, click on Authentication -> Sign-in Method, select Email/Password, select "Enable", and click Save.');
      } else {
        setError(err?.message || 'Failed to create admin account. Please verify Firebase setup.');
      }
      // Go back to signup step if they have a registration-related error
      setStep('signup');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    onClose();
    setStep('signup');
    setFormData({ name: '', designation: '', email: '', password: '' });
    setCode('');
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="rounded-none max-w-md w-full" showCloseButton={false}>
        <DialogHeader className="bg-slate-100 p-4 flex flex-row items-center justify-between border-b border-slate-200">
          <DialogTitle className="text-slate-900 font-semibold text-base">Admin Signup</DialogTitle>
          <DialogClose className="cursor-pointer text-slate-500 hover:text-slate-800 transition-colors" onClick={resetAndClose}>
            <XIcon className="size-4" />
          </DialogClose>
        </DialogHeader>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 'signup' && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Name</Label>
              <Input 
                required 
                placeholder="Manager / Administrator Name"
                className="rounded-none border-slate-300 focus:border-slate-900 text-sm" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Designation</Label>
              <Input 
                required 
                placeholder="e.g. IT Department Head"
                className="rounded-none border-slate-300 focus:border-slate-900 text-sm" 
                value={formData.designation} 
                onChange={(e) => setFormData({...formData, designation: e.target.value})} 
              />
            </div>
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
              <Input 
                required 
                type="password" 
                placeholder="••••••••"
                className="rounded-none border-slate-300 focus:border-slate-900 text-sm" 
                value={formData.password} 
                onChange={(e) => setFormData({...formData, password: e.target.value})} 
              />
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full rounded-none bg-slate-900 hover:bg-slate-800 text-white font-semibold uppercase tracking-wider text-xs py-2 h-10 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Continue
            </Button>
            {onSigninClick && (
              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">Already registered? </span>
                <button 
                  type="button" 
                  onClick={onSigninClick}
                  className="text-xs text-blue-600 hover:underline hover:text-blue-800 font-semibold cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            )}
          </form>
        )}

        {step === 'verification' && (
          <form onSubmit={handleVerify} className="space-y-4 p-4">
            <p className="text-xs text-slate-600">
              Please enter the unique administrator verification code to complete registrations.
            </p>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Enter Unique Code</Label>
              <Input 
                required 
                type="password" 
                placeholder="••••••"
                className="rounded-none border-slate-300 text-center tracking-widest text-lg font-mono focus:border-slate-900" 
                value={code} 
                onChange={(e) => setCode(e.target.value)} 
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep('signup')}
                disabled={loading}
                className="w-1/3 rounded-none border-slate-300 text-slate-700 hover:text-slate-950 text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                Back
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="w-2/3 rounded-none bg-slate-900 hover:bg-slate-800 text-white font-semibold uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                Verify & Create
              </Button>
            </div>
          </form>
        )}

        {step === 'success' && (
          <div className="p-6 text-center space-y-4 flex flex-col items-center">
            <CheckCircle2 className="size-12 text-emerald-600 animate-bounce" />
            <h3 className="text-base font-bold text-slate-900">Account Created Successfully!</h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
              An administrative registration requests was certified! We've sent a confirmation email to verification link. Please check and verify your email address to sign in.
            </p>
            <Button 
              onClick={resetAndClose}
              className="mt-4 px-6 rounded-none bg-slate-900 hover:bg-slate-800 text-white font-semibold uppercase tracking-wider text-xs py-2 cursor-pointer"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
