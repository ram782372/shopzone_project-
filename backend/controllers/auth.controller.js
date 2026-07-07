import express from "express";
import asyncHandler from "../utils/asynchandler.utils.js";
import registerController from "./register.controller.js";
import loginController from "./login.controller.js";
import * as usersController from "./users.controller.js";
// import orderController from "./order.controller.js";


import {
  loginLimiter,
  registerLimiter,
  updateLimiter,
  getAllUsersLimiter,
} from "../config/rate.limiter.config.js";
import upload from "../config/multer.config.js";

const authController = express.Router();

authController.post("/register", registerController);
authController.post("/login", loginController);
authController.put("/update/:id", updateLimiter, upload.single('profilePicture'), usersController.updateUser);
authController.delete("/delete/:id", usersController.deleteUser);
authController.get("/users", getAllUsersLimiter, usersController.getAllUsers);
// authController.get("/orders", orderController.getAllOrders);

export default authController;
