import express from "express";
import morgan from "morgan";
import globalError from "./middlewares/globalHandler.js";
import AppError from "./utils/appError.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoute.js";
import cors from "cors";
import helmet from "helmet";
import rateLimiter from "express-rate-limit";

const app = express();

app.use(helmet());

app.use(express.json({
    limit: "10kb"
}));

app.use(cookieParser());

if(process.env.NODE_ENV === "development"){
    app.use(morgan("dev"));
}

// for limiting no of req
const limiter = rateLimiter({
    max: 50,   // limit 50 requests to windowMs 
    windowMs: 60 * 60 * 1000,  // around 15 mins
    message: 'too many requests with this ip , try again in an hour'
  });
app.use(limiter);
app.use(cors());

app.use("/api/auth", authRoutes);

app.use("/{*any}",(req,res,next) =>{
    next(new AppError(`couldnt find ${req.originalUrl} in our server`));
});

app.use(globalError);

export default app;


