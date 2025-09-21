import dotenv from "dotenv";
dotenv.config({ path: "./config.env" });
import express from "express";
import morgan from "morgan";
import globalError from "./middlewares/globalHandler.js";
import AppError from "./utils/appError.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
import codeSubmissionRoute from "./routes/codeSubmissionRoute.js";
import reviewRoute from "./routes/reviewRoute.js";
import cors from "cors";
import helmet from "helmet";
import rateLimiter from "express-rate-limit";

const app = express();

app.use(helmet());

app.use(
  express.json({
    limit: "10kb",
  })
);

app.use(cookieParser());


if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// for limiting no of req
const limiter = rateLimiter({
  max: 50, // limit 50 requests to windowMs
  windowMs: 60 * 60 * 1000, // around 15 mins
  message: "too many requests with this ip , try again in an hour",
});
app.use(limiter);
app.use(cors());

app.use("/api/auth", authRoutes);
app.use("/api/users",userRoute);
app.use("/api/submissions",codeSubmissionRoute);
app.use("/api/reviews",reviewRoute);

//API Documentation endpoint
app.get("/api", (req, res) => {
    res.status(200).json({
        status: "success",
        message: "CodeReview Platform API",
        version: "1.0.0",
        endpoints: {
            auth: "/api/auth",
            users: "/api/users", 
            submissions: "/api/submissions",
            reviews: "/api/reviews"
        },
        features: {
          authentication: "JWT with refresh tokens",
          userManagement: "Profile, reputation, skills",
          submissions: "Code submission with analytics",
          reviews: "Line-by-line code reviews", // NEW
          search: "Advanced search and filtering",
          analytics: "Platform and user statistics"
      },
        documentation: "Visit /api/docs for detailed API documentation"
    });
});


app.use("/{*any}", (req, res, next) => {
  next(new AppError(`couldnt find ${req.originalUrl} in our server`));
});

app.use(globalError);

export default app;
