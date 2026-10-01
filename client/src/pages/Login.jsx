import React, { useState, useContext } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';

const DEMO = { email: 'demo@electrohub.com', password: 'Demo@123' };

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/';

  const doLogin = async (creds) => {
    setSubmitting(true);
    try {
      await login(creds.email, creds.password);
      toast.success('Welcome back!');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (user && !submitting) return <Navigate to={redirectTo} replace />;

  return (
    <AuthLayout image="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1000&q=80&auto=format&fit=crop" heading="Welcome back" subheading="Log in to pick up where you left off.">
      <h1 className="font-display text-3xl font-semibold">Log in</h1>
      <p className="mt-1 text-sm text-muted">New here? <Link to="/register" state={location.state} className="link">Create an account</Link></p>

      <form onSubmit={(e) => { e.preventDefault(); doLogin({ email, password }); }} className="mt-8 space-y-5">
        <div>
          <label htmlFor="login-email" className="label">Email address</label>
          <input id="login-email" type="email" required autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="login-password" className="label">Password</label>
          <div className="relative">
            <input id="login-password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" className="input pr-12" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted hover:text-fg" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={submitting} className="btn-primary w-full py-3.5">{submitting ? 'Logging in…' : 'Log in'}</button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-muted">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <button onClick={() => doLogin(DEMO)} disabled={submitting} className="btn-outline w-full py-3.5">
        <Sparkles size={17} /> Explore with the demo account
      </button>
    </AuthLayout>
  );
};

export default Login;
