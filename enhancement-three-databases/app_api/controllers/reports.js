const Booking = require('../models/bookings');
const Trip = require('../models/travel');

const TOP_TRIPS = 10;
const isConfirmed = { $eq: ['$status', 'confirmed'] };

const bookingTotals = {
  bookings: { $sum: { $cond: [isConfirmed, 1, 0] } },
  cancellations: { $sum: { $cond: [isConfirmed, 0, 1] } },
  travelers: { $sum: { $cond: [isConfirmed, '$travelers', 0] } },
  revenueCents: { $sum: { $cond: [isConfirmed, '$totalCents', 0] } }
};

const presentTotals = {
  bookings: 1,
  cancellations: 1,
  travelers: 1,
  revenue: { $divide: ['$revenueCents', 100] },
  averageBookingValue: {
    $cond: [
      { $gt: ['$bookings', 0] },
      { $round: [{ $divide: ['$revenueCents', { $multiply: ['$bookings', 100] }] }, 2] },
      0
    ]
  },
  cancellationRate: {
    $cond: [
      { $gt: [{ $add: ['$bookings', '$cancellations'] }, 0] },
      { $round: [{ $divide: ['$cancellations', { $add: ['$bookings', '$cancellations'] }] }, 3] },
      0
    ]
  }
};

function buildRevenuePipeline({ from, to } = {}, tripsCollection = 'trips') {
  const match = { status: { $in: ['confirmed', 'cancelled'] } };
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lt = new Date(to);
  }

  return [
    { $match: match },
    {
      $facet: {
        totals: [
          { $group: { _id: null, ...bookingTotals } },
          { $project: { _id: 0, ...presentTotals } }
        ],
        byResort: [
          { $group: { _id: '$resort', ...bookingTotals, tripCodes: { $addToSet: '$tripCode' } } },
          { $project: { _id: 0, resort: '$_id', tripCount: { $size: '$tripCodes' }, ...presentTotals } },
          { $sort: { revenue: -1, resort: 1 } }
        ],
        topTrips: [
          { $group: { _id: '$trip', tripCode: { $first: '$tripCode' }, resort: { $first: '$resort' }, ...bookingTotals } },
          { $sort: { revenueCents: -1, tripCode: 1 } },
          { $limit: TOP_TRIPS },
          { $lookup: { from: tripsCollection, localField: '_id', foreignField: '_id', as: 'tripDoc' } },
          { $unwind: { path: '$tripDoc', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0, tripCode: 1, resort: 1,
              tripName: { $ifNull: ['$tripDoc.name', '$tripCode'] },
              ...presentTotals
            }
          }
        ]
      }
    }
  ];
}

const emptyTotals = {
  bookings: 0, cancellations: 0, travelers: 0, revenue: 0, averageBookingValue: 0, cancellationRate: 0
};

const revenueReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const pipeline = buildRevenuePipeline({ from, to }, Trip.collection.name);
    const [result] = await Booking.aggregate(pipeline);

    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      range: { from: from ? new Date(from).toISOString() : null, to: to ? new Date(to).toISOString() : null },
      totals: (result && result.totals[0]) || emptyTotals,
      byResort: (result && result.byResort) || [],
      topTrips: (result && result.topTrips) || []
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { revenueReport, buildRevenuePipeline };