import React, { useState } from 'react';
import axios from 'axios';
import { FaUser, FaLock, FaEdit } from 'react-icons/fa';

function UpdateUsernameForm() {
  const [currentUsername, setCurrentUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/update-username`, {
        currentUsername,
        newUsername,
        password
      });
      
      setSuccess(true);
      setCurrentUsername('');
      setNewUsername('');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update username');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary-50 to-accent-50 p-6 rounded-lg shadow-lg border border-primary-100">
      <div className="flex items-center gap-3 mb-4">
        <FaEdit className="text-2xl text-primary-600" />
        <h2 className="text-xl font-bold text-primary-800">Update Username</h2>
      </div>
      
      <p className="mb-4 text-gray-600">
        Change your login username. You'll need to provide your current credentials.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Username
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaUser className="text-gray-400" />
            </div>
            <input
              type="text"
              value={currentUsername}
              onChange={(e) => setCurrentUsername(e.target.value)}
              required
              minLength={3}
              className="w-full pl-10 px-3 py-2 border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter current username"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Username
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaUser className="text-gray-400" />
            </div>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              required
              minLength={3}
              className="w-full pl-10 px-3 py-2 border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter new username"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password (for verification)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaLock className="text-gray-400" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
              className="w-full pl-10 px-3 py-2 border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter your password"
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className={`w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700'
          }`}
        >
          {loading ? 'Updating...' : 'Update Username'}
        </button>
      </form>
      
      {success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
          <p className="font-medium">Username updated successfully!</p>
          <p className="text-sm">Use your new username for future logins.</p>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500 bg-white bg-opacity-50 p-3 rounded-md border border-gray-100">
        <p>Note: You'll need to use the new username for future logins. Make sure to remember it.</p>
      </div>
    </div>
  );
}

export default UpdateUsernameForm;