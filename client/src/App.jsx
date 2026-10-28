import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/AuthContext.jsx';
import { syncClock } from './lib/clock.js';
import Navbar from './components/Navbar.jsx';
import Browse from './pages/Browse.jsx';
import AuthPage from './pages/AuthPage.jsx';
import AuctionDetail from './pages/AuctionDetail.jsx';
import AuctionForm from './pages/AuctionForm.jsx';
import MyListings from './pages/MyListings.jsx';
import MyBids from './pages/MyBids.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function App() {
  useEffect(() => {
    syncClock();
  }, []);

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Browse />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/auctions/:id" element={<AuctionDetail />} />
        <Route path="/sell" element={<Protected><AuctionForm /></Protected>} />
        <Route path="/sell/:id/edit" element={<Protected><AuctionForm /></Protected>} />
        <Route path="/my-bids" element={<Protected><MyBids /></Protected>} />
        <Route path="/my-listings" element={<Protected><MyListings /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
