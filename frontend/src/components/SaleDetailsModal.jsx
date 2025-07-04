import React, { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import SaleInvoicePDF from './SaleInvoicePDF';

function SaleDetailsModal({ sale, isOpen, onClose }) {
  const [creditPayment, setCreditPayment] = useState({});
  const [processingRefund, setProcessingRefund] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const queryClient = useQueryClient();
  
  // Reset state when modal opens with a new sale
  useEffect(() => {
    if (isOpen && sale) {
      setCreditPayment({});
      setSuccessMessage('');
    }
  }, [isOpen, sale?.id]);
  
  const { data: shopSettings } = useQuery(['shop-settings'], async () => {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/shop-settings`);
    return response.data;
  });

  const payCredit = useMutation(
    async (paymentData) => {
      let response;
      
      // Set processing state for this specific return
      if (paymentData.returnId) {
        setCreditPayment(prev => ({
          ...prev,
          [paymentData.returnId]: {
            amount: paymentData.amount,
            processing: true
          }
        }));
        
        // Pay refund for specific return
        response = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/returns/${paymentData.returnId}/pay-credit`,
          { amount: paymentData.amount }
        );
      } else if (paymentData.saleId) {
        // Set processing state for direct credit refund
        setCreditPayment(prev => ({
          ...prev,
          saleRefund: {
            amount: paymentData.amount,
            processing: true
          }
        }));
        
        // Pay direct credit refund
        response = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/sales/${paymentData.saleId}/pay-credit`,
          { amount: paymentData.amount }
        );
      }
      
      return response.data;
    },
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['sales']);
        
        // Reset processing state but keep the amount for UI feedback
        if (variables.returnId) {
          setCreditPayment(prev => ({
            ...prev,
            [variables.returnId]: {
              amount: variables.amount,
              processing: false,
              completed: true
            }
          }));
        } else {
          setCreditPayment(prev => ({
            ...prev,
            saleRefund: {
              amount: variables.amount,
              processing: false,
              completed: true
            }
          }));
        }
        
        const amount = variables.amount;
        setSuccessMessage(`Refund of Rs.${amount} processed successfully!`);
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
      },
    }
  );

  const handleMarkRefundPaid = (returnId) => {
    payCredit.mutate({ returnId, amount: 0 });
  };

  if (!isOpen || !sale) return null;

  // Debug: Check sale object structure
  console.log('Sale object:', sale);
  console.log('Sale discount:', sale.discount);

  // Check if any individual return has been refunded
  const hasIndividualRefunds = Object.keys(creditPayment).some(key => 
    key !== 'saleRefund' && creditPayment[key]?.completed
  );

  // Check if full credit has been refunded
  const hasFullRefund = creditPayment.saleRefund?.completed;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="flex-shrink-0">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold">Sale Details</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onClose();
                if (window.openReturnModal) {
                  window.openReturnModal(sale, 'partial');
                }
              }}
              disabled={!sale.items.some(item => (item.remainingQuantity || item.quantity) > 0)}
              className={`px-3 py-2 rounded-lg shadow-sm flex items-center gap-2 text-sm ${
                !sale.items?.some(item => (item.remainingQuantity || item.quantity) > 0)
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              Return Items
            </button>
            <button
              onClick={() => {
                onClose();
                if (window.openReturnModal) {
                  window.openReturnModal(sale, 'full');
                }
              }}
              disabled={!sale.items.some(item => (item.remainingQuantity || item.quantity) > 0)}
              className={`px-3 py-2 rounded-lg shadow-sm flex items-center gap-2 text-sm ${
                !sale.items.some(item => (item.remainingQuantity || item.quantity) > 0)
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Return Entire Sale
            </button>
            {!sale.items?.some(item => (item.remainingQuantity || item.quantity) > 0) && (
              <div className="text-sm text-gray-500 italic">
                No items available to return
              </div>
            )}
            <PDFDownloadLink
              document={<SaleInvoicePDF sale={sale} shopSettings={shopSettings} />}
              fileName={`invoice-${sale.billNumber}.pdf`}
              className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-2 rounded-lg hover:from-primary-700 hover:to-primary-800 shadow-sm flex items-center gap-2"
            >
              {({ loading }) => (loading ? 'Loading...' : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                  </svg>
                  Print Invoice
                </>
              ))}
            </PDFDownloadLink>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
              <span>{successMessage}</span>
              <button 
                onClick={() => setSuccessMessage('')}
                className="text-green-700 hover:text-green-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
          <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">#{sale.billNumber}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Date</p>
                <p className="font-medium">{new Date(sale.saleDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-600">Contact</p>
                <p className="font-medium">
                  {sale.contact ? (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                      {sale.contact.name}
                    </span>
                  ) : (
                    <span className="text-gray-400">Not specified</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Items</h3>
            <div className="bg-gray-50 rounded-lg overflow-hidden overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    // Calculate returned quantities from returns data
                    const returnedQuantities = {};
                    if (Array.isArray(sale.returns)) {
                      sale.returns.forEach(returnRecord => {
                        if (returnRecord.items && Array.isArray(returnRecord.items)) {
                          returnRecord.items.forEach(returnItem => {
                            if (returnItem.productId) {
                              returnedQuantities[returnItem.productId] = (returnedQuantities[returnItem.productId] || 0) + returnItem.quantity;
                            }
                          });
                        }
                      });
                    }
                    
                    // Consolidate items by product ID
                    const consolidatedItems = {};
                    if (Array.isArray(sale.items)) {
                      sale.items.forEach(item => {
                        if (consolidatedItems[item.product?.id]) {
                          consolidatedItems[item.product.id].quantity += item.quantity;
                        } else {
                          consolidatedItems[item.product?.id] = {
                            product: item.product,
                            quantity: item.quantity,
                            price: item.price,
                            returnedQuantity: returnedQuantities[item.product?.id] || 0
                          };
                        }
                      });
                    }
                    
                    return Object.values(consolidatedItems).map((item, index) => (
                      <tr key={item.product?.id || index} className={item.returnedQuantity > 0 ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            {item.product?.name}
                            {item.returnedQuantity > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 mr-1">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                                </svg>
                                {item.returnedQuantity} Returned
                              </span>
                            )}
                            {item.returnedQuantity === item.quantity && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                Fully Returned
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <div>{item.quantity}</div>
                          {item.returnedQuantity > 0 && (
                            <div className="text-xs text-red-600">
                              -{item.returnedQuantity}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          Rs.{item.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <div>Rs.{(item.price * item.quantity).toFixed(2)}</div>
                          {item.returnedQuantity > 0 && (
                            <div className="text-xs text-red-600">
                              -Rs.{(item.price * item.returnedQuantity).toFixed(2)}
                            </div>
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-right font-medium">
                      Subtotal
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      Rs.{sale.originalTotalAmount}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-right font-medium text-green-600">
                      Discount
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-green-600">
                      -Rs.{(sale.discount || 0).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-right font-medium">
                      Total Amount
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      Rs.{(sale.totalAmount).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-right font-medium">
                      Paid Amount
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      Rs.{sale.paidAmount.toFixed(2)}
                    </td>
                  </tr>
                  {sale.returns?.length > 0 && (
                    <>
                      <tr>
                        <td colSpan="3" className="px-6 py-4 text-right font-medium text-red-600">
                          Total Returned
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-red-600">
                          -Rs.{sale.returns.reduce((sum, ret) => sum + ret.totalAmount, 0).toFixed(2)}
                        </td>
                      </tr>
                      {sale.returns.some(ret => ret.refundPaid) && (
                        <tr>
                          <td colSpan="3" className="px-6 py-4 text-right font-medium text-green-600">
                            Total Refunded
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-green-600">
                            Rs.{sale.returns.reduce((sum, ret) => sum + (ret.refundPaid ? (ret.refundAmount || 0) : 0), 0).toFixed(2)}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-right font-medium">
                      Net Total After Returns
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      Rs.{Math.max(((sale.totalAmount) - (sale.returns?.reduce((sum, ret) => sum + ret.totalAmount, 0) || 0)), 0).toFixed(2)}
                    </td>

                  </tr>
                  {(() => {
                    const netAmount = (sale.totalAmount) - (sale.returns?.reduce((sum, ret) => sum + ret.totalAmount, 0) || 0);
                    const totalRefunded = (sale.returns?.reduce((sum, ret) => sum + (ret.refundPaid ? (ret.refundAmount || 0) : 0), 0) || 0);
                    const balance = netAmount - sale.paidAmount + totalRefunded;
                    
                    // Check if all credit has been refunded
                    const allCreditRefunded = hasFullRefund || 
                      (hasIndividualRefunds && 
                       Object.keys(creditPayment)
                         .filter(key => key !== 'saleRefund')
                         .reduce((sum, key) => sum + parseFloat(creditPayment[key]?.amount || 0), 0) >= Math.abs(balance));
                    
                    return balance > 0 ? (
                      <tr>
                        <td colSpan="3" className="px-6 py-4 text-right font-medium">
                          Updated Balance Due
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-yellow-600">
                          Rs.{balance.toFixed(2)}
                          <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                            Payment Due
                          </span>
                        </td>
                      </tr>
                    ) : balance < 0 && Math.abs(balance) <= sale.paidAmount ? (
                      <>
                        <tr>
                          <td colSpan="3" className="px-6 py-4 text-right font-medium">
                            Credit Balance
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-green-600">
                            Rs.{Math.abs(balance).toFixed(2)}
                            <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                              {allCreditRefunded ? 'Refunded' : 'Overpaid'}
                            </span>
                          </td>
                        </tr>
                        {/* Commented out Refund Credit input field to prevent issues
                        {!allCreditRefunded && (
                          <tr>
                            <td colSpan="3" className="px-6 py-4 text-right font-medium">
                              Refund Credit
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {creditPayment.saleRefund?.completed ? (
                                  <div className="text-sm text-green-600 font-medium">
                                    Refund of Rs.{creditPayment.saleRefund.amount} processed
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    min="0"
                                    max={Math.abs(balance)}
                                    step="0.01"
                                    placeholder="Amount"
                                    value={creditPayment.saleRefund?.amount || ''}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      if (value <= Math.abs(balance)) {
                                        setCreditPayment(prev => ({
                                          ...prev,
                                          saleRefund: {
                                            ...prev.saleRefund,
                                            amount: e.target.value
                                          }
                                        }));
                                      }
                                    }}
                                    disabled={creditPayment.saleRefund?.processing || hasIndividualRefunds}
                                    className="w-24 py-1 px-2 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                                  />
                                )}
                                {!creditPayment.saleRefund?.completed && (
                                  <>
                                  {hasIndividualRefunds && (
                                    <div className="text-xs text-orange-600 mb-1">
                                      Individual returns already refunded
                                    </div>
                                  )}
                                  <button
                                    onClick={() => {
                                      const refundAmount = parseFloat(creditPayment.saleRefund?.amount) || Math.abs(balance);
                                      if (refundAmount <= Math.abs(balance)) {
                                        // Create a dummy return for refund
                                        payCredit.mutate({
                                          saleId: sale.id,
                                          amount: refundAmount
                                        });
                                      }
                                    }}
                                    disabled={creditPayment.saleRefund?.processing || hasIndividualRefunds}
                                    className="px-2 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400"
                                  >
                                    {creditPayment.saleRefund?.processing ? 'Processing...' : 'Pay Refund'}
                                  </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                        */}
                      </>
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-6 py-4 text-right font-medium">
                          Status
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-green-600">
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            Fully Paid
                          </span>
                        </td>
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>
            </div>
          </div>

          {/* Returned Items Section */}
          {sale.returns?.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-2 text-red-800">Returned Items</h3>
              <div className="bg-red-50 rounded-lg overflow-hidden overflow-x-auto border border-red-200">
                <table className="min-w-full divide-y divide-red-200">
                  <thead className="bg-red-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase">Return #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase">Items</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-red-700 uppercase">Amount</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-red-700 uppercase">Refund</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-red-200">
                    {sale.returns.map((returnRecord, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-800">
                          {returnRecord.returnNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {new Date(returnRecord.returnDate).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {returnRecord.items?.map((item, itemIndex) => (
                            <div key={itemIndex} className="text-sm">
                              {item.product?.name} × {item.quantity}
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-800">
                          Rs.{returnRecord.totalAmount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <div className="text-sm font-medium text-gray-900">
                            Rs.{(returnRecord.refundAmount || 0).toFixed(2)}
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <div className={`text-xs px-2 py-1 rounded-full ${
                              returnRecord.refundPaid 
                                ? 'bg-green-100 text-green-800' 
                                : (returnRecord.refundAmount > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600')
                            }`}>
                              {returnRecord.refundPaid ? 'Paid' : (returnRecord.refundAmount > 0 ? 'Pending' : 'No Refund')}
                            </div>
                          </div>
                          
                          {(() => {
                            const netAmount = (sale.totalAmount) - (sale.returns?.reduce((sum, ret) => sum + ret.totalAmount, 0) || 0);
                            const totalRefunded = (sale.returns?.reduce((sum, ret) => sum + (ret.refundPaid ? (ret.refundAmount || 0) : 0), 0) || 0);
                            // Include local state refunds that haven't been persisted yet
                            const localRefunds = Object.keys(creditPayment)
                              .filter(key => key !== 'saleRefund' && creditPayment[key]?.completed)
                              .reduce((sum, key) => sum + parseFloat(creditPayment[key]?.amount || 0), 0);
                            const balance = netAmount - sale.paidAmount + totalRefunded + localRefunds;
                            const hasOverpaid = balance < 0;
                            const isSettled = balance === 0;
                            
                            return !returnRecord.refundPaid && hasOverpaid && !isSettled && (
                              <div className="mt-2 flex items-center gap-1">
                                {creditPayment[returnRecord.id]?.completed ? (
                                  <div className="text-xs text-green-600 font-medium">
                                    Refund of Rs.{creditPayment[returnRecord.id].amount} processed
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    min="0"
                                    max={Math.min(returnRecord.totalAmount, sale.paidAmount)}
                                    step="0.01"
                                    placeholder="Amount"
                                    value={creditPayment[returnRecord.id]?.amount || ''}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      const maxRefund = Math.min(returnRecord.totalAmount, sale.paidAmount);
                                      if (value <= maxRefund) {
                                        setCreditPayment(prev => ({
                                          ...prev,
                                          [returnRecord.id]: {
                                            ...prev[returnRecord.id],
                                            amount: e.target.value
                                          }
                                        }));
                                      }
                                    }}
                                    disabled={creditPayment[returnRecord.id]?.processing || hasFullRefund}
                                    className="w-20 text-xs py-1 px-2 border border-gray-300 rounded disabled:bg-gray-100"
                                  />
                                )}
                                {!creditPayment[returnRecord.id]?.completed && (
                                  <>
                                  {hasFullRefund && (
                                    <div className="text-xs text-orange-600">
                                      Full credit already refunded
                                    </div>
                                  )}
                                  <button
                                    onClick={() => {
                                      const maxRefund = Math.min(returnRecord.totalAmount, sale.paidAmount);
                                      const refundAmount = parseFloat(creditPayment[returnRecord.id]?.amount) || maxRefund;
                                      if (refundAmount <= maxRefund) {
                                        payCredit.mutate({
                                          returnId: returnRecord.id,
                                          amount: refundAmount
                                        });
                                      }
                                    }}
                                    disabled={creditPayment[returnRecord.id]?.processing || hasFullRefund}
                                    className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                                  >
                                    {creditPayment[returnRecord.id]?.processing ? 'Processing...' : 'Pay'}
                                  </button>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SaleDetailsModal;