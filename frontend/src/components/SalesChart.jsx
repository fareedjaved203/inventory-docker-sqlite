import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { formatPakistaniCurrency } from '../utils/formatCurrency';

function SalesChart() {
  const [interval, setInterval] = useState('daily');
  const [showDateRange, setShowDateRange] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const { data, isLoading, error, refetch } = useQuery(
    ['salesAnalytics', interval, showDateRange ? dateRange : undefined],
    async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/sales-analytics`,
        {
          params: {
            interval,
            ...(showDateRange && {
              startDate: dateRange.startDate,
              endDate: dateRange.endDate
            })
          }
        }
      );
      return response.data;
    },
    {
      retry: 1,
      staleTime: 300000, // 5 minutes
      cacheTime: 600000, // 10 minutes
      refetchOnWindowFocus: false,
      onError: (error) => {
        console.error('Error fetching sales data:', error);
      }
    }
  );

  const formatDate = (date) => {
    const d = new Date(date);
    switch (interval) {
      case 'daily':
        return d.toLocaleDateString();
      case 'weekly':
        return `Week of ${d.toLocaleDateString()}`;
      case 'monthly':
        return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      case 'yearly':
        return d.getFullYear().toString();
      default:
        return d.toLocaleDateString();
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-primary-800">Sales Analytics</h2>
          <div className="flex gap-4">
            <select disabled className="border rounded-md px-3 py-1 bg-gray-100">
              <option>Daily</option>
            </select>
            <input type="date" disabled className="border rounded-md px-3 py-1 bg-gray-100" />
            <input type="date" disabled className="border rounded-md px-3 py-1 bg-gray-100" />
          </div>
        </div>
        <div className="animate-pulse h-96 bg-gray-100 rounded-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-primary-800">Sales Analytics</h2>
          <div className="flex gap-4">
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="border rounded-md px-3 py-1"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="border rounded-md px-3 py-1"
            />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
              }
              className="border rounded-md px-3 py-1"
            />
          </div>
        </div>
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 mb-4">Failed to load sales data</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasData = data && data.length > 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-primary-800">Sales Analytics</h2>
        <div className="flex gap-4">
          <div className="flex items-center gap-4">
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="border border-primary-300 rounded-md px-3 py-1 text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="daily">Daily</option>
              {/* <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option> */}
            </select>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showDateRange}
                onChange={(e) => setShowDateRange(e.target.checked)}
                className="rounded border-primary-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">Custom Date Range</span>
            </label>
          </div>
          {showDateRange && (
            <div className="flex gap-4">
              <input
                type="date"
                value={dateRange.startDate}
                max={dateRange.endDate}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="border border-primary-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <input
                type="date"
                value={dateRange.endDate}
                min={dateRange.startDate}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="border border-primary-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}
        </div>
      </div>
      <div className="h-96">
        {!hasData ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">No sales data available for the selected period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#6b7280"
              />
              <YAxis
                yAxisId="left"
                tickFormatter={(value) => formatPakistaniCurrency(value, false)}
                stroke="#0ea5e9"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => value.toFixed(0)}
                stroke="#14b8a6"
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e5e7eb'
                }}
                formatter={(value, name) => {
                  if (name === 'Total Sales') {
                    return [formatPakistaniCurrency(value), name];
                  }
                  return [value, name];
                }}
                labelFormatter={formatDate}
              />
              <Legend 
                wrapperStyle={{
                  paddingTop: '10px'
                }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="total"
                name="Total Sales"
                stroke="#0ea5e9"
                fillOpacity={1}
                fill="url(#colorTotal)"
                activeDot={{ r: 8, strokeWidth: 0 }}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="count"
                name="Number of Sales"
                stroke="#14b8a6"
                fillOpacity={1}
                fill="url(#colorCount)"
                activeDot={{ r: 8, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default SalesChart;