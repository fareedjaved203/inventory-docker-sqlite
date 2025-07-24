import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { FaDatabase, FaEnvelope, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

function DatabaseBackupForm() {
  const [activeTab, setActiveTab] = useState('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // Google Drive states
  const [serviceAccountKey, setServiceAccountKey] = useState('');
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveSuccess, setDriveSuccess] = useState(false);
  const [driveError, setDriveError] = useState(null);
  const [credentialsExist, setCredentialsExist] = useState(false);

  const { data: shopSettings } = useQuery(['shop-settings'], async () => {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/shop-settings`);
    return response.data;
  });

  const { data: driveSettings } = useQuery(['drive-settings'], async () => {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/drive-settings`);
    return response.data;
  });

  useEffect(() => {
    if (shopSettings?.email && email === '') {
      setEmail(shopSettings.email);
    }
  }, [shopSettings]);

  useEffect(() => {
    if (driveSettings) {
      setCredentialsExist(driveSettings.hasCredentials);
    }
  }, [driveSettings]);

  const handleDriveCredentialsSave = async (e) => {
    e.preventDefault();
    setDriveLoading(true);
    setDriveSuccess(false);
    setDriveError(null);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/user/drive-settings`,
        { serviceAccountKey }
      );
      
      setDriveSuccess(true);
      setCredentialsExist(true);
      setServiceAccountKey('');
    } catch (err) {
      setDriveError(err.response?.data?.error || 'Failed to save credentials');
    } finally {
      setDriveLoading(false);
    }
  };

  const handleDriveBackup = async () => {
    setDriveLoading(true);
    setDriveSuccess(false);
    setDriveError(null);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/user/drive-backup`
      );
      
      setDriveSuccess(true);
    } catch (err) {
      setDriveError(err.response?.data?.error || 'Failed to backup to Google Drive');
    } finally {
      setDriveLoading(false);
    }
  };

  const handleDeleteCredentials = async () => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/user/drive-settings`);
      setCredentialsExist(false);
      setDriveSuccess(false);
    } catch (err) {
      setDriveError(err.response?.data?.error || 'Failed to delete credentials');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);
    setPreviewUrl(null);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/user/backup`,
        { email }
      );
      
      setSuccess(true);
      
      // If using Ethereal (test email service), show preview link
      if (response.data.previewUrl) {
        setPreviewUrl(response.data.previewUrl);
      }
      
      console.log('Backup sent successfully:', response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send backup');
      console.error('Error sending backup:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary-50 to-accent-50 p-6 rounded-lg shadow-lg border border-primary-100">
      <div className="flex items-center gap-3 mb-6">
        <FaDatabase className="text-2xl text-primary-600" />
        <h2 className="text-xl font-bold text-primary-800">Database Backup</h2>
      </div>
      


      <div>
          <p className="mb-4 text-gray-600">
            Enter your email address to receive a backup of the database.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 px-3 py-2 border border-primary-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="your@email.com"
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
              {loading ? 'Sending...' : 'Send Backup'}
            </button>
          </form>
          
          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-start gap-3">
              <FaCheckCircle className="text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Backup sent successfully!</p>
                {previewUrl ? (
                  <div className="mt-2">
                    <p>This is a test email. View it here:</p>
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                      View Test Email
                    </a>
                  </div>
                ) : (
                  <p>Please check your email.</p>
                )}
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-3">
              <FaExclamationCircle className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>{error}</div>
            </div>
          )}
      </div>
      
      <div className="mt-6 text-sm text-gray-500 bg-white bg-opacity-50 p-3 rounded-md border border-gray-100">
        <p>Note: The backup file is compressed (ZIP format) to reduce size and contains your entire database for restoration purposes.</p>
      </div>
    </div>
  );
}

export default DatabaseBackupForm;