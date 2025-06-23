/**
 * Formats a number in Pakistani currency format (lakhs and crores)
 * @param {number} amount - The amount to format
 * @param {boolean} showCurrency - Whether to show the Rs. prefix
 * @returns {string} Formatted amount
 */
export function formatPakistaniCurrency(amount, showCurrency = true) {
  if (amount === null || amount === undefined) return showCurrency ? 'Rs.0.00' : '0.00';
  
  // Convert BigInt to number for display
  let num;
  if (typeof amount === 'bigint') {
    num = Number(amount);
  } else if (typeof amount === 'string') {
    num = parseFloat(amount);
  } else {
    num = amount;
  }
  
  // Handle invalid input
  if (isNaN(num)) return showCurrency ? 'Rs.0.00' : '0.00';
  
  // For very large amounts, show in crores/lakhs
  if (num >= 10000000) { // 1 crore
    const crores = (num / 10000000).toFixed(2);
    return (showCurrency ? 'Rs.' : '') + crores + ' Cr';
  } else if (num >= 100000) { // 1 lakh
    const lakhs = (num / 100000).toFixed(2);
    return (showCurrency ? 'Rs.' : '') + lakhs + ' L';
  }
  
  // Format with commas for smaller amounts
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