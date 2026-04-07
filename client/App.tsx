import { useState, useEffect } from 'react';
import BookingPage from './src/pages/BookingPage';
import AdminPage from './src/pages/AdminPage';
import ServicesPage from './src/pages/ServicesPage';
import MyBookingsPage from './src/pages/MyBookingsPage';
import LeadFormPage from './src/pages/LeadFormPage';
import { getBotIdFromUrl } from './src/utils';

const API_BASE = '/api';

function App() {
  const [page, setPage] = useState<'loading' | 'booking' | 'admin' | 'services' | 'my-bookings' | 'leads'>('loading');
  
  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    
    const path = window.location.pathname;
    const botId = getBotIdFromUrl();
    
    // Админские страницы по URL
    if (path === '/my-bookings') {
      setPage('my-bookings');
      return;
    }
    
    if (path === '/admin/services' || path === '/services') {
      setPage('services');
      return;
    }
    
    if (path.startsWith('/admin')) {
      setPage('admin');
      return;
    }
    
    // Определяем тип бота для клиентских страниц
    const determinePage = async () => {
      try {
        const res = await fetch(`${API_BASE}/bots/${botId}/type`, {
          headers: { 'x-bot-id': String(botId) },
        });
        const data = await res.json();
        
        if (data.type === 'leads') {
          setPage('leads');
        } else {
          setPage('booking');
        }
      } catch {
        // По умолчанию booking если не удалось определить
        setPage('booking');
      }
    };
    
    if (botId) {
      determinePage();
    } else {
      setPage('booking');
    }
  }, []);
  
  if (page === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  if (page === 'my-bookings') {
    return <MyBookingsPage />;
  }
  
  if (page === 'services') {
    return <ServicesPage />;
  }
  
  if (page === 'admin') {
    return <AdminPage />;
  }
  
  if (page === 'leads') {
    return <LeadFormPage />;
  }
  
  return <BookingPage />;
}

export default App;
