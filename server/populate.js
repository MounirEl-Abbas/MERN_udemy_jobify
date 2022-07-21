import { readFile } from "fs/promises";

import dotenv from "dotenv";
dotenv.config();

import connectDB from "./db/connect.js";
import Job from "./models/Job.js";

const start = async () => {
  await connectDB(process.env.MONGO_URL);
  await Job.deleteMany();
  const mockData = JSON.parse(
    await readFile(new URL("./mock-data.json", import.meta.url))
  );
  await Job.create(mockData);
  console.log("success");
  process.exit(0);
  try {
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

start();
