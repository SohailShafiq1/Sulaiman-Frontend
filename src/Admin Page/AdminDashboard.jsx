import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Footer from '../components/Footer';
import './AdminDashboard.css';
import { FaTachometerAlt, FaList, FaTrophy, FaUserFriends, FaNewspaper, FaUserShield, FaEllipsisV, FaSignOutAlt, FaImage } from 'react-icons/fa';

const AdminDashboard = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user] = useState(() => {
    const adminUser = localStorage.getItem('adminUser');
    return adminUser ? JSON.parse(adminUser) : null;
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!user || !token) {
      navigate('/admin/login');
    }
  }, [user, navigate]);

  const allMenuItems = [
    { title: 'Dashboard', icon: <FaTachometerAlt />, path: '/admin' },
    { title: 'Categories', icon: <FaList />, path: '/admin/categories' },
    { title: 'Tournament', icon: <FaTrophy />, path: '/admin/tournaments' },
    { title: 'Piegon Owners', icon: <FaUserFriends />, path: '/admin/owners' },
    { title: 'News', icon: <FaNewspaper />, path: '/admin/news' },
    { title: 'Admin Users', icon: <FaUserShield />, path: '/admin/users' },
    { title: 'Default Banner', icon: <FaImage />, path: '/admin/settings' },
  ];

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => {
    // Only Super Admin can see Admin Users
    if (item.path === '/admin/users') {
      return user?.role === 'Super Admin';
    }

    // Normal Admin should only see Dashboard and Tournament
    if (user?.role !== 'Super Admin') {
      return item.path === '/admin' || item.path === '/admin/tournaments';
    }

    // Super Admin sees everything
    return true;
  });

  // Hard-route protection: prevent normal Admins from opening restricted pages via URL
  useEffect(() => {
    if (!user) return;
    if (user.role !== 'Super Admin') {
      const allowedPaths = ['/admin', '/admin/tournaments'];
      const currentPath = location.pathname;
      const isAllowed = allowedPaths.some(p => currentPath === p || currentPath.startsWith(`${p}/`));

      if (!isAllowed) {
        navigate('/admin/tournaments', { replace: true });
      }
    }
  }, [user, location.pathname, navigate]);

  const handleMenuClick = (path) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  const getPageTitle = () => {
    const currentItem = allMenuItems.find(item => item.path === location.pathname);
    return currentItem ? currentItem.title : 'Admin Panel';
  };

  if (!user) return null;

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="header-left">
          <h2>{getPageTitle()}</h2>
        </div>
        <div className="header-right">
          <span className="user-info">{user.name} ({user.role})</span>
          <FaSignOutAlt className="logout-icon" onClick={handleLogout} title="Logout" />
          <FaEllipsisV 
            className="menu-dots" 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
          />
        </div>
      </div>

      <div className={`admin-sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Admin Panel</h2>
        </div>
        <ul className="sidebar-menu">
          {menuItems.map((item, index) => (
            <li 
              key={index} 
              className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => handleMenuClick(item.path)}
            >
              <span className="icon">{item.icon}</span>
              <span className="title">{item.title}</span>
            </li>
          ))}
        </ul>
      </div>

      {isMenuOpen && <div className="menu-overlay" onClick={() => setIsMenuOpen(false)}></div>}

      <div className="admin-content-area">
        <div className="admin-main-container">
          <Outlet />
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default AdminDashboard;
