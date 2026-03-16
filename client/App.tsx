import { useState, useEffect } from 'react';
import BookingPage from './src/pages/BookingPage';
import AdminPage from './src/pages/AdminPage';

function App() {
  const [page, setPage] = useState<'booking' | 'admin'>('booking');
  
  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    
    // Определяем страницу по URL
    const path = window.location.pathname;
    if (path.startsWith('/admin')) {
      setPage('admin');
    } else {
      setPage('booking');
    }
  }, []);
  
  if (page === 'admin') {
    return <AdminPage />;
  }
  
  return <BookingPage />;
}

export default App;
