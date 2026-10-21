import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../api';
import { safeNextPath } from '../format';
import { useSession } from '../session';

export function SignupPage() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNextPath(searchParams.get('next'));
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (field: keyof typeof form) => (event: { target: { value: string } }) => setForm({ ...form, [field]: event.target.value });

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      signIn(await api.signup(form));
      navigate(next, { replace: true });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel narrow">
      <h1>Create your account</h1>
      <form className="form" onSubmit={onSubmit} data-testid="signup-form">
        <label htmlFor="signup-name">Name</label>
        <input id="signup-name" autoComplete="name" required maxLength={100} value={form.name} onChange={update('name')} data-testid="signup-name-input" />
        <label htmlFor="signup-email">Email</label>
        <input id="signup-email" type="email" autoComplete="email" required value={form.email} onChange={update('email')} data-testid="signup-email-input" />
        <label htmlFor="signup-password">Password (at least 8 characters)</label>
        <input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={form.password}
          onChange={update('password')}
          data-testid="signup-password-input"
        />
        {error && <p className="note error" role="alert" data-testid="signup-error">{error}</p>}
        <button type="submit" disabled={busy} data-testid="signup-submit-button">{busy ? 'Creating account…' : 'Sign up'}</button>
      </form>
      <p className="muted">
        Already have an account? <Link to={`/login?next=${encodeURIComponent(next)}`} data-testid="signup-login-link">Log in</Link>
      </p>
    </section>
  );
}
