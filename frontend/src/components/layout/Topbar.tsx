import { Bell, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import './Topbar.css'

export function Topbar({ title }: { title: string }) {
  const { user } = useAuth()

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2>{title}</h2>
      </div>
      <div className="topbar-right">
        <div className="search">
          <Search size={16} />
          <input placeholder="Search..." aria-label="Search" />
        </div>
        <button className="icon-btn" aria-label="Notifications (5)">
          <Bell size={18} />
          <span className="notif-dot">5</span>
        </button>
        <div className="top-user">
          <div className="avatar sm">{user?.initials}</div>
          <span>{user?.name?.split(' ')[0]}</span>
        </div>
      </div>
    </header>
  )
}
