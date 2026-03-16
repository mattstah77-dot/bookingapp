import BookingPage from './src/pages/BookingPage';

function App() {
  window.Telegram?.WebApp?.ready();
  
  return <BookingPage />;
}

export default App