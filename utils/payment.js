exports.generateReference = () => {
  return Math.floor(Math.random() * 1000000 + Date.now());
};

exports.calculateCommission = (amount) => {
  return amount * 0.015;
};
