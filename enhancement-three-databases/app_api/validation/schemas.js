const Joi = require('joi');

const tripSchema = Joi.object({
  code: Joi.string().trim().pattern(/^[A-Za-z0-9_-]{3,20}$/).required()
    .messages({ 'string.pattern.base': '"code" must be 3-20 letters, digits, hyphens, or underscores' }),
  name: Joi.string().trim().max(100).required(),
  length: Joi.string().trim().max(50).required(),
  start: Joi.date().iso().required(),
  resort: Joi.string().trim().max(100).required(),
  perPerson: Joi.string().trim().pattern(/^\d{1,7}(\.\d{1,2})?$/).required()
    .messages({ 'string.pattern.base': '"perPerson" must be a number such as 1899 or 1899.00' }),
  image: Joi.string().trim().max(100).pattern(/^[A-Za-z0-9_-]+\.(jpe?g|png|gif|webp)$/i).required()
    .messages({ 'string.pattern.base': '"image" must be a plain filename ending in .jpg, .png, .gif, or .webp' }),
  description: Joi.string().trim().max(2000).required()
}).required();

const registerSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  email: Joi.string().trim().max(254).email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).max(128).required()
}).required();

const loginSchema = Joi.object({
  email: Joi.string().trim().max(254).required(),
  password: Joi.string().max(128).required()
}).required();

const bookingSchema = Joi.object({
  tripCode: Joi.string().trim().pattern(/^[A-Za-z0-9_-]{3,20}$/).required(),
  travelers: Joi.number().integer().min(1).max(10).required()
}).required();

const reportQuerySchema = Joi.object({
  from: Joi.date().iso(),
  to: Joi.date().iso().when('from', { is: Joi.exist(), then: Joi.date().greater(Joi.ref('from')) })
});

module.exports = { tripSchema, registerSchema, loginSchema, bookingSchema, reportQuerySchema };