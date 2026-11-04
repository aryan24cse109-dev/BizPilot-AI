export function getPagination(input = {}) {
  const page = Math.max(1, Number(input.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(input.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function paginationResult(page, limit, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}