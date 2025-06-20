import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

function ShopSettingsForm() {
  const queryClient = useQueryClient();
  const [showToast, setShowToast] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    shopName: '',
    shopDescription: '',
    shopDescription2: '',
    userName1: '',
    userPhone1: '',
    userName2: '',
    userPhone2: '',
    userName3: '',
    userPhone3: '',
    brand1: '',
    brand1Registered: false,
    brand2: '',
    brand2Registered: false,
    brand3: '',
    brand3Registered: false,
  });

  const { data: settings, isLoading } = useQuery(['shop-settings'], async () => {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/shop-settings`);
    return response.data;
  }, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        ...settings,
        brand1Registered: settings.brand1Registered || false,
        brand2Registered: settings.brand2Registered || false,
        brand3Registered: settings.brand3Registered || false,
      });
    }
  }, [settings]);

  const saveSettings = useMutation(
    async (data) => {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/shop-settings`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['shop-settings']);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      },
      onError: (error) => {
        alert('Error saving settings: ' + error.response?.data?.error);
      }
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    saveSettings.mutate(formData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-6">Shop Settings</h2>
      {showToast && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
          Settings saved successfully!
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Shop Name *</label>
            <input
              type="text"
              name="shopName"
              value={formData.shopName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Shop Description</label>
          <textarea
            name="shopDescription"
            value={formData.shopDescription}
            onChange={handleChange}
            rows="2"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Shop Description 2</label>
          <textarea
            name="shopDescription2"
            value={formData.shopDescription2}
            onChange={handleChange}
            rows="2"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">User Name 1 *</label>
            <input
              type="text"
              name="userName1"
              value={formData.userName1}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone 1 *</label>
            <input
              type="text"
              name="userPhone1"
              value={formData.userPhone1}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">User Name 2</label>
            <input
              type="text"
              name="userName2"
              value={formData.userName2}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone 2</label>
            <input
              type="text"
              name="userPhone2"
              value={formData.userPhone2}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">User Name 3</label>
            <input
              type="text"
              name="userName3"
              value={formData.userName3}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone 3</label>
            <input
              type="text"
              name="userPhone3"
              value={formData.userPhone3}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Brand 1</label>
            <div className="space-y-2">
              <input
                type="text"
                name="brand1"
                value={formData.brand1}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="brand1Registered"
                  name="brand1Registered"
                  checked={formData.brand1Registered}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="brand1Registered" className="ml-2 text-sm text-gray-700">Registered Trademark (®)</label>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Brand 2</label>
            <div className="space-y-2">
              <input
                type="text"
                name="brand2"
                value={formData.brand2}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="brand2Registered"
                  name="brand2Registered"
                  checked={formData.brand2Registered}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="brand2Registered" className="ml-2 text-sm text-gray-700">Registered Trademark (®)</label>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Brand 3</label>
            <div className="space-y-2">
              <input
                type="text"
                name="brand3"
                value={formData.brand3}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="brand3Registered"
                  name="brand3Registered"
                  checked={formData.brand3Registered}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="brand3Registered" className="ml-2 text-sm text-gray-700">Registered Trademark (®)</label>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saveSettings.isLoading}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {saveSettings.isLoading ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}

export default ShopSettingsForm;