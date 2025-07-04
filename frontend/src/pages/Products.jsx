import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { z } from 'zod';
import DeleteModal from '../components/DeleteModal';
import TableSkeleton from '../components/TableSkeleton';
import { debounce } from 'lodash';
import { formatPakistaniCurrency } from '../utils/formatCurrency';
import { FaSearch, FaBoxOpen, FaTag, FaDollarSign, FaWarehouse } from 'react-icons/fa';

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  price: z.number().positive("Price must be positive").max(100000000, "Price cannot exceed Rs.10 Crores"),
  purchasePrice: z.number().min(0, "Purchase price must be non-negative").max(100000000, "Purchase price cannot exceed Rs.10 Crores").optional(),
  sku: z.string().optional(),
  quantity: z.number().int().min(0, "Quantity must be non-negative"),
  lowStockThreshold: z.number().int().min(0, "Low stock threshold must be non-negative"),
});

function Products() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const searchInputRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [validationErrors, setValidationErrors] = useState({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [showLowStock, setShowLowStock] = useState(location.state?.showLowStock || false);
  const [showDamaged, setShowDamaged] = useState(false);
  const [damagedModalOpen, setDamagedModalOpen] = useState(false);
  const [selectedProductForDamage, setSelectedProductForDamage] = useState(null);
  const [damagedQuantity, setDamagedQuantity] = useState('');
  const [maxRestoreQuantity, setMaxRestoreQuantity] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    purchasePrice: '',
    sku: '',
    quantity: '',
    lowStockThreshold: '10',
  });

  // Reset page when switching between filters
  useEffect(() => {
    setCurrentPage(1);
  }, [showLowStock, showDamaged]);

  const debouncedSearch = useCallback(
    debounce((term) => {
      setDebouncedSearchTerm(term);
    }, 300),
    []
  );

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    debouncedSearch(e.target.value);
  };

  const { data: products, isLoading } = useQuery(
    ['products', debouncedSearchTerm, currentPage, showLowStock, showDamaged],
    async () => {
      let endpoint = '/api/products';
      if (showLowStock) endpoint = '/api/products/low-stock';
      if (showDamaged) endpoint = '/api/products/damaged';
      
      const searchParam = !showDamaged ? `&search=${debouncedSearchTerm}` : '';
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}${endpoint}?page=${currentPage}&limit=${itemsPerPage}${searchParam}`
      );
      return response.data;
    }
  );

    // Maintain search input focus
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [products]);

  const updateProduct = useMutation(
    async (updatedProduct) => {
      console.log("payload of product:", updatedProduct)
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/products/${updatedProduct.id.toString()}`,
        updatedProduct
      );
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['products']);
        setIsModalOpen(false);
        setFormData({ name: '', description: '', price: '', purchasePrice: '', sku: '', quantity: '', lowStockThreshold: '10' });
        setIsEditMode(false);
        setValidationErrors({});
      },
      onError: (error) => {
        console.error('Update product error:', error);
        setValidationErrors({
          name: error.response?.data?.error || 'Failed to update product'
        });
      }
    }
  );

  const [deleteError, setDeleteError] = useState(null);

  const deleteProduct = useMutation(
    async (productId) => {
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/products/${productId}`
      );
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['products']);
        setDeleteError(null);
        setDeleteModalOpen(false);
        setProductToDelete(null);
      },
      onError: (error) => {
        setDeleteError(error.response?.data?.error || 'An error occurred while deleting the product');
      }
    }
  );

  const createProduct = useMutation(
    async (newProduct) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/products`,
        newProduct
      );
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['products']);
        setIsModalOpen(false);
        setFormData({ name: '', description: '', price: '', purchasePrice: '', sku: '', quantity: '', lowStockThreshold: '10' });
        setValidationErrors({});
      },
      onError: (error) => {
        setValidationErrors({
          name: error.response?.data?.error || 'Failed to create product'
        });
      }
    }
  );

  const markAsDamaged = useMutation(
    async ({ productId, quantity }) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/products/${productId}/damage`,
        { quantity }
      );
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['products']);
        setDamagedModalOpen(false);
        setSelectedProductForDamage(null);
        setDamagedQuantity('');
      }
    }
  );

  const restoreDamaged = useMutation(
    async ({ productId, quantity }) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/products/${productId}/restore`,
        { quantity }
      );
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['products']);
        setDamagedModalOpen(false);
        setSelectedProductForDamage(null);
        setDamagedQuantity('');
        setMaxRestoreQuantity(0);
      }
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Check for empty required fields first
    const errors = {};
    if (!formData.price.trim()) {
      errors.price = "Price is required";
    }
    if (!formData.quantity.trim()) {
      errors.quantity = "Quantity is required";
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const productData = {
      ...formData,
      price: parseFloat(formData.price),
      purchasePrice: formData.purchasePrice && formData.purchasePrice.trim() ? parseFloat(formData.purchasePrice) : null,
      quantity: parseInt(formData.quantity),
      lowStockThreshold: parseInt(formData.lowStockThreshold),
    };
    
    console.log('Form data:', formData);
    console.log('Product data being sent:', productData);

    try {
      const validatedData = productSchema.parse(productData);
      console.log('After Zod validation:', validatedData);
      setValidationErrors({});

      if (isEditMode) {
        // Ensure id is included for updates
        updateProduct.mutate({ ...validatedData, id: formData.id });
      } else {
        createProduct.mutate(validatedData);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Zod validation error:', error.errors);
        const errors = {};
        error.errors.forEach((err) => {
          errors[err.path[0]] = err.message;
        });
        setValidationErrors(errors);
      } else {
        console.error('Unexpected error:', error);
      }
    }
  };

  const handleEdit = (product) => {
    setFormData({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      purchasePrice: product.purchasePrice ? product.purchasePrice.toString() : '',
      sku: product.sku,
      quantity: product.quantity.toString(),
      lowStockThreshold: (product.lowStockThreshold || 10).toString(),
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = (product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteProduct.mutate(productToDelete.id);
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
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-800">Products</h1>
          {showLowStock && (
            <span className="bg-orange-100 text-orange-800 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 rounded-full">
              Low Stock Items
            </span>
          )}
          {showDamaged && (
            <span className="bg-red-100 text-red-800 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 rounded-full">
              Damaged Items
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full md:w-auto">
          {!showDamaged && (
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder={showLowStock ? "Search low stock products..." : "Search products..."}
                value={searchTerm}
                onChange={handleSearchChange}
                className={`w-full sm:w-64 pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  showLowStock 
                    ? 'border-orange-200 focus:ring-orange-500' 
                    : 'border-primary-200 focus:ring-primary-500'
                }`}
              />
              <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${
                showLowStock ? 'text-orange-400' : 'text-primary-400'
              }`}>
                <FaSearch />
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {(showLowStock || showDamaged) && (
              <button
                onClick={() => {
                  setShowLowStock(false);
                  setShowDamaged(false);
                }}
                className="px-3 py-2 text-sm border border-primary-200 rounded-lg text-primary-700 hover:bg-primary-50"
              >
                Show All Products
              </button>
            )}
            {!showLowStock && !showDamaged && (
              <>
                <button
                  onClick={() => {
                    setShowLowStock(true);
                    setShowDamaged(false);
                  }}
                  className="px-3 py-2 text-sm border border-orange-200 rounded-lg text-orange-700 hover:bg-orange-50"
                >
                  Low Stock
                </button>
                <button
                  onClick={() => {
                    setShowDamaged(true);
                    setShowLowStock(false);
                  }}
                  className="px-3 py-2 text-sm border border-red-200 rounded-lg text-red-700 hover:bg-red-50"
                >
                  Damaged Items
                </button>
              </>
            )}
            <button
              onClick={() => {
                setIsEditMode(false);
                setFormData({
                  name: '',
                  description: '',
                  price: '',
                  purchasePrice: '',
                  sku: '',
                  quantity: '',
                  lowStockThreshold: '10'
                });
                setValidationErrors({});
                setIsModalOpen(true);
              }}
              className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-3 py-2 text-sm rounded-lg hover:from-primary-700 hover:to-primary-800 shadow-sm whitespace-nowrap"
            >
              Add Product
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-x-auto border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-primary-50 to-primary-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-700 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-700 uppercase tracking-wider hidden md:table-cell">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-700 uppercase tracking-wider">Sell Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-700 uppercase tracking-wider hidden lg:table-cell">Purchase Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-700 uppercase tracking-wider hidden sm:table-cell">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-primary-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products?.items?.map((product) => (
              <tr key={product.id} className="hover:bg-primary-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-primary-700">{product.name}</td>
                <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell text-gray-600">{product.sku}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-primary-800">{formatPakistaniCurrency(product.price)}</td>
                <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell font-medium text-blue-800">
                  {product.purchasePrice ? formatPakistaniCurrency(product.purchasePrice) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                  <span className={`${
                    product.quantity <= (product.lowStockThreshold || 10)
                      ? 'text-orange-700 bg-orange-50 border border-orange-200' 
                      : 'text-green-700 bg-green-50 border border-green-200'
                  } px-2 py-1 rounded-full text-xs font-medium`}>
                    {product.quantity}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    {showDamaged ? (
                      <>
                        <button
                          onClick={() => {
                            setSelectedProductForDamage(product);
                            setDamagedQuantity('');
                            setMaxRestoreQuantity(product.quantity); // For damaged items, quantity field shows damaged amount
                            setDamagedModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                          Restore
                        </button>
                        <button
                          onClick={() => restoreDamaged.mutate({ productId: product.id, quantity: product.quantity })}
                          className="text-green-600 hover:text-green-900 inline-flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                          Restore All
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-primary-600 hover:text-primary-900 inline-flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProductForDamage(product);
                            setMaxRestoreQuantity(product.quantity);
                            setDamagedModalOpen(true);
                          }}
                          className="text-orange-600 hover:text-orange-900 inline-flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                          </svg>
                          Damage
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="text-red-600 hover:text-red-900 inline-flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m6.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                          Delete
                        </button>
                      </>
                    )}
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
            Page {currentPage} of {Math.ceil((products?.total || 0) / itemsPerPage)}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={currentPage >= Math.ceil((products?.total || 0) / itemsPerPage)}
            className="px-4 py-2 border border-primary-200 rounded-lg disabled:opacity-50 text-primary-700 hover:bg-primary-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md h-[90vh] shadow-xl border border-gray-200 flex flex-col">
            <div className="flex-shrink-0">
              <h2 className="text-2xl font-bold mb-6 text-primary-800 border-b border-primary-100 pb-2 flex items-center gap-2">
                <FaBoxOpen className="text-primary-600" />
                {isEditMode ? 'Edit Product' : 'Add New Product'}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto px-1 py-2">
              <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <FaBoxOpen className="text-primary-500" /> Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      // Clear name validation error when user starts typing
                      if (validationErrors.name) {
                        const newErrors = { ...validationErrors };
                        delete newErrors.name;
                        setValidationErrors(newErrors);
                      }
                    }}
                    className="w-full px-3 py-2 border border-primary-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {validationErrors.name && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-primary-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows="3"
                  />
                  {validationErrors.description && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.description}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <FaTag className="text-primary-500" /> SKU (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-primary-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {validationErrors.sku && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.sku}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <FaDollarSign className="text-primary-500" /> Sell Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    max="100000000"
                    value={formData.price}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (value > 100000000) {
                        setValidationErrors({...validationErrors, price: "Price cannot exceed Rs.10 Crores"});
                      } else {
                        setValidationErrors({...validationErrors, price: undefined});
                      }
                      setFormData({ ...formData, price: e.target.value });
                    }}
                    className="w-full px-3 py-2 border border-primary-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {validationErrors.price && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.price}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <FaDollarSign className="text-blue-500" /> Purchase Price (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    max="100000000"
                    value={formData.purchasePrice}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (value > 100000000) {
                        setValidationErrors({...validationErrors, purchasePrice: "Purchase price cannot exceed Rs.10 Crores"});
                      } else {
                        setValidationErrors({...validationErrors, purchasePrice: undefined});
                      }
                      setFormData({ ...formData, purchasePrice: e.target.value });
                    }}
                    className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {validationErrors.purchasePrice && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.purchasePrice}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <FaWarehouse className="text-primary-500" /> Quantity
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-primary-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {validationErrors.quantity && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.quantity}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-orange-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    Low Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                    className="w-full px-3 py-2 border border-orange-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="10"
                  />
                  {validationErrors.lowStockThreshold && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.lowStockThreshold}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Product will appear in low stock alerts when quantity ≤ this value</p>
                </div>
              </div>
              </form>
            </div>
            <div className="flex-shrink-0 mt-6 flex justify-end space-x-3 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setValidationErrors({});
                }}
                className="px-4 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="product-form"
                className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded hover:from-primary-700 hover:to-primary-800 shadow-sm"
              >
                {isEditMode ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Damaged Items Modal */}
      {damagedModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl border border-gray-200">
            <h2 className={`text-2xl font-bold mb-6 border-b pb-2 flex items-center gap-2 ${
              showDamaged ? 'text-blue-800 border-blue-100' : 'text-red-800 border-red-100'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${
                showDamaged ? 'text-blue-600' : 'text-red-600'
              }`}>
                <path strokeLinecap="round" strokeLinejoin="round" d={showDamaged ? "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" : "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"} />
              </svg>
              {showDamaged ? 'Restore Items' : 'Mark as Damaged'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <input
                  type="text"
                  value={selectedProductForDamage?.name || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {showDamaged ? 'Damaged Quantity' : 'Available Quantity'}
                </label>
                <input
                  type="text"
                  value={selectedProductForDamage?.quantity || 0}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {showDamaged ? 'Quantity to Restore' : 'Quantity to Damage'}
                </label>
                <input
                  type="number"
                  min="1"
                  max={maxRestoreQuantity}
                  value={damagedQuantity}
                  onChange={(e) => setDamagedQuantity(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    showDamaged 
                      ? 'border-blue-200 focus:ring-blue-500' 
                      : 'border-red-200 focus:ring-red-500'
                  }`}
                  placeholder={showDamaged ? 'Enter quantity to restore' : 'Enter quantity to mark as damaged'}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setDamagedModalOpen(false);
                  setSelectedProductForDamage(null);
                  setDamagedQuantity('');
                  setMaxRestoreQuantity(0);
                }}
                className="px-4 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (damagedQuantity && selectedProductForDamage) {
                    if (showDamaged) {
                      restoreDamaged.mutate({
                        productId: selectedProductForDamage.id,
                        quantity: parseInt(damagedQuantity)
                      });
                    } else {
                      markAsDamaged.mutate({
                        productId: selectedProductForDamage.id,
                        quantity: parseInt(damagedQuantity)
                      });
                    }
                  }
                }}
                disabled={!damagedQuantity || parseInt(damagedQuantity) <= 0 || parseInt(damagedQuantity) > maxRestoreQuantity}
                className={`px-4 py-2 bg-gradient-to-r text-white rounded shadow-sm disabled:bg-gray-400 ${
                  showDamaged 
                    ? 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                    : 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                }`}
              >
                {showDamaged ? 'Restore Items' : 'Mark as Damaged'}
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
          setProductToDelete(null);
          setDeleteError(null);
        }}
        onConfirm={confirmDelete}
        itemName={productToDelete ? `product "${productToDelete.name}"` : ''}
        error={deleteError}
      />
    </div>
  );
}

export default Products;