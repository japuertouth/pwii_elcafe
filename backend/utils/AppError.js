class AppError extends Error {
  constructor(message, statusCode = 500, errores = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errores = errores;
  }
}

module.exports = AppError;
