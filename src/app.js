import express from "express";
import morgan from "morgan";
import globalError from "./middlewares/globalHandler.js";
import AppError from "./utils/appError.js";

const app = express();

app.use(express.json({
    limit: "10kb"
}));

if(process.env.NODE_ENV === "development"){
    app.use(morgan("dev"));
}

app.use("/{*any}",(req,res,next) =>{
    next(new AppError(`couldnt find ${req.originalUrl} in our server`));
});

app.use(globalError);

export default app;


