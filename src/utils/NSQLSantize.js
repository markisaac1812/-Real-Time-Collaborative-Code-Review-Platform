import mongoSanitize from "mongo-sanitize";

export default (req, res, next) => {
  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);
  next();
};

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = {};
  for (let key in obj) {
    sanitized[key] = mongoSanitize(obj[key]);
  }
  return sanitized;
}