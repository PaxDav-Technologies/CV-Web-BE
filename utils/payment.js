const crypto = require('crypto');

exports.generateReference = () => {
  return `REF-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
};

exports.calculateCommission = (amount) => {
  return parseFloat((amount * 0.025).toFixed(2));
};

exports.validatePaymentPurpose = (purpose, property) => {
  const validPurposes = ['inspection_fee', 'rent', 'sale', 'shortlet'];

  if (!validPurposes.includes(purpose)) {
    return { valid: false, message: 'Invalid payment purpose' };
  }

  if (
    purpose === 'inspection_fee' &&
    (!property.inspection_fee || property.inspection_fee <= 0)
  ) {
    return {
      valid: false,
      message: 'Inspection fee not set for this property',
    };
  }

  if (
    (purpose === 'rent' || purpose === 'sale') &&
    (!property.total_price || property.total_price <= 0)
  ) {
    return { valid: false, message: 'Total price not set for this property' };
  }

  return { valid: true };
};
