import "express-async-errors";
import express from "express";
import dotenv from "dotenv";

const app = express();
dotenv.config();

//db and authenticate user
import connectDB from "./db/connect.js";

//routers
import authRouter from "./routes/authRoutes.js";
import jobsRouter from "./routes/jobsRoutes.js";

//middleware
import notFoundMiddleware from "./middleware/not-found.js";
import errorHandlerMiddleware from "./middleware/error-handler.js";

//middleware
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome!");
});

//routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/jobs", jobsRouter);

//error handling
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URL);
    console.log("Successfully connected to DB!");
    app.listen(port, () => {
      console.log(`Server is listening on port ${port}`);
    });
  } catch (error) {
    console.log(error);
  }
};

start();
