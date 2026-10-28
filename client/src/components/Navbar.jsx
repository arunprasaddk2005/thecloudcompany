import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';

const linkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-base font-semibold transition-colors ${
    isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:text-white'
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-pine-deep text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link to="/" className="font-display text-2xl font-extrabold tracking-tight">
          Handover
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-1" aria-label="Main">
          <NavLink to="/" end className={linkClass}>
            Browse
          </NavLink>
          {user && (
            <>
              <NavLink to="/my-bids" className={linkClass}>
                My bids
              </NavLink>
              <NavLink to="/sell" className={linkClass}>
                Sell an item
              </NavLink>
              <NavLink to="/my-listings" className={linkClass}>
                My listings
              </NavLink>
            </>
          )}
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <NotificationBell />
              <span className="hidden text-base text-white/80 sm:inline">{user.name}</span>
              <button
                className="btn border border-white/30 text-white hover:bg-white/10"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-3 py-2 text-base font-semibold text-white/90 hover:text-white">
                Log in
              </Link>
              <Link to="/register" className="btn bg-white text-pine-deep hover:bg-mint">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
