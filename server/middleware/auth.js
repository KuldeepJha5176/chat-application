
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    console.log('Auth header:', req.headers.authorization);
    
    const token = req.headers.authorization;
    if (!token) {
      console.log('No token provided');
      return res.status(403).json({});
    }
    
    try {
      // If you're using "Bearer " prefix, remove it
      const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      console.log('Attempting to verify token');
      
      const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
      console.log('Decoded token:', decoded);
      
      if (decoded.id) {
        req.user = { _id: decoded.id, id: decoded.id };
        next();
      } else {
        console.log('Token missing id field');
        return res.status(401).json({});
      }
    } catch (err) {
      console.log('Token verification failed:', err.message);
      return res.status(403).json({});
    }
  };
module.exports = authMiddleware;