import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isRegister) await register(form);
      else await login(form.email, form.password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-2 md:items-center">
      <section>
        <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
          {isRegister ? 'Join the campus handover.' : 'Welcome back.'}
        </h1>
        <p className="mt-4 max-w-md text-lg text-ink/70">
          Seniors pass on what they no longer need. Juniors bid for it. Everything happens on campus, with your
          @kongu.edu account.
        </p>
      </section>

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-ink/10 bg-white p-6">
        <h2 className="text-2xl font-bold">{isRegister ? 'Create your account' : 'Log in'}</h2>
        {isRegister && (
          <label className="block">
            <span className="mb-1 block text-base font-semibold">Full name</span>
            <input className="field" value={form.name} onChange={set('name')} autoComplete="name" required />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-base font-semibold">College email</span>
          <input
            className="field"
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="name@kongu.edu"
            autoComplete="email"
            required
          />
        </label>
        {isRegister && (
          <label className="block">
            <span className="mb-1 block text-base font-semibold">Mobile number</span>
            <input
              className="field"
              inputMode="numeric"
              maxLength={10}
              value={form.phone}
              onChange={set('phone')}
              autoComplete="tel"
              required
            />
            <span className="mt-1 block text-sm text-ink/60">
              Shared only with the seller or winner after a price is approved.
            </span>
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-base font-semibold">Password</span>
          <input
            className="field"
            type="password"
            value={form.password}
            onChange={set('password')}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
          />
        </label>

        {error && (
          <p role="alert" className="rounded-md bg-brick-soft px-3 py-2 text-base text-brick">
            {error}
          </p>
        )}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Please wait...' : isRegister ? 'Create account' : 'Log in'}
        </button>
        <p className="text-base text-ink/70">
          {isRegister ? 'Already have an account? ' : 'New here? '}
          <Link to={isRegister ? '/login' : '/register'} className="font-semibold text-pine underline">
            {isRegister ? 'Log in' : 'Create an account'}
          </Link>
        </p>
      </form>
    </main>
  );
}
