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
    paddingBottom: 30,
    fontSize: 10,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2px solid #2563eb',
    paddingBottom: 20,
  },
  shopNameContainer: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
  },
  shopName: {
    fontSize: 20,
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
    fontSize: 9,
    color: '#374151',
    fontWeight: 'bold',
  },
  descriptions: {
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 10,
    marginBottom: 5,
    color: '#6b7280',
    textAlign: 'center',
  },
  title: {
    fontSize: 16,
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
    textAlign: 'center',
  },
  col3: {
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
    fontSize: 12,
    color: '#374151',
  },
  contactInfo: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 4,
  },
});

function SimpleDateInvoicePDF({ date, sales, shopSettings }) {
  const totalAmount = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
  
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
            <Text style={styles.shopName}>
              {shopSettings?.shopName || "DAILY SALES REPORT"}
            </Text>
          </View>

          {brands.length > 0 && (
            <View style={styles.brandsContainer}>
              <Text style={styles.brands}>{brands.join(" • ")}</Text>
            </View>
          )}

          <View style={styles.descriptions}>
            {shopSettings?.shopDescription && (
              <Text style={styles.subtitle}>
                {shopSettings.shopDescription}
              </Text>
            )}
            {shopSettings?.shopDescription2 && (
              <Text style={styles.subtitle}>
                {shopSettings.shopDescription2}
              </Text>
            )}
          </View>

          <Text style={styles.title}>DAILY SALES REPORT</Text>
        </View>

        <View style={styles.info}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{new Date(date).toLocaleDateString()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Total Sales:</Text>
            <Text style={styles.value}>{sales.length}</Text>
          </View>
        </View>

        {sales.map((sale, saleIndex) => {
          // Calculate payment status
          const netAmount = (sale.totalAmount) - (sale.returns?.reduce((sum, ret) => sum + ret.totalAmount, 0) || 0);
          const totalRefunded = (sale.returns?.reduce((sum, ret) => sum + (ret.refundPaid ? (ret.refundAmount || 0) : 0), 0) || 0);
          const balance = netAmount - sale.paidAmount + totalRefunded;
          
          let status = '';
          if (balance > 0) {
            status = 'PAYMENT DUE';
          } else if (balance < 0) {
            const allRefundsPaid = sale.returns?.every(ret => ret.refundPaid) || false;
            if (allRefundsPaid && totalRefunded > 0) {
              status = 'REFUNDED';
            } else {
              status = 'CREDIT BALANCE';
            }
          } else {
            status = 'FULLY PAID';
          }
          
          return (
            <View key={saleIndex} style={{ marginBottom: 20 }}>
              <View style={{ backgroundColor: '#f3f4f6', padding: 8, marginBottom: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Sale #{sale.billNumber} - {formatPakistaniCurrencyPDF(sale.totalAmount)} - {status}</Text>
              </View>
            
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.col1}>Item Name</Text>
                <Text style={styles.col2}>Qty</Text>
                <Text style={styles.col3}>Price</Text>
              </View>

              {sale.items?.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.tableRow}>
                  <Text style={styles.col1}>{item.product?.name || 'Unknown'}</Text>
                  <Text style={styles.col2}>{item.quantity}</Text>
                  <Text style={styles.col3}>{formatPakistaniCurrencyPDF(item.price)}</Text>
                </View>
              ))}
            </View>
            </View>
          );
        })}

        <View style={styles.total}>
          <Text style={styles.totalLabel}>Grand Total:</Text>
          <Text>{formatPakistaniCurrencyPDF(totalAmount)}</Text>
        </View>

        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              {shopSettings && (
                <View>
                  {shopSettings.userName1 && (
                    <Text style={styles.contactInfo}>
                      {shopSettings.userName1}: {shopSettings.userPhone1}
                    </Text>
                  )}
                  {shopSettings.userName2 && (
                    <Text style={styles.contactInfo}>
                      {shopSettings.userName2}: {shopSettings.userPhone2}
                    </Text>
                  )}
                  {shopSettings.userName3 && (
                    <Text style={styles.contactInfo}>
                      {shopSettings.userName3}: {shopSettings.userPhone3}
                    </Text>
                  )}
                </View>
              )}
            </View>
            <View style={{ textAlign: 'right' }}>
              <View style={{ border: '1px solid #666', padding: 5, borderRadius: 3 }}>
                <Text style={styles.contactInfo}>
                  Goods will not be returned or exchanged after use.
                </Text>
                <Text style={styles.contactInfo}>
                  No Return / Exchange after use.
                </Text>
              </View>
            </View>
          </View>
          <View style={{ borderTop: '1px solid #ccc', marginTop: 10, paddingTop: 8 }}>
            <Text style={{ fontSize: 8, textAlign: 'center', color: '#666' }}>
              Need system like this? contact 03145292649
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export default SimpleDateInvoicePDF;