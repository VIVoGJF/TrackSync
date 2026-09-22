import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoWordmark from '../assets/logo-wordmark-dark.png';
import './LoginPage.css';

export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await login(identifier, password);
            navigate('/profile');
        } catch {
            setError('Incorrect email/username or password.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="login-screen">
            <div className="login-brand-panel">
                <img src={logoWordmark} alt="TrackSync" className="login-logo" />
            </div>

            <div className="login-form-panel">
                <form className="login-form" onSubmit={handleSubmit}>
                    <h1>Log in</h1>

                    <label className="field">
                        <span>Email or username</span>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            autoComplete="username"
                            required
                        />
                    </label>

                    <label className="field">
                        <span>Password</span>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </label>

                    {error && <p className="form-error" role="alert">{error}</p>}

                    <button type="submit" className="primary-button" disabled={isSubmitting}>
                        {isSubmitting ? 'Logging in…' : 'Log in'}
                    </button>

                    <p className="form-footer">
                        Don't have an account? <Link to="/signup">Create one</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
