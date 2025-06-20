import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaMoneyBillWave } from 'react-icons/fa';
import { formatPakistaniCurrency } from '../utils/formatCurrency';

function PendingPaymentsWidget() {
  const navigate = useNavigate();
  
  const { data, isLoading } = useQuery(['pendingPayments'], async () => {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/bulk-purchases/pending-payments?limit=5`);
    return response.data;
  });

  const handleClick = () => {
    navigate('/bulk', { state: { showPendingPayments: true } });
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const pendingPayments = data?.items || [];
  const totalPending = pendingPayments.reduce((sum, purchase) => 
    sum + (purchase.totalAmount - purchase.paidAmount), 0
  );

  return (
    <div 
      className="bg-white p-6 rounded-lg shadow cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-gray-500 text-sm font-medium">Pending Payments</h2>
        <FaMoneyBillWave className="text-yellow-500 text-3xl" />
      </div>
      <p className="text-3xl font-bold mt-2 text-yellow-600">
        {pendingPayments.length}
      </p>
      {pendingPayments.length > 0 && (
        <div className="mt-2">
          <p className="text-sm text-gray-500 truncate" title={`Total amount due: ${formatPakistaniCurrency(totalPending)}`}>Total amount due: {formatPakistaniCurrency(totalPending)}</p>
          <p className="text-sm text-gray-500 mt-1">Click to view details</p>
        </div>
      )}
    </div>
  );
}

export default PendingPaymentsWidget;