import dotenv from "dotenv";
dotenv.config({ path: "./config.env" });
import mongoose from "mongoose";
import app from "./app.js";

process.on("uncaughtException", (err) => {
  console.log("unhandled exception shutting down");
  console.log(err.name, err.message);
  process.exit(1);
});

const DB = process.env.MONGO_DB_CONNECTION_STRING.replace(
  "<db_password>",
  process.env.MONGO_DB_PASSWORD
);

mongoose.connect(DB).then((con) => {
  console.log("db connection succefully");
});

const port = process.env.PORT;
const server = app.listen(port, () => {
  console.log(`app running on port ${port}`);
});

process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
