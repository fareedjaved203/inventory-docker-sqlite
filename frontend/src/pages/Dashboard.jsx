import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DashboardSkeleton from '../components/DashboardSkeleton';
import SalesChart from '../components/SalesChart';
import SalesTrendChart from '../components/SalesTrendChart';
import PendingPaymentsWidget from '../components/PendingPaymentsWidget';
import { FaBox, FaWarehouse, FaExclamationTriangle, FaCalendarDay, FaCalendarWeek, FaCalendarAlt, FaCalendar } from 'react-icons/fa';
import { RiMoneyDollarCircleFill } from "react-icons/ri";
import { MdOutlinePayments } from "react-icons/md";
import { formatPakistaniCurrency } from '../utils/formatCurrency';

function Dashboard() {
  const navigate = useNavigate();
  
  // Fetch basic dashboard data
  const { data, isLoading } = useQuery(['dashboard'], async () => {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard`);
    return response.data;
  });

  // Fetch enhanced sales statistics
  const { data: salesStats, isLoading: isLoadingStats } = useQuery(['dashboard-stats'], async () => {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/stats`);
    return response.data;
  });

  const handleLowStockClick = () => {
    navigate('/products', { state: { showLowStock: true } });
  };

  const handlePendingPurchasePaymentsClick = () => {
    navigate('/bulk', { state: { showPendingPayments: true } });
  };
  
  const handlePendingSalePaymentsClick = () => {
    navigate('/sales', { state: { showPendingPayments: true } });
  };

  const handleDueCreditsClick = () => {
    navigate('/sales', { state: { showCreditBalance: true } });
  };

  if (isLoading || isLoadingStats) return <DashboardSkeleton />;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-primary-800">Dashboard</h1>
      
      {/* Inventory Stats */}
      <h2 className="text-xl font-semibold mb-4 text-primary-700">Inventory Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 p-6 rounded-lg shadow-md border border-primary-200">
          <div className="flex items-center justify-between">
            <h2 className="text-primary-600 text-sm font-medium">Total Products</h2>
            <div className="p-2 bg-primary-500 text-white rounded-full">
              <FaBox className="text-xl" />
            </div>
          </div>
          <p className="text-3xl font-bold mt-2 text-primary-800">{data?.totalProducts}</p>
        </div>
        <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 p-6 rounded-lg shadow-md border border-secondary-200">
          <div className="flex items-center justify-between">
            <h2 className="text-secondary-600 text-sm font-medium">Total Inventory</h2>
            <div className="p-2 bg-secondary-500 text-white rounded-full">
              <FaWarehouse className="text-xl" />
            </div>
          </div>
          <p className="text-3xl font-bold mt-2 text-secondary-800">{data?.totalInventory}</p>
        </div>
        <div 
          className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg shadow-md border border-orange-200 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={handleLowStockClick}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-orange-600 text-sm font-medium">Low Stock Items</h2>
            <div className="p-2 bg-orange-500 text-white rounded-full">
              <FaExclamationTriangle className="text-xl" />
            </div>
          </div>
          <p className="text-3xl font-bold mt-2 text-orange-700">{data?.lowStock}</p>
          <p className="text-sm text-orange-600 mt-2">Click to view details</p>
        </div>
      </div>

      {/* Sales Stats */}
      <h2 className="text-xl font-semibold mb-4 text-primary-700">Sales Performance</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg shadow-md border border-green-200">
          <div className="flex items-center justify-between">
            <h2 className="text-green-600 text-sm font-medium">Sales Today</h2>
            <div className="p-2 bg-green-500 text-white rounded-full">
              <FaCalendarDay className="text-xl" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-green-700 truncate" title={formatPakistaniCurrency(salesStats?.salesToday || 0)}>
            {formatPakistaniCurrency(salesStats?.salesToday || 0)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg shadow-md border border-green-200">
          <div className="flex items-center justify-between">
            <h2 className="text-green-600 text-sm font-medium">Last 7 Days</h2>
            <div className="p-2 bg-green-500 text-white rounded-full">
              <FaCalendarWeek className="text-xl" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-green-700 truncate" title={formatPakistaniCurrency(salesStats?.salesLast7Days || 0)}>
            {formatPakistaniCurrency(salesStats?.salesLast7Days || 0)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg shadow-md border border-green-200">
          <div className="flex items-center justify-between">
            <h2 className="text-green-600 text-sm font-medium">Last 30 Days</h2>
            <div className="p-2 bg-green-500 text-white rounded-full">
              <FaCalendarAlt className="text-xl" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-green-700 truncate" title={formatPakistaniCurrency(salesStats?.salesLast30Days || 0)}>
            {formatPakistaniCurrency(salesStats?.salesLast30Days || 0)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg shadow-md border border-green-200">
          <div className="flex items-center justify-between">
            <h2 className="text-green-600 text-sm font-medium">Last 365 Days</h2>
            <div className="p-2 bg-green-500 text-white rounded-full">
              <FaCalendar className="text-xl" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-green-700 truncate" title={formatPakistaniCurrency(salesStats?.salesLast365Days || 0)}>
            {formatPakistaniCurrency(salesStats?.salesLast365Days || 0)}
          </p>
        </div>
      </div>

      {/* Profit Overview */}
      <h2 className="text-xl font-semibold mb-4 text-primary-700">Profit Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg shadow-md border border-purple-200">
          <div className="flex items-center justify-between">
            <h2 className="text-purple-600 text-sm font-medium">Profit Today</h2>
            <div className="p-2 bg-purple-500 text-white rounded-full">
              <FaCalendarDay className="text-xl" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-purple-700 truncate" title={formatPakistaniCurrency(salesStats?.profitToday || 0)}>
            {formatPakistaniCurrency(salesStats?.profitToday || 0)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg shadow-md border border-purple-200">
          <div className="flex items-center justify-between">
            <h2 className="text-purple-600 text-sm font-medium">Last 7 Days</h2>
            <div className="p-2 bg-purple-500 text-white rounded-full">
              <FaCalendarWeek className="text-xl" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-purple-700 truncate" title={formatPakistaniCurrency(salesStats?.profitLast7Days || 0)}>
            {formatPakistaniCurrency(salesStats?.profitLast7Days || 0)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg shadow-md border border-purple-200">
          <div className="flex items-center justify-between">
            <h2 className="text-purple-600 text-sm font-medium">Last 30 Days</h2>
            <div className="p-2 bg-purple-500 text-white rounded-full">
              <FaCalendarAlt className="text-xl" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-purple-700 truncate" title={formatPakistaniCurrency(salesStats?.profitLast30Days || 0)}>
            {formatPakistaniCurrency(salesStats?.profitLast30Days || 0)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg shadow-md border border-purple-200">
          <div className="flex items-center justify-between">
            <h2 className="text-purple-600 text-sm font-medium">Last 365 Days</h2>
            <div className="p-2 bg-purple-500 text-white rounded-full">
              <FaCalendar className="text-xl" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-purple-700 truncate" title={formatPakistaniCurrency(salesStats?.profitLast365Days || 0)}>
            {formatPakistaniCurrency(salesStats?.profitLast365Days || 0)}
          </p>
        </div>
      </div>

      {/* Financial Overview */}
      <h2 className="text-xl font-semibold mb-4 text-primary-700">Financial Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-accent-50 to-accent-100 p-6 rounded-lg shadow-md border border-accent-200">
          <div className="flex items-center justify-between">
            <h2 className="text-accent-600 text-sm font-medium">Total Sales</h2>
            <div className="p-2 bg-accent-500 text-white rounded-full">
              <RiMoneyDollarCircleFill className="text-xl" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold mt-2 text-accent-700 truncate" title={formatPakistaniCurrency(data?.totalSales || 0)}>
            {formatPakistaniCurrency(data?.totalSales || 0)}
          </p>
        </div>
        
        <div 
          className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg shadow-md border border-red-200 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={handlePendingPurchasePaymentsClick}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-red-600 text-sm font-medium">Purchase Due</h2>
            <div className="p-2 bg-red-500 text-white rounded-full">
              <MdOutlinePayments className="text-xl" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold mt-2 text-red-700 truncate" title={formatPakistaniCurrency(salesStats?.totalPurchaseDueAmount || 0)}>
            {formatPakistaniCurrency(salesStats?.totalPurchaseDueAmount || 0)}
          </p>
          <p className="text-xs text-red-600 mt-2">Click to view</p>
        </div>
        
        <div 
          className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg shadow-md border border-yellow-200 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={handlePendingSalePaymentsClick}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-yellow-600 text-sm font-medium">Sales Due</h2>
            <div className="p-2 bg-yellow-500 text-white rounded-full">
              <MdOutlinePayments className="text-xl" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold mt-2 text-yellow-700 truncate" title={formatPakistaniCurrency(salesStats?.totalSalesDueAmount || 0)}>
            {formatPakistaniCurrency(salesStats?.totalSalesDueAmount || 0)}
          </p>
          <p className="text-xs text-yellow-600 mt-2">Click to view</p>
        </div>
        
        <div 
          className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg shadow-md border border-green-200 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={handleDueCreditsClick}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-green-600 text-sm font-medium">Due Credits</h2>
            <div className="p-2 bg-green-500 text-white rounded-full">
              <RiMoneyDollarCircleFill className="text-xl" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold mt-2 text-green-700 truncate" title={formatPakistaniCurrency(salesStats?.totalDueCredits || 0)}>
            {formatPakistaniCurrency(salesStats?.totalDueCredits || 0)}
          </p>
          <p className="text-xs text-green-600 mt-2">Click to view</p>
        </div>
      </div>

      <div className="mb-8">
        <SalesTrendChart />
      </div>
      
      <div className="mb-8">
        <SalesChart />
      </div>
    </div>
  );
}

export default Dashboard;