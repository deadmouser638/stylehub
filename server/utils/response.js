// Helper for consistent API responses
exports.successResponse = (res, statusCode, data, message = 'Success') => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

exports.errorResponse = (res, statusCode, message = 'Error', errors = null) => {
  const response = {
    success: false,
    message,
  };
  if (errors) {
    response.errors = errors;
  }
  return res.status(statusCode).json(response);
};
