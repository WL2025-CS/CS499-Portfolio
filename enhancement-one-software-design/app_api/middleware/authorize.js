module.exports = function authorize(...allowedRoles) {
  return function (req, res, next) {
    if (!req.auth) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    return next();
  };
};