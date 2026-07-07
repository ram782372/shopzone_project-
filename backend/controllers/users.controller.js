import User from "../models/users.model.js";
import bcrypt from "bcryptjs";
import asyncHandler from "../utils/asynchandler.utils.js";
import ApiError from "../utils/api.error.utils.js";
import { uploadOnCloudinary } from "../utils/cloudinary.utils.js";

// GET /api/v1/auth/allusers — returns all registered users
export const getAllUsers = asyncHandler(async (_req, res) => {
  const users = await User.find();
  res.status(200).json(users);
});

// PUT /api/v1/auth/update/:id — updates username, password, and/or profilePicture
// only provided fields are updated (partial update)
export const updateUser = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");

  // handle profile picture upload
  if (req.file) {
    const cloudinaryResult = await uploadOnCloudinary(req.file.path);
    if (!cloudinaryResult) {
      throw new ApiError(500, "Image upload to Cloudinary failed. Check your CLOUD_NAME, CLOUD_API, and CLOUDINARY_API_SECRET in .env");
    }
    user.profilePicture = cloudinaryResult.secure_url;
  }

  // validate and apply username
  if (username !== undefined) {
    if (username.length < 2 || username.length > 30) {
      throw new ApiError(400, "Username must be between 2 and 30 characters");
    }
    // check uniqueness excluding the current user
    const existing = await User.findOne({ username, _id: { $ne: req.params.id } });
    if (existing) throw new ApiError(409, "Username already taken");
    user.username = username;
  }

  // validate and hash password
  if (password !== undefined) {
    if (password.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters");
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
  }

  await user.save();

  res.status(200).json({
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture || '',
      createdAt: user.createdAt,
    },
  });
});

// DELETE /api/v1/auth/delete/:id — permanently removes a user
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");

  await user.deleteOne();
  res.status(200).json({ message: "User deleted successfully" });
});

