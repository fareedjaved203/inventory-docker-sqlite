import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { formatPakistaniCurrency } from '../utils/formatCurrency';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function SalesTrendChart() {
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');

  const { data: salesData, isLoading } = useQuery(
    ['sales-analytics', selectedPeriod],
    async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/sales-analytics?interval=${selectedPeriod}`
      );
      return response.data;
    }
  );

  const formatXAxisLabel = (dateString, period) => {
    const date = new Date(dateString);
    
    switch (period) {
      case 'weekly':
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      case 'monthly':
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      case 'yearly':
        return date.getFullYear().toString();
      default:
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const chartData = {
    labels: salesData?.map(item => formatXAxisLabel(item.date, selectedPeriod)) || [],
    datasets: [
      {
        label: 'Sales Amount',
        data: salesData?.map(item => item.total) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Sales Trend`,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Sales: ${formatPakistaniCurrency(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatPakistaniCurrency(value);
          }
        }
      }
    },
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Sales Trend</h3>
        <div className="flex space-x-2">
          {['weekly', 'monthly', 'yearly'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedPeriod === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="w-full h-64">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

export default SalesTrendChart;