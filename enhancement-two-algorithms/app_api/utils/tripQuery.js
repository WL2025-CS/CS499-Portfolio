
const SORT_KEYS = {
  start: ['start'],
  price: ['pricePerPerson'],
  name: ['name'],
  resort: ['resort', 'start']
};

function buildTripQuery(params = {}) {
  const { resort, minPrice, maxPrice, startFrom, startTo,
    sortBy = 'start', order = 'asc', page = 1, limit = 10 } = params;

  const filter = {};

  if (resort) filter.resort = resort;

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.pricePerPerson = {};
    if (minPrice !== undefined) filter.pricePerPerson.$gte = minPrice;
    if (maxPrice !== undefined) filter.pricePerPerson.$lte = maxPrice;
  }

  if (startFrom || startTo) {
    filter.start = {};
    if (startFrom) filter.start.$gte = new Date(startFrom);
    if (startTo) filter.start.$lte = new Date(startTo);
  }

  const direction = order === 'desc' ? -1 : 1;
  const sort = {};
  for (const field of SORT_KEYS[sortBy] || SORT_KEYS.start) sort[field] = direction;
  sort._id = direction;

  return { filter, sort, skip: (page - 1) * limit, limit, page };
}

function pageInfo(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasPrev: page > 1, hasNext: page < totalPages };
}

module.exports = { buildTripQuery, pageInfo };