import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Contacts from './pages/Contacts';
import BulkPurchasing from './pages/BulkPurchasing';
import Returns from './pages/Returns';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import AuthModal from './components/AuthModal';

const queryClient = new QueryClient();

function AppContent() {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Clear auth on container restart by checking a session timestamp
    const authTime = localStorage.getItem('authTime');
    const isAuth = localStorage.getItem('isAuthenticated') === 'true';
    
    // If more than 1 hour passed or no timestamp, require re-auth
    if (!authTime || Date.now() - parseInt(authTime) > 3600000) {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('authTime');
      return false;
    }
    
    return isAuth;
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const { data: authCheck, isLoading } = useQuery(
    ['auth-check'],
    async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/check`);
      return response.data;
    },
    {
      retry: false,
      refetchOnWindowFocus: false
    }
  );

  useEffect(() => {
    if (authCheck && !isAuthenticated) {
      setShowAuthModal(true);
    }
  }, [authCheck, isAuthenticated]);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setShowAuthModal(false);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('authTime', Date.now().toString());
    // Invalidate auth check to refetch user count
    queryClient.invalidateQueries(['auth-check']);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setShowAuthModal(true);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('authTime');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && showAuthModal) {
    return (
      <AuthModal 
        isSignup={!authCheck?.hasUser} 
        onSuccess={handleAuthSuccess}
        queryClient={queryClient}
      />
    );
  }

  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
        <Sidebar onLogout={handleLogout} />
        <div className="flex-1 overflow-auto p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/bulk" element={<BulkPurchasing />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;