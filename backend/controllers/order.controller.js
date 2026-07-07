import express from "express";
import Order from "../models/orders.model.js";
import asyncHandler from "../utils/asynchandler.utils.js";
import ApiError from "../utils/api.error.utils.js";
import verifyToken from "../middlewares/verifytoken.middleware.js";
import { createOrderLimiter, getOrdersLimiter } from "../config/rate.limiter.config.js";

const orderController = express.Router();

// POST /api/orders — create order, requires auth token
const createOrder = asyncHandler(async (req, res) => {
  const { orderItems, totalAmount } = req.body;
  if (!orderItems || orderItems.length === 0) {
    throw new ApiError(400, "No order items provided");
  }
  const order = await Order.create({ user: req.user.id, orderItems, totalAmount });
  res.status(201).json({ order });
});

// GET /api/orders — all orders (admin)
const getAllOrders = asyncHandler(async (_req, res) => {
  const orders = await Order.find().populate("user", "username email");
  res.status(200).json({ orders });
});

// GET /api/orders/myorders — logged-in user's orders
const getUserOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user.id });
  res.status(200).json({ orders });
});

// GET /api/orders/:id
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "username email");
  if (!order) throw new ApiError(404, "Order not found");
  res.status(200).json({ order });
});

// PUT /api/orders/:id/status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");
  order.status = req.body.status;
  await order.save();
  res.status(200).json({ order });
});

// DELETE /api/orders/:id
const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");
  await order.deleteOne();
  res.status(200).json({ message: "Order deleted successfully" });
});

orderController.post("/", createOrderLimiter, verifyToken, createOrder);
orderController.get("/", getOrdersLimiter, verifyToken, getAllOrders);
orderController.get("/myorders", verifyToken, getUserOrders);
orderController.get("/:id", verifyToken, getOrderById);
orderController.put("/:id/status", verifyToken, updateOrderStatus);
orderController.delete("/:id", verifyToken, deleteOrder);

export default orderController;
