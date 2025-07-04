import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { formatPakistaniCurrency } from '../utils/formatCurrency';

function ReturnModal({ sale, isOpen, onClose, returnType = 'partial' }) {
  const queryClient = useQueryClient();
  const [returnItems, setReturnItems] = useState([]);
  const [reason, setReason] = useState('');
  const [removeFromStock, setRemoveFromStock] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);

  // Consolidate items by product ID
  const getConsolidatedItems = (items) => {
    const consolidated = {};
    items.forEach(item => {
      const availableQty = item.remainingQuantity !== undefined ? item.remainingQuantity : item.quantity;
      if (availableQty > 0) {
        if (consolidated[item.product.id]) {
          consolidated[item.product.id].quantity += availableQty;
          consolidated[item.product.id].returnedQuantity += item.returnedQuantity || 0;
        } else {
          consolidated[item.product.id] = {
            product: item.product,
            quantity: availableQty,
            price: item.price,
            returnedQuantity: item.returnedQuantity || 0,
            remainingQuantity: availableQty
          };
        }
      }
    });
    return Object.values(consolidated);
  };

  // Auto-select all items for full return
  useEffect(() => {
    if (returnType === 'full' && sale && isOpen) {
      const consolidatedItems = getConsolidatedItems(sale.items);
      const allItems = consolidatedItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price,
        maxQuantity: item.quantity
      }));
      setReturnItems(allItems);
      setReason('Full sale return');
    } else if (returnType === 'partial') {
      setReturnItems([]);
      setReason('');
    }
  }, [returnType, sale, isOpen]);

  const createReturn = useMutation(
    async (returnData) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/returns`,
        returnData
      );
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['sales']);
        queryClient.invalidateQueries(['products']);
        onClose();
        setReturnItems([]);
        setReason('');
      },
    }
  );

  const handleItemToggle = (item, quantity) => {
    const availableQty = item.remainingQuantity !== undefined ? item.remainingQuantity : item.quantity;
    const existingIndex = returnItems.findIndex(r => r.productId === item.product.id);
    
    if (quantity === 0 || quantity === '') {
      // Remove item
      if (existingIndex >= 0) {
        setReturnItems(returnItems.filter((_, i) => i !== existingIndex));
      }
    } else {
      const returnItem = {
        productId: item.product.id,
        productName: item.product.name,
        quantity: Math.min(quantity, availableQty),
        price: item.price,
        maxQuantity: availableQty
      };

      if (existingIndex >= 0) {
        // Update existing
        const updated = [...returnItems];
        updated[existingIndex] = returnItem;
        setReturnItems(updated);
      } else {
        // Add new
        setReturnItems([...returnItems, returnItem]);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (returnItems.length === 0) {
      alert('Please select items to return');
      return;
    }

    const returnData = {
      saleId: sale.id,
      items: returnItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      })),
      reason,
      removeFromStock,
      refundAmount
    };

    createReturn.mutate(returnData);
  };

  const calculateReturnTotal = () => {
    return returnItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl h-[90vh] flex flex-col">
        <div className="flex-shrink-0">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-red-800">
              {returnType === 'full' ? 'Return Entire Sale' : 'Return Items'} - #{sale.billNumber}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            {returnType === 'partial' && (
              <div>
                {/* Show already returned items */}
                {sale.items.some(item => item.returnedQuantity > 0) && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium mb-2 text-gray-700">Already Returned Items</h4>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      {sale.items.filter(item => item.returnedQuantity > 0).map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-1 text-sm text-gray-600">
                          <span>{item.product.name}</span>
                          <span className="text-red-600 font-medium">{item.returnedQuantity} returned</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <h3 className="text-lg font-medium mb-4">Select Items to Return</h3>
              <div className="space-y-3">
                {(() => {
                  const consolidatedItems = getConsolidatedItems(sale.items);
                  return consolidatedItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>All items from this sale have already been returned.</p>
                    </div>
                  ) : (
                    consolidatedItems.map((item, index) => {
                      const returnItem = returnItems.find(r => r.productId === item.product.id);
                      const returnQuantity = returnItem ? returnItem.quantity : 0;
                      
                      return (
                        <div key={item.product.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{item.product.name}</div>
                            <div className="text-sm text-gray-600">
                              Available to return: {item.quantity} × {formatPakistaniCurrency(item.price)}
                            </div>
                            {item.returnedQuantity > 0 && (
                              <div className="text-xs text-red-600">
                                Already returned: {item.returnedQuantity}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-sm">Return Qty:</label>
                            <input
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={returnQuantity}
                              onChange={(e) => {
                                const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                                handleItemToggle(item, value);
                              }}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                            />
                          </div>
                        </div>
                      );
                    })
                  );
                })()}
              </div>
              </div>
            )}

            {returnType === 'full' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-medium text-orange-800 mb-2">Full Sale Return</h4>
                <p className="text-sm text-orange-700 mb-3">
                  All available items from this sale will be returned.
                </p>
                <div className="space-y-1">
                  {returnItems.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.productName} × {item.quantity}</span>
                      <span>{formatPakistaniCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-orange-300 mt-2 pt-2 font-medium">
                  <div className="flex justify-between">
                    <span>Total Return Amount:</span>
                    <span>{formatPakistaniCurrency(calculateReturnTotal())}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="removeFromStock"
                checked={removeFromStock}
                onChange={(e) => setRemoveFromStock(e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <label htmlFor="removeFromStock" className="text-sm font-medium text-gray-700">
                Remove from stock (deduct returned quantity from product inventory)
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Return (Optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for return..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                rows="3"
              />
            </div>

            {returnItems.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Return Summary</h4>
                {returnItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.productName} × {item.quantity}</span>
                    <span>{formatPakistaniCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t border-red-300 mt-2 pt-2 font-medium">
                  <div className="flex justify-between">
                    <span>Total Return Amount:</span>
                    <span>{formatPakistaniCurrency(calculateReturnTotal())}</span>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="flex-shrink-0 mt-6 flex justify-end space-x-3 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={returnItems.length === 0 || (returnType === 'partial' && getConsolidatedItems(sale.items).length === 0)}
            className={`px-4 py-2 text-white rounded shadow-sm ${
              returnItems.length === 0 || (returnType === 'partial' && getConsolidatedItems(sale.items).length === 0)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
            }`}
          >
            Process Return
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReturnModal;