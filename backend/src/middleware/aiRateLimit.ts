import rateLimit from "express-rate-limit";

export const aiRouteRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many AI requests. Please retry shortly." },
});
