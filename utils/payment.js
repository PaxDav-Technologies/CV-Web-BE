exports.generateReference = () => {
  return Math.random() * 1000000;
};

exports.calculateCommission = (amount) => {
  return amount * 0.015;
};
