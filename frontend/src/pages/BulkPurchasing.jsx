import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { z } from 'zod';
import DeleteModal from '../components/DeleteModal';
import TableSkeleton from '../components/TableSkeleton';
import PurchaseDetailsModal from '../components/PurchaseDetailsModal';
import { debounce } from 'lodash';
import { formatPakistaniCurrency } from '../utils/formatCurrency';

const bulkPurchaseItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
  purchasePrice: z.number().positive("Purchase price must be positive"),
});

const bulkPurchaseSchema = z.object({
  contactId: z.string().min(1, "Contact is required"),
  items: z.array(bulkPurchaseItemSchema).min(1, "At least one item is required"),
  totalAmount: z.number().positive("Total amount must be positive"),
  paidAmount: z.number().min(0, "Paid amount cannot be negative"),
});

function BulkPurchasing() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const searchInputRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState(null);
  const [productSelected, isProductSelected] = useState(false);
  const [contactSelected, isContactSelected] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactSearchTerm, setContactSearchTerm] = useState("");
  const [debouncedContactSearchTerm, setDebouncedContactSearchTerm] = useState("");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [debouncedProductSearchTerm, setDebouncedProductSearchTerm] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [showPendingPayments, setShowPendingPayments] = useState(location.state?.showPendingPayments || false);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((term) => {
      setDebouncedSearchTerm(term);
    }, 300),
    []
  );

  // Handle search by purchase ID or contact name
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    debouncedSearch(e.target.value);
  };

  // Debounced contact search
  const debouncedContactSearch = useCallback(
    debounce((term) => {
      setDebouncedContactSearchTerm(term);
    }, 300),
    []
  );

  const handleContactSearchChange = (value) => {
    setContactSearchTerm(value);
    debouncedContactSearch(value);
  };

  // Debounced product search
  const debouncedProductSearch = useCallback(
    debounce((term) => {
      setDebouncedProductSearchTerm(term);
    }, 300),
    []
  );

  const handleProductSearchChange = (value) => {
    setProductSearchTerm(value);
    debouncedProductSearch(value);
  };

  // Reset page when switching between all purchases and pending payments
  useEffect(() => {
    setCurrentPage(1);
  }, [showPendingPayments]);

  // Fetch bulk purchases
  const { data: purchases, isLoading } = useQuery(
    ['bulk-purchases', debouncedSearchTerm, currentPage, showPendingPayments],
    async () => {
      const endpoint = showPendingPayments ? '/api/bulk-purchases/pending-payments' : '/api/bulk-purchases';
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}${endpoint}?page=${currentPage}&limit=${itemsPerPage}&search=${debouncedSearchTerm}`
      );
      return response.data;
    }
  );

  // Fetch contacts for dropdown with search
  const { data: contacts } = useQuery(
    ['contacts', debouncedContactSearchTerm],
    async () => {
      const searchParam = debouncedContactSearchTerm ? `&search=${debouncedContactSearchTerm}` : '';
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/contacts?limit=100${searchParam}`);
      return response.data.items;
    }
  );

  // Fetch products for dropdown with search
  const { data: products } = useQuery(
    ['products', debouncedProductSearchTerm],
    async () => {
      const searchParam = debouncedProductSearchTerm ? `&search=${debouncedProductSearchTerm}` : '';
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/products?limit=100${searchParam}`);
      return response.data.items;
    }
  );



  // Maintain search input focus
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [purchases]);

  // Calculate total amount
  useEffect(() => {
    const total = purchaseItems.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);
    setTotalAmount(total);
  }, [purchaseItems]);

  // Create bulk purchase mutation
  const createPurchase = useMutation(
    async (purchaseData) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/bulk-purchases`,
        purchaseData
      );
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['bulk-purchases']);
        setIsModalOpen(false);
        resetForm();
      },
    }
  );

  // Update bulk purchase mutation
  const updatePurchase = useMutation(
    async (updatedPurchase) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/bulk-purchases/${updatedPurchase.id}`,
        updatedPurchase
      );
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['bulk-purchases']);
        setIsModalOpen(false);
        resetForm();
      },
    }
  );

  // Delete bulk purchase mutation
  const [deleteError, setDeleteError] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const deletePurchase = useMutation(
    async (purchaseId) => {
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/bulk-purchases/${purchaseId}`
      );
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['bulk-purchases']);
        setDeleteError(null);
        setDeleteModalOpen(false);
        setPurchaseToDelete(null);
      },
      onError: (error) => {
        setDeleteError(error.response?.data?.error || 'An error occurred while deleting the purchase');
      }
    }
  );

  const resetForm = () => {
    setPurchaseItems([]);
    setSelectedContact(null);
    setSelectedProduct(null);
    setQuantity("");
    setPurchasePrice("");
    setContactSearchTerm("");
    setProductSearchTerm("");
    setTotalAmount(0);
    setPaidAmount(0);
    setValidationErrors({});
    isContactSelected(false);
    isProductSelected(false);
    setIsEditMode(false);
    setEditingPurchase(null);
  };

  const handleAddItem = () => {
    if (!selectedProduct || !quantity || !purchasePrice) {
      setValidationErrors({
        ...validationErrors,
        product: !selectedProduct ? "Please select a product from the dropdown" : undefined,
        quantity: !quantity ? "Please enter a quantity" : undefined,
        purchasePrice: !purchasePrice ? "Please enter a purchase price" : undefined
      });
      return;
    }
    
    // Check if user typed something but didn't select from dropdown
    if (productSearchTerm && !selectedProduct) {
      setValidationErrors({
        ...validationErrors,
        product: "Please select a valid product from the dropdown"
      });
      return;
    }

    const quantityNum = parseInt(quantity);
    const priceNum = parseFloat(purchasePrice);
    
    const newItem = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: quantityNum,
      purchasePrice: priceNum,
      subtotal: priceNum * quantityNum
    };

    setPurchaseItems([...purchaseItems, newItem]);
    setSelectedProduct(null);
    setQuantity("");
    setPurchasePrice("");
    setProductSearchTerm("");
    setValidationErrors({});
    isProductSelected(false);
  };

  const handleRemoveItem = (index) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedContact) {
      setValidationErrors({
        ...validationErrors,
        contact: "Please select a contact from the dropdown"
      });
      return;
    }
    
    // Validate contact if something is typed but not selected
    if (contactSearchTerm && !selectedContact) {
      setValidationErrors({
        ...validationErrors,
        contact: "Please select a valid contact from the dropdown"
      });
      return;
    }

    if (purchaseItems.length === 0) {
      setValidationErrors({
        ...validationErrors,
        items: "At least one item is required"
      });
      return;
    }

    const parsedPaidAmount = parseFloat(paidAmount) || 0;
    if (parsedPaidAmount > totalAmount) {
      setValidationErrors({
        ...validationErrors,
        paidAmount: "Paid amount cannot be greater than total amount"
      });
      return;
    }

    const purchaseData = {
      contactId: selectedContact.id,
      items: purchaseItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice
      })),
      totalAmount: totalAmount,
      paidAmount: parsedPaidAmount,
      purchaseDate: new Date().toISOString()
    };

    try {
      bulkPurchaseSchema.parse(purchaseData);
      setValidationErrors({});

      if (isEditMode) {
        updatePurchase.mutate({ ...purchaseData, id: editingPurchase.id });
      } else {
        createPurchase.mutate(purchaseData);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = {};
        error.errors.forEach((err) => {
          errors[err.path.join('.')] = err.message;
        });
        setValidationErrors(errors);
      }
    }
  };

  const handleEdit = (purchase) => {
    setEditingPurchase(purchase);
    setSelectedContact(purchase.contact);
    setContactSearchTerm(purchase.contact.name);
    isContactSelected(true);
    
    setPurchaseItems(purchase.items.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      purchasePrice: item.purchasePrice,
      subtotal: item.purchasePrice * item.quantity
    })));
    
    setTotalAmount(purchase.totalAmount);
    setPaidAmount(purchase.paidAmount);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = (purchase) => {
    setPurchaseToDelete(purchase);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (purchaseToDelete) {
      deletePurchase.mutate(purchaseToDelete.id);
    }
  };

  if (isLoading) return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="h-8 bg-gray-300 rounded w-48 animate-pulse"></div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="h-10 bg-gray-300 rounded w-64 animate-pulse"></div>
          <div className="h-10 bg-gray-300 rounded w-32 animate-pulse"></div>
        </div>
      </div>
      <TableSkeleton rows={10} columns={5} />
    </div>
  );

  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-800">Bulk Purchasing</h1>
          {showPendingPayments && (
            <span className="bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-800 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 rounded-full border border-yellow-200 shadow-sm">
              Pending Payments
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by invoice or contact..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full sm:w-48 md:w-64 pl-10 pr-3 py-2 text-sm border border-primary-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-primary-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {showPendingPayments && (
              <button
                onClick={() => setShowPendingPayments(false)}
                className="px-3 py-2 text-sm border border-primary-200 rounded-lg text-primary-700 hover:bg-primary-50 transition-colors"
              >
                All Purchases
              </button>
            )}
            {!showPendingPayments && (
              <button
                onClick={() => setShowPendingPayments(true)}
                className="px-3 py-2 text-sm border border-yellow-200 rounded-lg text-yellow-700 hover:bg-yellow-50 transition-colors"
              >
                Pending Payments
              </button>
            )}
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-3 py-2 text-sm rounded-lg hover:from-primary-700 hover:to-primary-800 shadow-sm whitespace-nowrap"
            >
              New Purchase
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-x-auto border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-primary-50 to-secondary-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-700 uppercase tracking-wider">Invoice Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-700 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-700 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-700 uppercase tracking-wider">Total Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-700 uppercase tracking-wider">Paid Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {purchases?.items?.map((purchase) => (
              <tr key={purchase.id} className={`hover:bg-primary-50 transition-colors ${purchase.totalAmount > purchase.paidAmount ? 'bg-yellow-50' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-primary-700">
                  {purchase.invoiceNumber || `#${purchase.id.slice(-6)}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                  {new Date(purchase.purchaseDate).toLocaleDateString('en-GB')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                  {purchase.contact.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-primary-800">
                  {formatPakistaniCurrency(purchase.totalAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {purchase.totalAmount > purchase.paidAmount ? (
                    <div className="flex items-center">
                      <span className="text-yellow-600 font-medium">{formatPakistaniCurrency(purchase.paidAmount)}</span>
                      <span className="ml-2 px-2 py-1 text-xs bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-800 rounded-full border border-yellow-200 shadow-sm">
                        Due: {formatPakistaniCurrency(purchase.totalAmount - purchase.paidAmount)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-green-600 font-medium">{formatPakistaniCurrency(purchase.paidAmount)}</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedPurchase(purchase);
                        setDetailsModalOpen(true);
                      }}
                      className="text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(purchase)}
                      className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(purchase)}
                      className="text-red-600 hover:text-red-900 inline-flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m6.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-center">
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-primary-200 rounded-lg disabled:opacity-50 text-primary-700 hover:bg-primary-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 bg-primary-50 border border-primary-200 rounded-lg text-primary-800">
            Page {currentPage} of {Math.ceil((purchases?.total || 0) / itemsPerPage)}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={currentPage >= Math.ceil((purchases?.total || 0) / itemsPerPage)}
            className="px-4 py-2 border border-primary-200 rounded-lg disabled:opacity-50 text-primary-700 hover:bg-primary-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* New Purchase Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-xl h-[90vh] shadow-xl border border-gray-200 flex flex-col">
            <div className="flex-shrink-0">
              <h2 className="text-2xl font-bold mb-6 text-primary-800 border-b border-primary-100 pb-2">{isEditMode ? "Edit Purchase" : "New Purchase"}</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-1 py-2">
              <form id="purchase-form" onSubmit={handleSubmit} className="space-y-4">
              {/* Contact Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                <div className="relative">
                  <input
                    type="text"
                    value={contactSearchTerm}
                    onChange={(e) => {
                      handleContactSearchChange(e.target.value);
                      isContactSelected(false);
                      setSelectedContact(null);
                    }}
                    placeholder="Search contacts..."
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {!contactSelected && contactSearchTerm && contacts?.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                      {contacts?.map((contact) => (
                        <div
                          key={contact.id}
                          onClick={() => {
                            setSelectedContact(contact);
                            setContactSearchTerm(contact.name);
                            isContactSelected(true);
                            setValidationErrors({
                              ...validationErrors,
                              contact: undefined
                            });
                          }}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                        >
                          <div className="font-medium">{contact.name}</div>
                          {contact.address && <div className="text-sm text-gray-600">{contact.address}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {validationErrors.contact && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.contact}</p>
                )}
              </div>

              {/* Product Selection */}
              <div className="space-y-4 mb-4">
                <div className="flex flex-col gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Add Products</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={productSearchTerm}
                        onChange={(e) => {
                          handleProductSearchChange(e.target.value);
                          isProductSelected(false);
                          setSelectedProduct(null);
                        }}
                        placeholder="Search products..."
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {!productSelected && productSearchTerm && products?.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                          {products?.map((product) => (
                            <div
                              key={product.id}
                              onClick={() => {
                                setSelectedProduct(product);
                                setProductSearchTerm(product.name);
                                isProductSelected(true);
                                setValidationErrors({
                                  ...validationErrors,
                                  product: undefined
                                });
                              }}
                              className="px-4 py-2 cursor-pointer hover:bg-gray-100 flex justify-between items-center"
                            >
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-gray-600">{product.sku}</div>
                              </div>
                              <div className="text-blue-600 font-medium">Rs.{product.price}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {validationErrors.product && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.product}</p>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="Qty"
                        className="w-24 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {validationErrors.quantity && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.quantity}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        placeholder="Price"
                        className="w-24 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {validationErrors.purchasePrice && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.purchasePrice}</p>
                      )}
                    </div>
                    <div className="self-end">
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchase Items List */}
              <div className="border border-primary-100 rounded-lg p-4 bg-primary-50">
                <h3 className="font-medium mb-2 text-primary-800">Purchase Items</h3>
                {purchaseItems.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">No items added yet</p>
                ) : (
                  purchaseItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-primary-100 last:border-b-0">
                      <div>
                        <div className="font-medium text-primary-700">{item.productName}</div>
                        <div className="text-sm text-gray-600">
                          {item.quantity} x Rs.{item.purchasePrice.toFixed(2)} = <span className="text-primary-800 font-medium">Rs.{item.subtotal.toFixed(2)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
                {validationErrors.items && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.items}</p>
                )}
              </div>

              {/* Total and Paid Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                  <input
                    type="text"
                    value={`Rs.${totalAmount.toFixed(2)}`}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-primary-800 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-primary-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {validationErrors.paidAmount && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.paidAmount}</p>
                  )}
                </div>
              </div>

              </form>
            </div>
            <div className="flex-shrink-0 mt-6 flex justify-end space-x-3 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="purchase-form"
                className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded shadow-sm hover:from-primary-700 hover:to-primary-800"
              >
                {isEditMode ? "Update Purchase" : "Create Purchase"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setPurchaseToDelete(null);
          setDeleteError(null);
        }}
        onConfirm={confirmDelete}
        itemName={purchaseToDelete ? `purchase from ${new Date(purchaseToDelete.purchaseDate).toLocaleDateString()}` : ''}
        error={deleteError}
      />

      {/* Purchase Details Modal */}
      <PurchaseDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedPurchase(null);
        }}
        purchase={selectedPurchase}
      />
    </div>
  );
}

export default BulkPurchasing;