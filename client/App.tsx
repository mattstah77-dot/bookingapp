
function App() {
  window.Telegram?.WebApp?.ready();

  const user = window.Telegram?.WebApp?.initDataUnsafe?.user;

  return (
    <div className="text-large border p-10">
      Привет, {user?.first_name}!
    </div>
  )
}

export default App
