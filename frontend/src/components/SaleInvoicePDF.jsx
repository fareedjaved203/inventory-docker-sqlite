import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

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
    fontSize: 12,
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
    fontSize: 12,
    color: '#374151',
  },
  contactInfo: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  statusTag: {
    padding: '3 6',
    borderRadius: 4,
    fontSize: 10,
    marginLeft: 5,
  },
  statusPaid: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  statusDue: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  statusCredit: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  statusRefunded: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
  },
});

function SaleInvoicePDF({ sale, shopSettings }) {
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
  
  // Calculate payment status
  const netAmount = (sale.totalAmount) - (sale.returns?.reduce((sum, ret) => sum + ret.totalAmount, 0) || 0);
  const totalRefunded = (sale.returns?.reduce((sum, ret) => sum + (ret.refundPaid ? (ret.refundAmount || 0) : 0), 0) || 0);
  const balance = netAmount - sale.paidAmount + totalRefunded;
  
  // Determine status
  let status = '';
  let statusStyle = {};
  
  if (balance > 0) {
    status = 'PAYMENT DUE';
    statusStyle = styles.statusDue;
  } else if (balance < 0) {
    // Check if all refunds are paid
    const allRefundsPaid = sale.returns?.every(ret => ret.refundPaid) || false;
    if (allRefundsPaid && totalRefunded > 0) {
      status = 'REFUNDED';
      statusStyle = styles.statusRefunded;
    } else {
      status = 'CREDIT BALANCE';
      statusStyle = styles.statusCredit;
    }
  } else {
    status = 'FULLY PAID';
    statusStyle = styles.statusPaid;
  }
  
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View style={styles.shopNameContainer}>
            <Text style={styles.shopName}>
              {shopSettings?.shopName || "INVOICE"}
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

          <Text style={styles.title}>SALES INVOICE</Text>
        </View>

        <View style={styles.info}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Invoice No:</Text>
            <Text style={styles.value}>{sale.billNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>
              {new Date(sale.saleDate).toLocaleDateString()}{" "}
              {new Date(sale.saleDate).toLocaleTimeString()}
            </Text>
          </View>
          {sale.contact && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Contact:</Text>
              <Text style={styles.value}>
                {sale.contact.name}{" "}
                {sale.contact.phoneNumber
                  ? `(${sale.contact.phoneNumber})`
                  : ""}
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.label}>Status:</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={[styles.statusTag, statusStyle]}>{status}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Item</Text>
            <Text style={styles.col2}>Quantity</Text>
            <Text style={styles.col3}>Price</Text>
            <Text style={styles.col4}>Subtotal</Text>
          </View>

          {sale.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col1}>{item.product.name}</Text>
              <Text style={styles.col2}>{item.quantity}</Text>
              <Text style={styles.col3}>
                Rs.{formatPakistaniCurrencyPDF(item.price, false)}
              </Text>
              <Text style={styles.col4}>
                Rs.
                {formatPakistaniCurrencyPDF(item.price * item.quantity, false)}
              </Text>
            </View>
          ))}
        </View>

        {/* Returns Section */}
        {sale.returns && sale.returns.length > 0 && (
          <View style={styles.table}>
            <Text
              style={[
                styles.title,
                { fontSize: 14, marginTop: 20, marginBottom: 10 },
              ]}
            >
              RETURNED ITEMS
            </Text>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Return #</Text>
              <Text style={styles.col2}>Date</Text>
              <Text style={styles.col3}>Items</Text>
              <Text style={styles.col4}>Amount</Text>
            </View>
            {sale.returns.map((returnRecord, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.col1}>{returnRecord.returnNumber}</Text>
                <Text style={styles.col2}>
                  {new Date(returnRecord.returnDate).toLocaleDateString()}
                </Text>
                <Text style={styles.col3}>
                  {returnRecord.items
                    .map(
                      (item) =>
                        `${item.product?.name || "Unknown Product"} x${
                          item.quantity
                        }`
                    )
                    .join(", ")}
                </Text>
                <Text style={styles.col4}>
                  Rs.
                  {formatPakistaniCurrencyPDF(returnRecord.totalAmount, false)}
                </Text>
              </View>
            ))}
          </View>
        )}


        {Number(sale.discount) > 0 && (
          <>
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text>
              {formatPakistaniCurrencyPDF(
                sale.totalAmount + (sale.discount || 0)
              )}
            </Text>
          </View>
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Discount:</Text>
            <Text>-{formatPakistaniCurrencyPDF(sale.discount || 0)}</Text>
          </View>
          </>
        )}

        <View style={styles.total}>
          <Text style={styles.totalLabel}>Total Amount:</Text>
          <Text>{formatPakistaniCurrencyPDF(sale.totalAmount)}</Text>
        </View>

        <View style={styles.total}>
          <Text style={styles.totalLabel}>Paid Amount:</Text>
          <Text>{formatPakistaniCurrencyPDF(sale.paidAmount)}</Text>
        </View>

        {sale.returns && sale.returns.length > 0 && (
          <View>
            <View style={styles.total}>
              <Text style={styles.totalLabel}>Total Returned:</Text>
              <Text>
                {formatPakistaniCurrencyPDF(
                  sale.returns.reduce((sum, ret) => sum + ret.totalAmount, 0)
                )}
              </Text>
            </View>
            {totalRefunded > 0 && (
              <View style={styles.total}>
                <Text style={styles.totalLabel}>Total Refunded:</Text>
                <Text>{formatPakistaniCurrencyPDF(totalRefunded)}</Text>
              </View>
            )}
            <View style={styles.total}>
              <Text style={styles.totalLabel}>Net Total After Returns:</Text>
              <Text>{formatPakistaniCurrencyPDF(netAmount > 0 ? netAmount : 0)}</Text>
            </View>
            {(() => {
              return balance > 0 ? (
                <View style={styles.total}>
                  <Text style={styles.totalLabel}>Net Balance Due:</Text>
                  <Text>{formatPakistaniCurrencyPDF(balance)}</Text>
                </View>
              ) : balance < 0 ? (
                <View style={styles.total}>
                  <Text style={styles.totalLabel}>Credit Balance:</Text>
                  <Text>{formatPakistaniCurrencyPDF(Math.abs(balance) <= sale.paidAmount ? Math.abs(balance) : 0)}</Text>
                </View>
              ) : (
                <View style={styles.total}>
                  <Text style={styles.totalLabel}>Status:</Text>
                  <Text>Fully Paid</Text>
                </View>
              );
            })()}
          </View>
        )}

        {(!sale.returns || sale.returns.length === 0) &&
          sale.totalAmount > sale.paidAmount && (
            <View style={styles.total}>
              <Text style={styles.totalLabel}>Balance Due:</Text>
              <Text>
                {formatPakistaniCurrencyPDF(sale.totalAmount - sale.paidAmount)}
              </Text>
            </View>
          )}

        <View style={styles.footer} fixed={false}>
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

export default SaleInvoicePDF;