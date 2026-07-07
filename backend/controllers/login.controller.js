import asyncHandler from "../utils/asynchandler.utils.js";
import User from "../models/users.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const loginController = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "all fields are required" });
  }
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "user not found" });
  }
  const isMatched = await bcrypt.compare(password, user.password);
  if (!isMatched) {
    return res.status(400).json({ message: "invalid password" });
  }
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
  if (!token) {
    return res.status(500).json({ message: "error generating token" });
  }
  res.cookie("token", token, {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,
  });
  return res.status(200).json({ message: "login successfull", token, user: { id: user._id, username: user.username, email: user.email, profilePicture: user.profilePicture || '', createdAt: user.createdAt } });
});

export default loginController;
