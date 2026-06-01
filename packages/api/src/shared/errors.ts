export class ValidationError extends Error {
  status: number;
  code: string;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    this.status = 422;
    this.code = 'VALIDATION_ERROR';
  }
}

export class NotFoundError extends Error {
  status: number;
  code: string;

  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
    this.code = 'NOT_FOUND';
  }
}
