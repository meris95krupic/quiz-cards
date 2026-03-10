import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Game } from './pages/Game/Game';
import { Home } from './pages/Home/Home';
import { Lobby } from './pages/Lobby/Lobby';
import { Login } from './pages/Login/Login';
import { Register } from './pages/Register/Register';
import { Results } from './pages/Results/Results';
import { Room } from './pages/Room/Room';
import { Shop } from './pages/Shop/Shop';
import { useAuthStore } from './stores/authStore';

function App() {
  const { isAuthenticated, user, loadUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !user) {
      void loadUser();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/game/:id" element={<Game />} />
        <Route path="/game/:id/results" element={<Results />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/room/:id" element={<Room />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
