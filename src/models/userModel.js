import mongoose from "mongoose";
import bcrypt from "bcrypt";
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
      firstName: String,
      lastName: String,
      avatar: String,
      bio: String,
      githubUsername: String,
      linkedinProfile: String,
    },
    skills: [String], // ['JavaScript', 'Python', 'React']
    reputation: {
      points: {
        type: Number,
        default: 0,
      },
      level: {
        type: String,
        default: "Beginner", // beginner intermedite
      },
      reviewsGiven: {
        type: Number,
        default: 0,
      },
      reviewsReceived: {
        type: Number,
        default: 0,
      },
      helpfulVotes: {
        type: Number,
        default: 0,
      },
    },
    prefrences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      languages: [String], // Preferred languages for reviews
      availableForReview: {
        type: Boolean,
        default: true,
      },
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
    }
  },
  { versionKey: false }
);

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

userSchema.methods.changedPasswordAfter = function(JWTTimeStamp){
    if(this.passwordChangedAt){
        const changedTimeStamp = parseInt(this.passwordChangedAt.getTime()/1000,10);
        return JWTTimeStamp< changedTimeStamp;
    }
    return false;
}

const User = mongoose.model("User", userSchema);
export default User;
