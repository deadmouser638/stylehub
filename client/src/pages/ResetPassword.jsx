import React, { useState, useContext } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error('Reset token is missing from the link.');
      return;
    }

    if (password.length < 12) {
      toast.error('Password must be at least 12 characters.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/auth/reset-password', {
        token,
        newPassword: password,
      });

      if (res.data.data?.token) {
        localStorage.setItem('token', res.data.data.token);
        setUser(res.data.data.user);
      }

      setResetSuccess(true);
      toast.success(res.data.message || 'Password reset successful!');
      setTimeout(() => {
        navigate('/profile', { replace: true });
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password reset failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout
        image="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1000&q=80&auto=format&fit=crop"
        heading="Invalid Reset Link"
        subheading="No reset token was provided."
      >
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center space-y-4">
          <AlertCircle size={36} className="text-red-500 mx-auto" />
          <h2 className="text-lg font-semibold text-fg">Missing or Expired Token</h2>
          <p className="text-sm text-muted">
            The link you clicked is missing a valid reset token. Please request a new password reset link.
          </p>
          <Link to="/forgot-password" className="btn-primary inline-block py-2.5 px-6 text-sm">
            Request Password Reset
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      image="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1000&q=80&auto=format&fit=crop"
      heading="Create new password"
      subheading="Choose a strong, secure password of at least 12 characters."
    >
      <h1 className="font-display text-3xl font-semibold">Set new password</h1>
      <p className="mt-1 text-sm text-muted">
        Your new password will be active immediately.
      </p>

      {resetSuccess ? (
        <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center space-y-4">
          <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
          <h2 className="text-lg font-semibold text-fg">Password Updated!</h2>
          <p className="text-sm text-muted">
            Your password has been reset successfully. Redirecting you to your account...
          </p>
          <Link to="/" className="btn-primary inline-block py-2.5 px-6 text-sm">
            Go to Home
          </Link>
        </div>
      ) : (
        <form onSubmit={handleReset} className="mt-8 space-y-5">
          <div>
            <label htmlFor="reset-new-password" className="label">New password (min 12 chars)</label>
            <div className="relative">
              <input
                id="reset-new-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={12}
                autoComplete="new-password"
                placeholder="At least 12 characters"
                className="input pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted hover:text-fg"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="reset-confirm-password" className="label">Confirm new password</label>
            <div className="relative">
              <input
                id="reset-confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={12}
                autoComplete="new-password"
                placeholder="Re-enter password"
                className="input pr-12"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted pointer-events-none">
                <Lock size={18} />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-3.5"
          >
            {submitting ? 'Updating password…' : 'Reset password'}
          </button>

          <p className="text-center text-xs text-muted">
            Remembered your credentials? <Link to="/login" className="link">Back to Log in</Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
