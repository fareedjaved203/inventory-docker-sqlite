import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { FaChevronLeft, FaChevronRight, FaChartLine, FaBoxOpen, FaMoneyBillWave, FaBuilding, FaShoppingCart, FaUndo, FaCog } from 'react-icons/fa';

function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const { data: shopSettings } = useQuery(['shop-settings'], async () => {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/shop-settings`);
    return response.data;
  }, {
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: <FaChartLine /> },
    { path: '/products', label: 'Products', icon: <FaBoxOpen /> },
    { path: '/sales', label: 'Sales', icon: <FaMoneyBillWave /> },
    { path: '/contacts', label: 'Contacts', icon: <FaBuilding /> },
    { path: '/bulk', label: 'Bulk Purchasing', icon: <FaShoppingCart /> },
    { path: '/returns', label: 'Returns', icon: <FaUndo /> },
    { path: '/settings', label: 'Settings', icon: <FaCog /> },
  ];

  return (
    <div className={`${collapsed ? 'w-16' : 'w-64'} bg-gradient-to-b from-primary-700 to-primary-900 text-white shadow-lg h-full flex flex-col transition-all duration-300`}>
      <div className={`p-4 flex ${collapsed ? 'justify-center' : 'justify-between'} items-center border-b border-primary-600`}>
        {!collapsed && (
          <div>
            <h1 className="text-xl font-bold text-white">
              {shopSettings?.shopName || 'Inventory System'}
            </h1>
          </div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          className="p-2 rounded-full hover:bg-primary-600 text-white"
        >
          {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
        </button>
      </div>
      <nav className="mt-6 flex-1">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center ${collapsed ? 'justify-center' : 'px-6'} py-3 text-white hover:bg-primary-600 transition-colors ${
              location.pathname === item.path ? 'bg-primary-600 border-l-4 border-accent-400' : ''
            }`}
            title={collapsed ? item.label : ''}
          >
            <span className="text-xl mr-4">{item.icon}</span>
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
          </Link>
        ))}
      </nav>
      <div className="p-4 text-center text-xs text-primary-300">
        {!collapsed && <p>Inventory Management</p>}
      </div>
    </div>
  );
}

export default Sidebar;