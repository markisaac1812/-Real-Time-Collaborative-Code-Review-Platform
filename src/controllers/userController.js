import User from "../models/userModel.js";
import catchAsycn from "./../utils/catchAsync.js"
import appError from "./../utils/appError.js";


export const getProfileForSignedUser = catchAsycn(async(req,res,next)=>{
    if (!req.user) {
        return next(new AppError("User not found or not logged in", 404));
      }
      const publicProfile = {
        id: req.user._id,
        username: req.user.username,
        profile: req.user.profile,
        skills: req.user.skills,
        reputation: req.user.reputation,
        createdAt: req.user.createdAt,
        role: req.user.role
      };
      
    res.status(200).json({
        status: "success",
        profile: publicProfile
    });
});

export const  getProfile = catchAsycn(async(req,res,next)=>{
    const id = req.params.id;
    const userProfile = await User.findById(id);
    if (!user || !user.isActive) {
        return next(new AppError("User not found", 404));
      }
    
      // Return public profile (no sensitive data)
      const publicProfile = {
        id: user._id,
        username: user.username,
        profile: user.profile,
        skills: user.skills,
        reputation: user.reputation,
        createdAt: user.createdAt,
        role: user.role
      };
    
      res.status(200).json({
        status: "success",
        data: { user: userProfile }
      });
});