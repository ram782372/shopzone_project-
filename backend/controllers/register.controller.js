import asyncHandler from "../utils/asynchandler.utils.js";
import User from "../models/users.model.js";
import bcrypt from "bcryptjs";

const registerController = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: "all fields are required" });
  }
  const user = await User.findOne({ email });
  if (user) {
    return res.status(400).json({ message: "user already exists" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ username, email, password: hashedPassword });
  const savedUser = await newUser.save();
  if (!savedUser) {
    return res.status(400).json({ message: "user not created" });
  }
  return res.status(201).json({ message: "user created", user: savedUser });
});

export default registerController;
