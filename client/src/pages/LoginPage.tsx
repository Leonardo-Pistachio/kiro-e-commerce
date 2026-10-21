import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../api';
import { safeNextPath } from '../format';
import { useSession } from '../session';

export function LoginPage() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNextPath(searchParams.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      signIn(await api.login({ email, password }));
      navigate(next, { replace: true });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel narrow">
      <h1>Log in</h1>
      <form className="form" onSubmit={onSubmit} data-testid="login-form">
        <label htmlFor="login-email">Email</label>
        <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} data-testid="login-email-input" />
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          data-testid="login-password-input"
        />
        {error && <p className="note error" role="alert" data-testid="login-error">{error}</p>}
        <button type="submit" disabled={busy} data-testid="login-submit-button">{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <p className="muted">
        New here? <Link to={`/signup?next=${encodeURIComponent(next)}`} data-testid="login-signup-link">Create an account</Link>
      </p>
    </section>
  );
}
