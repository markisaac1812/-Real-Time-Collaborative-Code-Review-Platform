import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import jwt from "jsonwebtoken";
import util from "util";
import crypto from "crypto";

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
    status: "success",
    accessToken,
    data: { user },
  });
};

//signp
export const signup = catchAsync(async (req, res, next) => {
    const {
        username,
        email,
        password,
        confirmPassword,
        profile,
        skills
      } = req.body;
      const newUser = await User.create({
        username,
        email,
        password,
        confirmPassword,
        profile,
        skills
      });
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
  // 3) Check if user account is active
  if (!user.isActive) {
    return next(new AppError("Your account has been deactivated. Please contact support.", 403));
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

  // Check if user is active
  if (!user.isActive) {
    return next(new AppError("Account is deactivated", 403));
  }

  // Check if user changed password after token was issued
  if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
    return next(new AppError("User recently changed password. Please log in again.", 401));
  }

  const newAccessToken = generateAccessToken(user._id);
  res.status(200).json({
    status: "success",
    accessToken: newAccessToken
  });
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

export const deactivateAccount = catchAsync(async (req, res, next) => {
    // Update user's isActive status to false
    await User.findByIdAndUpdate(req.user.id, { isActive: false });
  
    // Clear refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
  
    res.status(200).json({
      status: "success",
      message: "Account has been deactivated"
    });
  });

// // CHANGE PASSWORD (Bonus - useful for Day 2)
// export const changePassword = catchAsync(async (req, res, next) => {
//     // 1) Get user from collection
//     const user = await User.findById(req.user.id).select('+password');
//     // 2) Check if current password is correct
//     if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
//       return next(new AppError('Your current password is incorrect.', 401));
//     }
  
//     // 3) Update password
//     user.password = req.body.password;
//     user.confirmPassword = req.body.confirmPassword;
//     await user.save();
  
//     // 4) Log user in with new password (send JWT)
//     createSendToken(user, 200, res);
//   });  

  export const forgotPassword = catchAsync(async (req, res, next) => {
    const { email } = req.body;
    
    if (!email) {
      return next(new AppError("Please provide your email address", 400));
    }
  
    const user = await User.findOne({ email:email });
    if (!user) {
      return next(new AppError("No user found with that email address", 404));
    }
  
    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
  
    // In production, you'd send this via email
    // For now, just return it (remove this in production!)
    res.status(200).json({
      status: "success",
      message: "Password reset token generated",
      resetToken: resetToken // Remove this in production!
    });
  });
  
  export const resetPassword = catchAsync(async (req, res, next) => {
    // Get user based on token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');
  
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });
  
    if (!user) {
      return next(new AppError("Token is invalid or has expired", 400));
    }

    // Set new password
    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
  
    res.status(200).json({
      status: "success",
      message: "Password has been reset successfully"
    });
  });
