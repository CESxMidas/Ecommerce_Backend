export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function throwIfInvalid(errors, statusCode = 400) {
  if (errors.length > 0) {
    throw new ApiError(statusCode, errors[0]);
  }
}
