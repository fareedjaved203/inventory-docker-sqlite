import React, { useState, useEffect } from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Function to convert Urdu text to high-res image
const urduTextToImage = async (text, fontSize = 12, targetWidth = 300) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const scale = 4; // 4x resolution for crisp text
  
  canvas.width = targetWidth * scale;
  canvas.height = (fontSize * 2 + 20) * scale;
  
  // Scale context for high DPI
  ctx.scale(scale, scale);
  ctx.font = `${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Anti-aliasing for smoother text
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  const lines = text.split('\n');
  const lineHeight = fontSize + 4;
  const startY = (canvas.height / scale - (lines.length - 1) * lineHeight) / 2;
  
  lines.forEach((line, index) => {
    ctx.fillText(line, targetWidth / 2, startY + index * lineHeight);
  });
  
  return canvas.toDataURL('image/png');
};

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
    padding: 8,
    fontSize: 6,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '100vh',
  },
  header: {
    marginBottom: 3,
    border: '1px solid #000000',
    padding: 3,
  },
  shopNameContainer: {
    borderBottom: '1px solid #000000',
    paddingBottom: 3,
    marginBottom: 3,
  },
  shopName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },
  compactInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginVertical: 2,
  },
  leftSection: {
    flex: 1,
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  brands: {
    fontSize: 6,
    color: '#000000',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 6,
    marginBottom: 1,
    color: '#000000',
  },
  title: {
    fontSize: 10,
    marginTop: 3,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000000',
    border: '1px solid #000000',
    padding: 2,
  },
  info: {
    marginBottom: 4,
    border: '1px solid #000000',
    padding: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  infoItem: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 8,
  },
  label: {
    width: 40,
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 6,
  },
  value: {
    flex: 1,
    fontSize: 6,
    color: '#000000',
  },
  table: {
    marginTop: 2,
    border: '1px solid #000000',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingVertical: 2,
    paddingHorizontal: 3,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 1,
    paddingHorizontal: 3,
    borderBottom: '0.5px solid #000000',
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 1,
    paddingHorizontal: 3,
    borderBottom: '0.5px solid #000000',
    backgroundColor: '#f8f8f8',
  },
  col1: {
    flex: 2.5,
    fontSize: 9,
    color: '#000000',
    fontWeight: 'normal',
  },
  col2: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9,
    color: '#000000',
  },
  col3: {
    flex: 1.2,
    textAlign: 'right',
    fontSize: 9,
    color: '#000000',
  },
  col4: {
    flex: 1.3,
    textAlign: 'right',
    fontSize: 9,
    color: '#000000',
    fontWeight: 'bold',
  },
  total: {
    marginTop: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 1,
    borderBottom: '0.5px dotted #000000',
  },
  totalLabel: {
    marginRight: 8,
    fontWeight: 'bold',
    fontSize: 9,
    color: '#000000',
  },
  content: {
    flex: 1,
  },
  footer: {
    marginTop: 'auto',
    fontSize: 5,
    color: '#000000',
    borderTop: '2px solid #000000',
    paddingTop: 6,
  },
  contactInfo: {
    fontSize: 6,
    color: '#000000',
    marginBottom: 1,
  },
  statusTag: {
    padding: '2 6',
    border: '1px solid #000000',
    fontSize: 6,
    marginLeft: 3,
    fontWeight: 'bold',
  },
  statusPaid: {
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  statusDue: {
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  statusCredit: {
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  statusRefunded: {
    backgroundColor: '#ffffff',
    color: '#000000',
  },
});

// Header component to be repeated on each page
const InvoiceHeader = ({ shopSettings, brands }) => (
  <View style={styles.header} fixed>
    <View style={styles.shopNameContainer}>
      <Text style={styles.shopName}>
        {shopSettings?.shopName || "INVOICE"}
      </Text>
    </View>
    <View style={styles.compactInfo}>
      <View style={styles.leftSection}>
        {brands.length > 0 && (
          <Text style={styles.brands}>{brands.join(" • ")}</Text>
        )}
        {shopSettings?.shopDescription && (
          <Text style={styles.subtitle}>{shopSettings.shopDescription}</Text>
        )}
        {shopSettings?.shopDescription2 && (
          <Text style={styles.subtitle}>{shopSettings.shopDescription2}</Text>
        )}
      </View>
      <View style={styles.rightSection}>
        {shopSettings?.userName1 && (
          <Text style={styles.contactInfo}>
            {shopSettings.userName1}: {shopSettings.userPhone1}
          </Text>
        )}
        {shopSettings?.userName2 && (
          <Text style={styles.contactInfo}>
            {shopSettings.userName2}: {shopSettings.userPhone2}
          </Text>
        )}
        {shopSettings?.userName3 && (
          <Text style={styles.contactInfo}>
            {shopSettings.userName3}: {shopSettings.userPhone3}
          </Text>
        )}
      </View>
    </View>
    <Text style={styles.title}>SALES INVOICE</Text>
  </View>
);

function SaleInvoicePDF({ sale, shopSettings }) {
  const [urduImage, setUrduImage] = useState(null);

  useEffect(() => {
    const generateUrduImage = async () => {
      try {
        const imageData = await urduTextToImage('استعمال کے بعد سامان واپس یا تبدیل نہیں ہوگا۔\nالیکٹرک سامان کی کوئی گارنٹی نہیں ہے۔', 60, 1500);
        setUrduImage(imageData);
      } catch (error) {
        console.error('Error generating Urdu image:', error);
      }
    };
    generateUrduImage();
  }, []);

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
      <Page size="A5" style={styles.page} wrap>
        <InvoiceHeader shopSettings={shopSettings} brands={brands} />
        <View style={styles.content}>

        <View style={styles.info}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Invoice:</Text>
              <Text style={styles.value}>{sale.billNumber}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Date:</Text>
              <Text style={styles.value}>
                {new Date(sale.saleDate).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            {sale.contact ? (
              <View style={{ flex: 1, marginRight: 8 }}>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={styles.label}>Contact:</Text>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#000000', flex: 1 }}>
                    {sale.contact.name}{sale.contact.phoneNumber ? ` (${sale.contact.phoneNumber})` : ""}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.infoItem}>
                <Text style={styles.label}>Status:</Text>
                <Text style={{ fontSize: 6, color: '#000000', fontWeight: 'bold' }}>{status}</Text>
              </View>
            )}
            {sale.contact && (
              <View style={styles.infoItem}>
                <Text style={styles.label}>Status:</Text>
                <Text style={{ fontSize: 6, color: '#000000', fontWeight: 'bold' }}>{status}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col1, { color: '#000000', fontWeight: 'bold', fontSize: 10 }]}>ITEM</Text>
            <Text style={[styles.col2, { color: '#000000', fontWeight: 'bold', fontSize: 10 }]}>QTY</Text>
            <Text style={[styles.col3, { color: '#000000', fontWeight: 'bold', fontSize: 10 }]}>RATE</Text>
            <Text style={[styles.col4, { color: '#000000', fontWeight: 'bold', fontSize: 10 }]}>AMOUNT</Text>
          </View>

          {sale.items.map((item, index) => (
            <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={styles.col1}>{item.product.name}</Text>
              <Text style={styles.col2}>{item.quantity}</Text>
              <Text style={styles.col3}>
                Rs.{formatPakistaniCurrencyPDF(item.price, false)}
              </Text>
              <Text style={styles.col4}>
                Rs.{formatPakistaniCurrencyPDF(item.price * item.quantity, false)}
              </Text>
            </View>
          ))}
        </View>

        {/* Exchange Items Section */}
        {sale.exchangeItems && sale.exchangeItems.length > 0 && (
          <View style={[styles.table, { marginTop: 4 }]}>
            <View style={[styles.tableHeader, { backgroundColor: '#fff2e6' }]}>
              <Text style={[styles.col1, { color: '#000000', fontWeight: 'bold', fontSize: 10 }]}>EXCHANGE ITEM</Text>
              <Text style={[styles.col2, { color: '#000000', fontWeight: 'bold', fontSize: 10 }]}>QTY</Text>
              <Text style={[styles.col3, { color: '#000000', fontWeight: 'bold', fontSize: 10 }]}>RATE</Text>
              <Text style={[styles.col4, { color: '#000000', fontWeight: 'bold', fontSize: 10 }]}>AMOUNT</Text>
            </View>
            {sale.exchangeItems.map((item, index) => (
              <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={styles.col1}>{item.product.name}</Text>
                <Text style={styles.col2}>{item.quantity}</Text>
                <Text style={styles.col3}>-</Text>
                <Text style={styles.col4}>-</Text>
              </View>
            ))}
          </View>
        )}

        {/* Returns Section */}
        {sale.returns && sale.returns.length > 0 && (
          <View style={[styles.table, { marginTop: 10 }]}>
            <Text style={[styles.title, { fontSize: 8, marginTop: 8, marginBottom: 4 }]}>
              RETURNED ITEMS
            </Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.col1, { color: '#000000', fontWeight: 'bold', fontSize: 8 }]}>RETURN #</Text>
              <Text style={[styles.col2, { color: '#000000', fontWeight: 'bold', fontSize: 8 }]}>DATE</Text>
              <Text style={[styles.col3, { color: '#000000', fontWeight: 'bold', fontSize: 8 }]}>ITEMS</Text>
              <Text style={[styles.col4, { color: '#000000', fontWeight: 'bold', fontSize: 8 }]}>AMOUNT</Text>
            </View>
            {sale.returns.map((returnRecord, index) => (
              <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={styles.col1}>{returnRecord.returnNumber}</Text>
                <Text style={styles.col2}>
                  {new Date(returnRecord.returnDate).toLocaleDateString()}
                </Text>
                <Text style={styles.col3}>
                  {returnRecord.items
                    .map((item) => `${item.product?.name || "Unknown"} x${item.quantity}`)
                    .join(", ")}
                </Text>
                <Text style={styles.col4}>
                  Rs.{formatPakistaniCurrencyPDF(returnRecord.totalAmount, false)}
                </Text>
              </View>
            ))}
          </View>
        )}


        {Number(sale.discount) > 0 && (
          <>
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={{ fontSize: 9 }}>
              {formatPakistaniCurrencyPDF(
                sale.totalAmount + (sale.discount || 0)
              )}
            </Text>
          </View>
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Discount:</Text>
            <Text style={{ fontSize: 9 }}>-{formatPakistaniCurrencyPDF(sale.discount || 0)}</Text>
          </View>
          </>
        )}

        <View style={styles.total}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={{ fontSize: 9 }}>{formatPakistaniCurrencyPDF(sale.totalAmount)}</Text>
        </View>

        {sale.returns && sale.returns.length > 0 && (
          <View>
            <View style={styles.total}>
              <Text style={styles.totalLabel}>Total Returned:</Text>
              <Text style={{ fontSize: 9 }}>
                {formatPakistaniCurrencyPDF(
                  sale.returns.reduce((sum, ret) => sum + ret.totalAmount, 0)
                )}
              </Text>
            </View>
            {totalRefunded > 0 && (
              <View style={styles.total}>
                <Text style={styles.totalLabel}>Total Refunded:</Text>
                <Text style={{ fontSize: 9 }}>{formatPakistaniCurrencyPDF(totalRefunded)}</Text>
              </View>
            )}
            <View style={styles.total}>
              <Text style={styles.totalLabel}>Net Total After Returns:</Text>
              <Text style={{ fontSize: 9 }}>{formatPakistaniCurrencyPDF(netAmount > 0 ? netAmount : 0)}</Text>
            </View>
            {(() => {
              return balance > 0 ? (
                <View style={styles.total}>
                  <Text style={styles.totalLabel}>Net Balance Due:</Text>
                  <Text style={{ fontSize: 9 }}>{formatPakistaniCurrencyPDF(balance)}</Text>
                </View>
              ) : balance < 0 ? (
                <View style={styles.total}>
                  <Text style={styles.totalLabel}>Credit Balance:</Text>
                  <Text style={{ fontSize: 9 }}>{formatPakistaniCurrencyPDF(Math.abs(balance) <= sale.paidAmount ? Math.abs(balance) : 0)}</Text>
                </View>
              ) : (
                <View style={styles.total}>
                  <Text style={styles.totalLabel}>Status:</Text>
                  <Text style={{ fontSize: 9 }}>Fully Paid</Text>
                </View>
              );
            })()}
          </View>
        )}



        {/* Previous Outstanding Amount */}
        {sale.contact && (sale.contact.remainingAmount || 0) > 0 && (
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Previous Remaining Amount:</Text>
            <Text style={{ fontSize: 9 }}>
              Rs.{formatPakistaniCurrencyPDF(sale.contact.remainingAmount || 0, false)}
            </Text>
          </View>
        )}

        {/* Overall Total */}
        {sale.contact && (sale.contact.remainingAmount || 0) > 0 && (
          <View style={[styles.total, { borderTop: '1px solid #000', paddingTop: 8, marginTop: 8 }]}>
            <Text style={[styles.totalLabel, { fontWeight: 'bold' }]}>Overall Total:</Text>
            <Text style={{ fontWeight: 'bold', fontSize: 9 }}>
              Rs.{formatPakistaniCurrencyPDF((sale.totalAmount || 0) + (sale.contact.remainingAmount || 0), false)}
            </Text>
          </View>
        )}

        </View>
        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 4 }}>
            <View style={{ border: '2px solid #000000', width: '100%', padding: 6, backgroundColor: '#ffffff' }}>
              {urduImage && (
                <Image 
                  src={urduImage} 
                  style={{ width: '100%', height: 80, marginBottom: 2 }}
                />
              )}
              <Text style={[styles.contactInfo, { textAlign: 'center', fontWeight: 'bold' }]}>
                NO RETURN / EXCHANGE AFTER USE
              </Text>
            </View>
          </View>
          <View style={{ borderTop: '1px solid #000000', paddingTop: 3 }}>
            <Text style={{ fontSize: 9, textAlign: 'center', color: '#000000', fontWeight: 'bold' }}>
              NEED SYSTEM LIKE THIS? CONTACT 03145292649
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export default SaleInvoicePDF;