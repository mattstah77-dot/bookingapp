import { useState, useEffect } from 'react';
import BookingPage from './src/pages/BookingPage';
import AdminPage from './src/pages/AdminPage';
import ServicesPage from './src/pages/ServicesPage';
import MyBookingsPage from './src/pages/MyBookingsPage';

function App() {
  const [page, setPage] = useState<'booking' | 'admin' | 'services' | 'my-bookings'>('booking');
  
  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    
    // Определяем страницу по URL
    const path = window.location.pathname;
    if (path === '/my-bookings') {
      setPage('my-bookings');
    } else if (path === '/admin/services' || path === '/services') {
      setPage('services');
    } else if (path.startsWith('/admin')) {
      setPage('admin');
    } else {
      setPage('booking');
    }
  }, []);
  
  if (page === 'my-bookings') {
    return <MyBookingsPage />;
  }
  
  if (page === 'services') {
    return <ServicesPage />;
  }
  
  if (page === 'admin') {
    return <AdminPage />;
  }
  
  return <BookingPage />;
}

export default App;
