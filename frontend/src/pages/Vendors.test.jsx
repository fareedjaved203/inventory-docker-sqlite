import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Vendors from './Vendors';

// Mock fetch globally
global.fetch = jest.fn();

describe('Vendors Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock successful fetch response for vendors
    fetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [],
            total: 0,
            page: 1,
            totalPages: 1,
          }),
      })
    );
  });

  it('renders the vendors page title', () => {
    render(<Vendors />);
    expect(screen.getByText('Vendors')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<Vendors />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows add vendor button', () => {
    render(<Vendors />);
    expect(screen.getByText('Add Vendor')).toBeInTheDocument();
  });

  it('shows vendor search input', () => {
    render(<Vendors />);
    expect(screen.getByPlaceholderText('Search vendors...')).toBeInTheDocument();
  });

  it('opens add vendor modal with correct fields when clicking add button', async () => {
    render(<Vendors />);
    const addButton = screen.getByText('Add Vendor');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByText('Add New Vendor')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
    });
  });

  it('displays validation errors when submitting empty form', async () => {
    render(<Vendors />);
    const addButton = screen.getByText('Add Vendor');
    fireEvent.click(addButton);
    
    const submitButton = screen.getByText('Add Vendor');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Address is required')).toBeInTheDocument();
      expect(screen.getByText('Phone number is required')).toBeInTheDocument();
    });
  });

  it('validates phone number to contain only numbers', async () => {
    render(<Vendors />);
    const addButton = screen.getByText('Add Vendor');
    fireEvent.click(addButton);
    
    const phoneInput = screen.getByLabelText('Phone Number');
    fireEvent.change(phoneInput, { target: { value: '123abc456' } });
    
    const submitButton = screen.getByText('Add Vendor');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Phone number must contain only numbers')).toBeInTheDocument();
    });
  });

  it('submits form with correct data', async () => {
    render(<Vendors />);
    const addButton = screen.getByText('Add Vendor');
    fireEvent.click(addButton);
    
    const nameInput = screen.getByLabelText('Name');
    const addressInput = screen.getByLabelText('Address');
    const phoneInput = screen.getByLabelText('Phone Number');
    
    fireEvent.change(nameInput, { target: { value: 'Test Vendor' } });
    fireEvent.change(addressInput, { target: { value: '123 Test St' } });
    fireEvent.change(phoneInput, { target: { value: '1234567890' } });
    
    const submitButton = screen.getByText('Add Vendor');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Vendor',
          address: '123 Test St',
          phoneNumber: '1234567890',
        }),
      });
    });
  });
});