import { useAuth } from '../context/AuthContext';


export function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: 32 }}>
      <p>Logged in as {user?.username}</p>
      <button className="primary-button" onClick={logout} style={{ width: 'auto', padding: '8px 16px' }}>
        Log out
      </button>
    </div>
  );
}
