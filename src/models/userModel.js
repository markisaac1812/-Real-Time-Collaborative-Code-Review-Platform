import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";
import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: [true, "this username is taken. Choose new one"],
      required: [true, "username is required"],
      minlength: [4, "username is at least 4 char"],
      maxlength: [40, "username must not exceed 40 char"],
      trim: true,
    },
    email: {
      type: String,
      unique: [true, "this email is taken. Choose new one"],
      required: [true, "email is required"],
      trim: true,
      lowercase: true,
      validate: {
        validator: function (email) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: "invalid email address",
      },
    },
    password: {
      type: String,
      required: [true, "password is required"],
      minlength: [8, "password is too short. 8 char is at least"],
      select: false, // prevents accidentally leaking hashed passwords:
      validate: {
        validator: function (password) {
          // Only validate on creation, not updates
          if (this.isNew) {
            return /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/.test(
              password
            );
          }
          return true;
        },
        message:
          "Password must contain uppercase, lowercase, number, and special character",
      },
    },
    confirmPassword: {
      type: String,
      required: [true, "Confirm Password is required"],
      validate: {
        validator: function (pass) {
          return pass === this.password;
        },
        message: "passwords are not the same",
      },
    },
    profile: {
      firstName: {
        type: String,
        trim: true,
        maxlength: [50, "First name cannot exceed 50 characters"],
      },
      lastName: {
        type: String,
        trim: true,
        maxlength: [50, "Last name cannot exceed 50 characters"],
      },
      avatar: {
        type: String,
        default: null,
      },
      bio: {
        type: String,
        maxlength: [500, "Bio cannot exceed 500 characters"],
        trim: true,
      },
      githubUsername: {
        type: String,
        maxlength: [50, "GitHub username cannot exceed 50 characters"],
        trim: true,
      },
      linkedinProfile: {
        type: String,
        validate: {
          validator: function (url) {
            if (!url) return true; // Optional field
            return /^https?:\/\/.+/.test(url);
          },
          message: "Please provide a valid LinkedIn URL",
        },
      },
    },
    skills: [String], // ['JavaScript', 'Python', 'React']
    reputation: {
      points: {
        type: Number,
        default: 0,
        min: 0,
      },
      level: {
        type: String,
        default: "Beginner", // beginner intermedite
        enum: ["Beginner", "Intermediate", "Expert", "Master"],
      },
      reviewsGiven: {
        type: Number,
        default: 0,
      },
      reviewsReceived: {
        type: Number,
        default: 0,
        min: 0,
      },
      helpfulVotes: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    preferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      languages: [String], // Preferred languages for reviews
      availableForReview: {
        type: Boolean,
        default: true,
      },
      notificationTypes: {
        type: Map,
        of: Boolean,
        default: {
          review_request: true,
          review_completed: true,
          comment_added: true,
          submission_updated: true,
          mention: true,
          follow: true,
          helpful_vote: true
        }
      }
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: ["user", "moderator", "admin"],
      default: "user",
    },
    followers: [{
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }],
    following: [{
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
    },
    updatedAt: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  { versionKey: false }
);

// Indexes for better performance
userSchema.index({ createdAt: -1 });
userSchema.index({ "reputation.points": -1 });
userSchema.index({ skills: 1 });

// password will be hashed in response,confirm password will not be shown in response
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.confirmPassword = undefined;
  next();
});

// if user modifed(changed) his password => set time for password changed at
userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000; // ensure token timestamp is < this
  next();
});

userSchema.methods.correctPassword = async function (
  passwordInTheRequest,
  passwordInDB
) {
  return await bcrypt.compare(passwordInTheRequest, passwordInDB);
};

userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimeStamp < changedTimeStamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

// Add useful instance methods
userSchema.methods.updateReputation = function (points) {
  this.reputation.points += points;

  // Update level based on points
  if (this.reputation.points >= 1000) this.reputation.level = "Master";
  else if (this.reputation.points >= 500) this.reputation.level = "Expert";
  else if (this.reputation.points >= 100)
    this.reputation.level = "Intermediate";
  else this.reputation.level = "Beginner";

  return this.save();
};

userSchema.methods.getPublicProfile = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.passwordChangedAt;
  return userObject;
};

userSchema.statics.findActiveUsers = function () {
  return this.find({ isActive: true });
};

userSchema.statics.getLeaderboard = function (limit = 10) {
  return this.find({ isActive: true })
    .sort({ "reputation.points": -1 })
    .limit(limit)
    .select("username profile reputation");
};

const User = mongoose.model("User", userSchema);
export default User;

// test foregt and reset passwords functions
