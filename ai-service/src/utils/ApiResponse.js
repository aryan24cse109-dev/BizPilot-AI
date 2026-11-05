
export class ApiResponse {
  constructor({
    statusCode = 200,
    message = 'Success',
    data = null,
    meta = null
  } = {}) {
    this.success = true;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }

  toJSON() {
    return {
      success: this.success,
      message: this.message,
      data: this.data,
      meta: this.meta
    };
  }

  static success(data, message = 'Success', statusCode = 200) {
    return new ApiResponse({
      statusCode,
      message,
      data
    });
  }

  static created(data, message = 'Resource created successfully') {
    return new ApiResponse({
      statusCode: 201,
      message,
      data
    });
  }

  static paginated(
    data,
    {
      page,
      limit,
      total
    },
    message = 'Data retrieved successfully'
  ) {
    const totalPages = Math.ceil(total / limit);

    return new ApiResponse({
      statusCode: 200,
      message,
      data,
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    });
  }
}
