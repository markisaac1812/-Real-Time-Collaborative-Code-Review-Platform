import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import jwt from "jsonwebtoken";
import util from "util";

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
export const signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  if (!newUser) {
    return next(new AppError("Failed to create user", 400));
  }
  createSendToken(newUser, 201, res);
});

//login
export const login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;
  //1) check if username and password exists
  if (!username || !password) {
    return next(new AppError("provide username and password", 400));
  }
  //2) check if user exist and password is correct
  const user = await User.findOne({ username }).select("+password");
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("incorrect username or password", 400));
  }
  // update lastLogin only
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });

  createSendToken(user, 200, res);

});

export const refresh = catchAsync(async (req, res, next) => {
  const token = req.cookies.refreshToken;
  if (!token) return next(new AppError("No refresh token", 401));

  const decoded = jwt.verify(token, process.env.JWT_REFRESH_TOKEN);
  const user = await User.findById(decoded.id);
  if (!user) return next(new AppError("User not found", 401));

  const newAccessToken = generateAccessToken(user._id);
  res.json({ accessToken: newAccessToken });
});

export const protect = catchAsync(async (req, res, next) => {
  //1) check if user have token
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(new AppError("you are not logged in to get access", 401));
  }

  //2) verify access token
  let decoded;
  try {
    decoded = await util.promisify(jwt.verify)(token, process.env.JWT_SECRET);
  } catch (err) {
    //if token expired/invalid frontend should call refresh
    return next(new AppError("invalid or expired token.Log in again", 401));
  }

  //3) check if user still exist
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(
      new AppError("User belonging to this token dont exist anymore", 400)
    );
  }

  //3.5) block access if user has logged out (isActive=false)
  if (freshUser.isActive === false) {
    return next(new AppError("Account is deactivated. Contact support.", 403));
  }

  //4) chekc if user xhanged password after token was issued
  if (
    freshUser.changedPasswordAfter &&
    freshUser.changedPasswordAfter(decoded.iat)
  ) {
    //decoded.id
    return next(
      new AppError("user recently changed password! please log in again", 401)
    );
  }

  req.user = freshUser;
  next();
});

export const restrictedTo = (...role) => {
  return (req, res, next) => {
    if (!role.includes(req.user.role)) {
      return next(
        new AppError(
          "Error: You dont have permission to perfom this action",
          403
        )
      );
    }
    next();
  };
};

export const logout = catchAsync(async (req, res, next) => {
 
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.status(200).json({ status: "sucess", message: "Logged out" });
});
