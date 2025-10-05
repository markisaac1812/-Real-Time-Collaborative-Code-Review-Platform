import mongoSanitize from "mongo-sanitize";

export default (req, res, next) => {
  sanitizeObjectInPlace(req.body);
  sanitizeObjectInPlace(req.query);
  sanitizeObjectInPlace(req.params);
  next();
};

function sanitizeObjectInPlace(obj) {
  if (!obj || typeof obj !== "object") return;

  for (let key in obj) {
    obj[key] = mongoSanitize(obj[key]); // mutate directly
  }
}
