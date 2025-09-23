import mongoose from "mongoose";
import app from "./app.js";
import { initSocketServer } from "./sockets/index.js";

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

// Initialize Socket.io
const io = initSocketServer(server);
app.set('io', io);

process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
});
