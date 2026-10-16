import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound, CheckCircle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import AuthLayout from '../components/AuthLayout';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetData, setResetData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setResetData(res.data.data);
      toast.success('Password reset link created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      image="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1000&q=80&auto=format&fit=crop"
      heading="Reset your password"
      subheading="We will generate a secure reset link to help you regain access."
    >
      <div className="mb-6">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg font-medium transition">
          <ArrowLeft size={16} /> Back to Log in
        </Link>
      </div>

      <h1 className="font-display text-3xl font-semibold">Forgot password</h1>
      <p className="mt-1 text-sm text-muted">
        Enter the email address associated with your account.
      </p>

      {resetData ? (
        <div className="mt-6 space-y-5 rounded-2xl border border-line bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 text-emerald-500">
            <CheckCircle size={24} />
            <span className="font-semibold text-fg">Reset Link Ready</span>
          </div>
          <p className="text-sm text-muted">
            In this demo environment, a secure time-limited token has been generated for{' '}
            <strong className="text-fg">{resetData.email}</strong>.
          </p>
          <div className="rounded-xl bg-surface p-4 border border-line">
            <div className="text-xs uppercase font-bold tracking-wider text-muted mb-2">Simulated Reset Link</div>
            <Link
              to={`/reset-password?token=${encodeURIComponent(resetData.resetToken)}`}
              className="btn-primary inline-flex items-center gap-2 py-2.5 px-4 text-sm w-full justify-center"
            >
              <KeyRound size={16} /> Proceed to Reset Password <ExternalLink size={14} />
            </Link>
          </div>
          <p className="text-xs text-muted text-center">
            Link is valid for 30 minutes. You can also re-enter an email below to generate a new token.
          </p>
          <button
            type="button"
            onClick={() => setResetData(null)}
            className="btn-outline w-full py-2.5 text-xs font-semibold"
          >
            Request Another Link
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="forgot-email" className="label">Email address</label>
            <div className="relative">
              <input
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                placeholder="e.g. demo@electrohub.com"
                className="input pl-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 grid w-11 place-items-center text-muted">
                <Mail size={18} />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-3.5"
          >
            {submitting ? 'Generating link…' : 'Send reset instructions'}
          </button>

          <p className="text-center text-xs text-muted">
            Remembered your password? <Link to="/login" className="link">Log in</Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
