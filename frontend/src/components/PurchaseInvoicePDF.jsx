import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Define the formatting function directly in this file since React-PDF doesn't support imports well
function formatPakistaniCurrencyPDF(amount, showCurrency = true) {
  if (amount === null || amount === undefined) return showCurrency ? 'Rs.0.00' : '0.00';
  
  // Convert to number if it's a string
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Handle invalid input
  if (isNaN(num)) return showCurrency ? 'Rs.0.00' : '0.00';
  
  // Format with commas for lakhs and crores (1,00,000 format)
  const parts = num.toFixed(2).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Format with commas for lakhs and crores (Pakistani format)
  let formattedInteger = '';
  const length = integerPart.length;
  
  if (length <= 3) {
    formattedInteger = integerPart;
  } else {
    // First add the last 3 digits
    formattedInteger = integerPart.substring(length - 3);
    
    // Then add the rest in groups of 2
    let remaining = integerPart.substring(0, length - 3);
    while (remaining.length > 0) {
      const chunk = remaining.substring(Math.max(0, remaining.length - 2));
      formattedInteger = chunk + ',' + formattedInteger;
      remaining = remaining.substring(0, Math.max(0, remaining.length - 2));
    }
  }
  
  return (showCurrency ? 'Rs.' : '') + formattedInteger + '.' + decimalPart;
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2px solid #dc2626',
    paddingBottom: 20,
  },
  shopNameContainer: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
  },
  shopName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  brandsContainer: {
    backgroundColor: '#f3f4f6',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
    textAlign: 'center',
  },
  brands: {
    fontSize: 11,
    color: '#374151',
    fontWeight: 'bold',
  },
  descriptions: {
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 5,
    color: '#6b7280',
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f2937',
  },
  info: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 80,
    color: '#666',
  },
  value: {
    flex: 1,
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 5,
    marginBottom: 5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  col1: {
    flex: 2,
  },
  col2: {
    flex: 1,
    textAlign: 'right',
  },
  col3: {
    flex: 1,
    textAlign: 'right',
  },
  col4: {
    flex: 1,
    textAlign: 'right',
  },
  total: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalLabel: {
    marginRight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
  },
  contactInfo: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  summaryTable: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 5,
  },
});

function PurchaseInvoicePDF({ purchase, shopSettings }) {
  // Create brand array with registered trademark symbols
  const brands = [];
  
  if (shopSettings?.brand1) {
    brands.push(shopSettings.brand1 + (shopSettings.brand1Registered ? '®' : ''));
  }
  if (shopSettings?.brand2) {
    brands.push(shopSettings.brand2 + (shopSettings.brand2Registered ? '®' : ''));
  }
  if (shopSettings?.brand3) {
    brands.push(shopSettings.brand3 + (shopSettings.brand3Registered ? '®' : ''));
  }
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.shopNameContainer}>
            <Text style={styles.shopName}>{shopSettings?.shopName || 'PURCHASE INVOICE'}</Text>
          </View>
          
          {brands.length > 0 && (
            <View style={styles.brandsContainer}>
              <Text style={styles.brands}>{brands.join(' • ')}</Text>
            </View>
          )}
          
          <View style={styles.descriptions}>
            {shopSettings?.shopDescription && <Text style={styles.subtitle}>{shopSettings.shopDescription}</Text>}
            {shopSettings?.shopDescription2 && <Text style={styles.subtitle}>{shopSettings.shopDescription2}</Text>}
          </View>
          
          <Text style={styles.title}>PURCHASE INVOICE</Text>
        </View>

        <View style={styles.info}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>
              {new Date(purchase.purchaseDate).toLocaleDateString()} {new Date(purchase.purchaseDate).toLocaleTimeString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Contact:</Text>
            <Text style={styles.value}>{purchase.contact?.name || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{purchase.contact?.address || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{purchase.contact?.phoneNumber || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Invoice:</Text>
            <Text style={styles.value}>{purchase.invoiceNumber}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Item</Text>
            <Text style={styles.col2}>Quantity</Text>
            <Text style={styles.col3}>Price</Text>
            <Text style={styles.col4}>Subtotal</Text>
          </View>

          {purchase.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col1}>{item.product.name}</Text>
              <Text style={styles.col2}>{item.quantity}</Text>
              <Text style={styles.col3}>{formatPakistaniCurrencyPDF(item.purchasePrice)}</Text>
              <Text style={styles.col4}>
                {formatPakistaniCurrencyPDF(item.purchasePrice * item.quantity)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryTable}>
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.col4}>{formatPakistaniCurrencyPDF(purchase.totalAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Paid Amount:</Text>
            <Text style={styles.col4}>{formatPakistaniCurrencyPDF(purchase.paidAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Balance:</Text>
            <Text style={styles.col4}>{formatPakistaniCurrencyPDF(purchase.totalAmount - purchase.paidAmount)}</Text>
          </View>
          {purchase.totalAmount > purchase.paidAmount && (
            <View style={[styles.summaryRow, { marginTop: 10 }]}>
              <Text style={{ color: '#b45309', fontWeight: 'bold' }}>PAYMENT DUE</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          {shopSettings && (
            <View>
              {shopSettings.userName1 && <Text style={styles.contactInfo}>{shopSettings.userName1}: {shopSettings.userPhone1}</Text>}
              {shopSettings.userName2 && <Text style={styles.contactInfo}>{shopSettings.userName2}: {shopSettings.userPhone2}</Text>}
              {shopSettings.userName3 && <Text style={styles.contactInfo}>{shopSettings.userName3}: {shopSettings.userPhone3}</Text>}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}

export default PurchaseInvoicePDF;