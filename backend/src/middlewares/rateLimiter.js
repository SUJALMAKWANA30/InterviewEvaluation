import rateLimit from "express-rate-limit";

/*
  Basic global rate limiter
  - Protects against brute force
  - Prevents API abuse
*/

const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

export default rateLimiter;
