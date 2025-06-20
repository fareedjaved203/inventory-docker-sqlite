import React, { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import DateInvoicePDF from './DateInvoicePDF';
import { formatPakistaniCurrency } from '../utils/formatCurrency';

function DateInvoiceGenerator() {
  const { data: shopSettings } = useQuery(['shop-settings'], async () => {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/shop-settings`);
    return response.data;
  });

  const [selectedDate, setSelectedDate] = useState('');
  const [sales, setSales] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const formatDateForAPI = (dateStr) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateChange = async (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    setLoading(true);
    setError(null);
    setSales(null);

    try {
      const formattedDate = formatDateForAPI(date);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sales?search=${formattedDate}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch sales data');
      }

      const data = await response.json();
      if (data.items.length === 0) {
        setError('No sales found for the selected date');
      } else {
        setSales(data.items);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Generate Daily Sales Invoice</h2>
      
      <div className="mb-4">
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
          Select Date
        </label>
        <input
          type="date"
          id="date"
          value={selectedDate}
          onChange={handleDateChange}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {loading && (
        <div className="text-center text-gray-600">Loading sales data...</div>
      )}

      {error && (
        <div className="text-red-600 mb-4">{error}</div>
      )}

      {sales && sales.length > 0 && (
        <div className="mt-4">
          <PDFDownloadLink
            document={<DateInvoicePDF date={selectedDate} sales={sales} shopSettings={shopSettings} />}
            fileName={`daily-sales-${selectedDate}.pdf`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {({ loading }) => (loading ? 'Preparing PDF...' : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Download Daily Sales Invoice
              </>
            )}
          </PDFDownloadLink>

          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Summary</h3>
            <p className="text-gray-600">Total Sales: {sales.length}</p>
            <p className="text-gray-600">
              Total Amount: {formatPakistaniCurrency(sales.reduce((sum, sale) => sum + sale.totalAmount, 0))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default DateInvoiceGenerator;