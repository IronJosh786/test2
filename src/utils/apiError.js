class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        stack = "",
        errors = []
    ) {
        super(message);
        (this.message = message), (this.statusCode = statusCode);
        this.errors = errors;
        this.data = null;
        this.success = false;
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

const errorHandler = (statusCode, message) => {
    const error = new Error();
    error.statusCode = statusCode;
    error.message = message;
    return error;
};

export { ApiError, errorHandler };
