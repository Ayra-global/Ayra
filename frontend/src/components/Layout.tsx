import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">AYRA</span>
          <span className="brand-sub">CONTEXTUAL WALLET</span>
        </div>
        <nav className="nav">
          <NavLink to="/" end>Inicio</NavLink>
          <NavLink to="/contexts">Contextos</NavLink>
          <NavLink to="/transactions">Movimientos</NavLink>
        </nav>
        <div className="user">
          <span className="avatar">{user?.name.charAt(0).toUpperCase()}</span>
          <button className="btn-ghost" onClick={logout}>Salir</button>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
