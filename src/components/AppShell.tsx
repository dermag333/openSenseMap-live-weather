import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink to="/" className="brand">
          openSenseMap <span>Live</span>
        </NavLink>
        <nav className="nav-links" aria-label="Hauptnavigation">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Wetter
          </NavLink>
          <NavLink
            to="/explore"
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            Karte
          </NavLink>
        </nav>
      </header>
      <main className="app-main">{children}</main>
      <footer className="app-footer">
        Daten von der{' '}
        <a href="https://api.opensensemap.org" target="_blank" rel="noreferrer">
          openSenseMap API
        </a>
        . Offizielle Plattform:{' '}
        <a href="https://opensensemap.org" target="_blank" rel="noreferrer">
          opensensemap.org
        </a>
        . Demo von{' '}
        <a href="https://github.com/dermag333" target="_blank" rel="noreferrer">
          dermag333
        </a>
        .
      </footer>
    </div>
  )
}
