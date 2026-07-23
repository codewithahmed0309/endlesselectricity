const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
}

function threeDigits(n: number): string {
  if (n < 100) return twoDigits(n);
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + twoDigits(n % 100) : '');
}

export function numberToWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let result = '';

  if (rupees >= 10000000) {
    result += threeDigits(Math.floor(rupees / 10000000)) + ' Crore ';
  }
  if (rupees >= 100000) {
    result += twoDigits(Math.floor((rupees % 10000000) / 100000)) + ' Lakh ';
  }
  if (rupees >= 1000) {
    result += twoDigits(Math.floor((rupees % 100000) / 1000)) + ' Thousand ';
  }
  if (rupees >= 100) {
    result += ones[Math.floor((rupees % 1000) / 100)] + ' Hundred ';
  }
  if (rupees % 100 > 0) {
    result += twoDigits(rupees % 100) + ' ';
  }

  result = result.trim() + ' Rupees';

  if (paise > 0) {
    result += ' and ' + twoDigits(paise) + ' Paise';
  }

  return result + ' Only';
}
