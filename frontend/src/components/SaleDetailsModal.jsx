import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import SaleInvoicePDF from './SaleInvoicePDF';

function SaleDetailsModal({ sale, isOpen, onClose }) {
  const { data: shopSettings } = useQuery(['shop-settings'], async () => {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/shop-settings`);
    return response.data;
  });

  if (!isOpen || !sale) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl h-[90vh] flex flex-col">
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
                  {sale.items?.map((item, index) => (
                    <tr key={index} className={item.returnedQuantity > 0 ? 'bg-red-50' : ''}>
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
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-right font-medium">
                      Total
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      Rs.{sale.totalAmount.toFixed(2)}
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
                  {sale.totalAmount > sale.paidAmount && (
                    <tr>
                      <td colSpan="3" className="px-6 py-4 text-right font-medium">
                        Balance
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-yellow-600">
                        Rs.{(sale.totalAmount - sale.paidAmount).toFixed(2)}
                        <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                          Payment Due
                        </span>
                      </td>
                    </tr>
                  )}
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