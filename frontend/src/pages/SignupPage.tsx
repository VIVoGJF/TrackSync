import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import logoWordmark from '../assets/logo-wordmark-dark.png';
import './LoginPage.css';

export function SignupPage() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await signup(username, email, password);
            await login(username, password);
            navigate('/profile');
        } catch (err: any) {
            const detail = err?.response?.data?.detail;
            setError(typeof detail === 'string' ? detail : 'Could not create account.');
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
                    <h1>Create account</h1>

                    <label className="field">
                        <span>Username</span>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            minLength={3}
                            maxLength={30}
                            required
                        />
                    </label>

                    <label className="field">
                        <span>Email</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                        />
                    </label>

                    <label className="field">
                        <span>Password</span>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                            minLength={8}
                            required
                        />
                    </label>

                    {error && <p className="form-error" role="alert">{error}</p>}

                    <button type="submit" className="primary-button" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating account…' : 'Create account'}
                    </button>

                    <p className="form-footer">
                        Already have an account? <Link to="/login">Log in</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
