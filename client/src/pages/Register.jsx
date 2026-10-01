import React, { useState, useContext } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';
import api from '../utils/api';

const passwordStrength = (pw) => {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return score;
};
const STRENGTH = [
  { label: 'Too short', color: 'bg-danger' },
  { label: 'Weak', color: 'bg-danger' },
  { label: 'Fair', color: 'bg-warning' },
  { label: 'Good', color: 'bg-success' },
  { label: 'Strong', color: 'bg-success' },
];

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', gender: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/';

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password.length < 6) return toast.error('Password must be at least 6 characters');
    setSubmitting(true);
    try {
      const res = await api.post('/auth/register', formData);
      localStorage.setItem('token', res.data.data.token);
      setUser(res.data.data.user);
      toast.success('Welcome to ElectroHub!');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (user && !submitting) return <Navigate to={redirectTo} replace />;

  const strength = passwordStrength(formData.password);

  return (
    <AuthLayout image="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1000&q=80&auto=format&fit=crop" heading="Join ElectroHub" subheading="Unlock exclusive offers, faster checkout and order tracking.">
      <h1 className="font-display text-3xl font-semibold">Create account</h1>
      <p className="mt-1 text-sm text-muted">Already have one? <Link to="/login" state={location.state} className="link">Log in</Link></p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="reg-name" className="label">Full name</label>
          <input id="reg-name" name="name" required autoComplete="name" className="input" value={formData.name} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="reg-email" className="label">Email address</label>
          <input id="reg-email" type="email" name="email" required autoComplete="email" className="input" value={formData.email} onChange={handleChange} />
        </div>
        <div>
          <label htmlFor="reg-password" className="label">Password</label>
          <div className="relative">
            <input id="reg-password" type={showPassword ? 'text' : 'password'} name="password" required minLength={6} autoComplete="new-password" className="input pr-12" value={formData.password} onChange={handleChange} aria-describedby="password-strength" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted hover:text-fg" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
          {formData.password && (
            <div id="password-strength" className="mt-2 flex items-center gap-3">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4].map(n => <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= strength ? STRENGTH[strength].color : 'bg-surface-3'}`} />)}
              </div>
              <span className="text-xs font-bold text-muted">{STRENGTH[strength].label}</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="reg-phone" className="label">Phone (optional)</label>
            <input id="reg-phone" name="phone" inputMode="tel" autoComplete="tel-national" className="input" value={formData.phone} onChange={handleChange} />
          </div>
          <div>
            <label htmlFor="reg-gender" className="label">Gender (optional)</label>
            <select id="reg-gender" name="gender" className="input" value={formData.gender} onChange={handleChange}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <button type="submit" disabled={submitting} className="btn-primary mt-2 w-full py-3.5">{submitting ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthLayout>
  );
};

export default Register;
