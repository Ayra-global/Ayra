import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="brand-link" aria-label="Inicio AYRA">
          <Logo size={30} subtitle={false} />
        </NavLink>
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
