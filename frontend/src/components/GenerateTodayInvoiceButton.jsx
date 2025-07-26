import React, { useState, useEffect } from 'react';
import axios from 'axios';

function GenerateTodayInvoiceButton({ sales }) {
  const [shopSettings, setShopSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShopSettings = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/shop-settings`);
        setShopSettings(response.data);
      } catch (error) {
        console.error('Failed to fetch shop settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShopSettings();
  }, []);

  // Get today's date in Pakistan timezone
  const now = new Date();
  const pakistanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Karachi"}));
  const today = pakistanTime.toISOString().split('T')[0];
  
  // Get all today's sales directly from API instead of relying on paginated data
  const [todaySales, setTodaySales] = useState([]);
  
  useEffect(() => {
    const fetchTodaySales = async () => {
      try {
        // Convert YYYY-MM-DD to DD/MM/YYYY format for API search
        const [year, month, day] = today.split('-');
        const searchDate = `${day}/${month}/${year}`;
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/sales?limit=1000&search=${searchDate}`);
        setTodaySales(response.data.items || []);
      } catch (error) {
        console.error('Failed to fetch today\'s sales:', error);
        setTodaySales([]);
      }
    };
    
    if (!loading) {
      fetchTodaySales();
    }
  }, [today, loading, sales]);

  const handleGeneratePDF = async () => {
    if (!todaySales.length || !shopSettings) return;
    
    try {
      const { PDFDownloadLink, pdf } = await import('@react-pdf/renderer');
      const { default: SimpleDateInvoicePDF } = await import('./SimpleDateInvoicePDF');
      
      const blob = await pdf(<SimpleDateInvoicePDF date={today} sales={todaySales} shopSettings={shopSettings} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `daily-sales-${today}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF generation failed:', error);
    }
  };

  if (loading) {
    return (
      <button
        className="bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed whitespace-nowrap flex items-center gap-2"
        disabled
      >
        Loading...
      </button>
    );
  }

  return (
    <button
      onClick={handleGeneratePDF}
      disabled={todaySales.length === 0}
      className={`px-4 py-2 rounded-lg whitespace-nowrap flex items-center gap-2 ${
        todaySales.length === 0
          ? 'bg-gray-400 text-white cursor-not-allowed'
          : 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 shadow-sm'
      }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      {todaySales.length > 0 
        ? `Generate Today's Invoice (${todaySales.length})` 
        : 'No Sales Today'
      }
    </button>
  );
}

export default GenerateTodayInvoiceButton;