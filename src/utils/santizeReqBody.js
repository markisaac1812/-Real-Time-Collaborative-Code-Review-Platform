// middleware/sanitizeBody.js
import xss from 'xss';

export default (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const sanitize = obj => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = xss(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]); // handle nested objects
        }
      }
    };
    sanitize(req.body);
  }
  next();
};


