import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import TableSkeleton from '../components/TableSkeleton';
import { formatPakistaniCurrency } from '../utils/formatCurrency';
import { debounce } from 'lodash';
import { FaSearch } from 'react-icons/fa';

function Returns() {
  const searchInputRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const debouncedSearch = useCallback(
    debounce((term) => {
      setDebouncedSearchTerm(term);
      setCurrentPage(1);
    }, 300),
    []
  );

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    debouncedSearch(e.target.value);
  };

  // Fetch returns
  const { data: returns, isLoading } = useQuery(
    ['returns', debouncedSearchTerm, currentPage],
    async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/returns?search=${debouncedSearchTerm}&page=${currentPage}&limit=${itemsPerPage}`);
      return response.data;
    }
  );

    // Maintain search input focus
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [returns]);

  if (isLoading) return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-8">
        <div className="h-8 bg-gray-300 rounded w-48 animate-pulse"></div>
      </div>
      <TableSkeleton rows={10} columns={6} />
    </div>
  );

  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-primary-800">Returned Items</h1>
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by bill number..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full sm:w-48 md:w-64 pl-10 pr-3 py-2 text-sm border border-primary-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-primary-400">
            <FaSearch />
          </div>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-x-auto border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-red-50 to-red-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Return #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Original Sale</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Items</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Return Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Refund Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Reason</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {returns?.items?.map((returnItem) => (
              <tr key={returnItem.id} className="hover:bg-red-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-red-700">
                  {returnItem.returnNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-primary-700">
                  #{returnItem.sale.billNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                  {new Date(returnItem.returnDate).toLocaleDateString('en-GB')}
                </td>
                <td className="px-6 py-4 text-gray-700">
                  {returnItem.items?.map((item, index) => (
                    <div key={index} className="text-sm">
                      {item.product?.name || 'Unknown Product'} × {item.quantity}
                    </div>
                  ))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-red-800">
                  {formatPakistaniCurrency(returnItem.totalAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    returnItem.refundPaid 
                      ? 'bg-green-100 text-green-800' 
                      : (returnItem.refundAmount > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600')
                  }`}>
                    {returnItem.refundPaid ? 'Refunded' : (returnItem.refundAmount > 0 ? 'Pending' : 'No Refund')}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-700">
                  <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {returnItem.reason || 'No reason provided'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {returns?.totalPages > 1 && (
        <div className="flex justify-center items-center mt-6 space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <span className="px-3 py-2 text-sm text-gray-700">
            Page {currentPage} of {returns.totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, returns.totalPages))}
            disabled={currentPage === returns.totalPages}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default Returns;