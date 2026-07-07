import jwt from "jsonwebtoken";
import dotenv from "dotenv";
// import asyncHandler from "../utils/asyncHandler.js";
//todo convert into async remote try catch
dotenv.config();
const verificationToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "access denied because no token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.log(err);
  }
};

export default verificationToken;
