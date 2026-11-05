import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { Lock, Mail, User, Building, ArrowRight } from 'lucide-react';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    workspaceName: '',
    businessType: 'Agency',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await register(formData);
      toast.success('Account Created', `Welcome to Wealthra™, ${user.name}!`);
      navigate('/onboarding');
    } catch (err) {
      setError(err.message || 'Registration failed');
      toast.error('Registration Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-card p-6 sm:p-8 rounded-2xl shadow-xl bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create your business account</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Start issuing digital tax invoices and receiving verified settlements with AI intelligence.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            name="name"
            icon={User}
            value={formData.name}
            onChange={handleChange}
            placeholder="Full Name"
            required
          />
          <Input
            label="Username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="username"
            required
          />
        </div>

        <Input
          label="Email Address"
          name="email"
          type="email"
          icon={Mail}
          value={formData.email}
          onChange={handleChange}
          placeholder="name@company.com"
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Business Name"
            name="workspaceName"
            icon={Building}
            value={formData.workspaceName}
            onChange={handleChange}
            placeholder="Business Name"
            required
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Business Type
            </label>
            <select
              name="businessType"
              value={formData.businessType}
              onChange={handleChange}
              className="w-full bg-slate-100 dark:bg-charcoal-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-primary"
            >
              <option value="Freelancer">Freelancer / Independent</option>
              <option value="Agency">Digital Agency</option>
              <option value="Startup">Startup / Tech</option>
              <option value="Small Business">Small Business</option>
            </select>
          </div>
        </div>

        <Input
          label="Password"
          name="password"
          type="password"
          icon={Lock}
          value={formData.password}
          onChange={handleChange}
          placeholder="••••••••"
          required
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="w-full mt-2"
          icon={ArrowRight}
        >
          Initialize Workspace
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="text-emerald-primary hover:underline font-bold">
          Sign In
        </Link>
      </div>
    </div>
  );
};
