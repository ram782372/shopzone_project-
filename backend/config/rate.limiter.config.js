import rateLimit from "express-rate-limit";

const message = (action) => ({
  success: false,
  message: `Too many ${action} attempts. Please try again later.`,
});

const limiterDefaults = {
  standardHeaders: true,
  legacyHeaders: false,
}

export const loginLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: message("login"),
});

export const registerLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: message("registration"),
});

export const updateLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: message("update"),
});

export const createOrderLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: message("order creation"),
});

export const getAllUsersLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: message("user listing"),
});

export const getOrdersLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: message("order listing"),
});
