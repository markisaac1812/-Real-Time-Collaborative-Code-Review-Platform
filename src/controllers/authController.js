import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import jwt from "jsonwebtoken";

//1) generate access and refresh tokens
const generateAccessToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    });
  };
  
  const generateRefresshToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_REFRESH_TOKEN, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    });
  };

//2) send tokens helper
const createSendToken = (user, statusCode, res) => {
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefresshToken(user._id);
    //store refresh token in cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // set to true if === prod
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7days
      
    });
    res.status(statusCode).json({
      status: "sucess",
      accessToken,
      data: { user },
    });
  };
  
//signp
export const signup = catchAsync(async(req,res,next) =>{
  const newUser = await User.create(req.body);
  if(!newUser){
    return next(new AppError("Failed to create user", 400));
  }
  createSendToken(newUser, 201, res);
});