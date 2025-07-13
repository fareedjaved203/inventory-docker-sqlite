import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import DashboardCard from '../components/DashboardCard';
import SalesChart from '../components/SalesChart';
import SalesTrendChart from '../components/SalesTrendChart';
import { FaBox, FaWarehouse, FaExclamationTriangle, FaCalendarDay, FaCalendarWeek, FaCalendarAlt, FaCalendar } from 'react-icons/fa';
import { RiMoneyDollarCircleFill } from "react-icons/ri";
import { MdOutlinePayments } from "react-icons/md";
import { formatPakistaniCurrency } from '../utils/formatCurrency';

function Dashboard() {
  const navigate = useNavigate();
  
  // Fetch basic dashboard data
  const { data, isLoading, error } = useQuery(['dashboard'], async () => {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard`);
    return response.data;
  }, {
    retry: 2,
    staleTime: 30000
  });

  // Fetch enhanced sales statistics
  const { data: salesStats, isLoading: isLoadingStats, error: statsError } = useQuery(['dashboard-stats'], async () => {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/stats`);
    return response.data;
  }, {
    retry: 2,
    staleTime: 30000
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

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-primary-800">Dashboard</h1>
      
      {/* Inventory Stats */}
      <ErrorBoundary>
        <h2 className="text-xl font-semibold mb-4 text-primary-700">Inventory Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <DashboardCard
            title="Total Products"
            value={data?.totalProducts || 0}
            icon={<FaBox className="text-xl" />}
            color="blue"
            isLoading={isLoading}
            error={error}
          />
          <DashboardCard
            title="Total Inventory"
            value={data?.totalInventory || 0}
            icon={<FaWarehouse className="text-xl" />}
            color="indigo"
            isLoading={isLoading}
            error={error}
          />
          <DashboardCard
            title="Low Stock Items"
            value={data?.lowStock || 0}
            icon={<FaExclamationTriangle className="text-xl" />}
            color="amber"
            isLoading={isLoading}
            error={error}
            onClick={handleLowStockClick}
            subtitle="Click to view details"
          />
        </div>
      </ErrorBoundary>

      {/* Sales Stats */}
      <ErrorBoundary>
        <h2 className="text-xl font-semibold mb-4 text-primary-700">Sales Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard
            title="Sales Today"
            value={formatPakistaniCurrency(salesStats?.salesToday || 0)}
            icon={<FaCalendarDay className="text-xl" />}
            color="emerald"
            isLoading={isLoadingStats}
            error={statsError}
          />
          <DashboardCard
            title="Last 7 Days"
            value={formatPakistaniCurrency(salesStats?.salesLast7Days || 0)}
            icon={<FaCalendarWeek className="text-xl" />}
            color="teal"
            isLoading={isLoadingStats}
            error={statsError}
          />
          <DashboardCard
            title="Last 30 Days"
            value={formatPakistaniCurrency(salesStats?.salesLast30Days || 0)}
            icon={<FaCalendarAlt className="text-xl" />}
            color="cyan"
            isLoading={isLoadingStats}
            error={statsError}
          />
          <DashboardCard
            title="Last 365 Days"
            value={formatPakistaniCurrency(salesStats?.salesLast365Days || 0)}
            icon={<FaCalendar className="text-xl" />}
            color="sky"
            isLoading={isLoadingStats}
            error={statsError}
          />
        </div>
      </ErrorBoundary>

      {/* Profit Overview */}
      <ErrorBoundary>
        <h2 className="text-xl font-semibold mb-4 text-primary-700">Profit Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard
            title="Profit Today"
            value={formatPakistaniCurrency(salesStats?.profitToday || 0)}
            icon={<FaCalendarDay className="text-xl" />}
            color="violet"
            isLoading={isLoadingStats}
            error={statsError}
          />
          <DashboardCard
            title="Last 7 Days"
            value={formatPakistaniCurrency(salesStats?.profitLast7Days || 0)}
            icon={<FaCalendarWeek className="text-xl" />}
            color="purple"
            isLoading={isLoadingStats}
            error={statsError}
          />
          <DashboardCard
            title="Last 30 Days"
            value={formatPakistaniCurrency(salesStats?.profitLast30Days || 0)}
            icon={<FaCalendarAlt className="text-xl" />}
            color="fuchsia"
            isLoading={isLoadingStats}
            error={statsError}
          />
          <DashboardCard
            title="Last 365 Days"
            value={formatPakistaniCurrency(salesStats?.profitLast365Days || 0)}
            icon={<FaCalendar className="text-xl" />}
            color="pink"
            isLoading={isLoadingStats}
            error={statsError}
          />
        </div>
      </ErrorBoundary>

      {/* Financial Overview */}
      <ErrorBoundary>
        <h2 className="text-xl font-semibold mb-4 text-primary-700">Financial Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard
            title="Total Sales"
            value={formatPakistaniCurrency(data?.totalSales || 0)}
            icon={<RiMoneyDollarCircleFill className="text-xl" />}
            color="slate"
            isLoading={isLoading}
            error={error}
          />
          <DashboardCard
            title="Purchase Due"
            value={formatPakistaniCurrency(salesStats?.totalPurchaseDueAmount || 0)}
            icon={<MdOutlinePayments className="text-xl" />}
            color="rose"
            isLoading={isLoadingStats}
            error={statsError}
            onClick={handlePendingPurchasePaymentsClick}
            subtitle="Click to view"
          />
          <DashboardCard
            title="Sales Due"
            value={formatPakistaniCurrency(salesStats?.totalSalesDueAmount || 0)}
            icon={<MdOutlinePayments className="text-xl" />}
            color="orange"
            isLoading={isLoadingStats}
            error={statsError}
            onClick={handlePendingSalePaymentsClick}
            subtitle="Click to view"
          />
          <DashboardCard
            title="Due Credits"
            value={formatPakistaniCurrency(salesStats?.totalDueCredits || 0)}
            icon={<RiMoneyDollarCircleFill className="text-xl" />}
            color="lime"
            isLoading={isLoadingStats}
            error={statsError}
            onClick={handleDueCreditsClick}
            subtitle="Click to view"
          />
        </div>
      </ErrorBoundary>

      <ErrorBoundary>
        <div className="mb-8">
          <SalesTrendChart />
        </div>
      </ErrorBoundary>
      
      <ErrorBoundary>
        <div className="mb-8">
          <SalesChart />
        </div>
      </ErrorBoundary>
    </div>
  );
}

export default Dashboard;