import Job from "../models/Job.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../errors/index.js";
import checkPermissions from "../utils/checkPermissions.js";
import mongoose from "mongoose";

const createJob = async (req, res) => {
  const { position, company } = req.body;
  if (!position || !company)
    throw new BadRequestError("Please provide all values");

  //Tie the job being created with the user creating it
  req.body.createdBy = req.user.userId;

  const job = await Job.create(req.body);
  res.status(StatusCodes.CREATED).json({ job });
};
const getAllJobs = async (req, res) => {
  const jobs = await Job.find({ createdBy: req.user.userId });
  res
    .status(StatusCodes.OK)
    .json({ totalJobs: jobs.length, numOfPages: 1, jobs });
};

const updateJob = async (req, res) => {
  const { id: jobId } = req.params;
  const { company, position } = req.body;
  if (!position || !company)
    throw new BadRequestError("Please provide all values");

  const job = await Job.findOne({ _id: jobId });
  if (!job) throw new NotFoundError(`No job with id: ${jobId}`);

  checkPermissions(req.user, job.createdBy);

  //validators run on what is passed in req.body
  const updatedJob = await Job.findOneAndUpdate({ _id: jobId }, req.body, {
    new: true,
    runValidators: true,
  });
  res.status(StatusCodes.OK).json({ updatedJob });
};

const deleteJob = async (req, res) => {
  const { id: jobId } = req.params;

  const job = await Job.findOne({ _id: jobId });
  if (!job) throw new NotFoundError(`No job with id: ${jobId}`);

  checkPermissions(req.user, job.createdBy);

  await job.remove();

  res.status(StatusCodes.OK).json({ msg: "Success! Job Removed" });
};

const showStats = async (req, res) => {
  /* AGGREGATION --- https://mongoosejs.com/docs/api/aggregate.html */

  //aggregation is a series of steps to effectively engineer your data
  //$match step: out of all the jobs in DB, match the jobs created by : id given
  //Now that we have all the jobs created by the user that is logged in...
  //we wanna group them by status, for the sake of the "stats" page

  //$group step : group them by status
  //the _id is mongoose syntax
  //the count :{sum:1} is also syntax to count the number of times the status is present
  //result:
  /* {
    "stats": [
        {
            "_id": "declined",
            "count": 31
        },
        {
            "_id": "interview",
            "count": 15
        },
        {
            "_id": "pending",
            "count": 29
        }
    ]
}
   */

  let stats = await Job.aggregate([
    { $match: { createdBy: mongoose.Types.ObjectId(req.user.userId) } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  // turn result into an object, easy to manipulate in front-end
  stats = stats.reduce((acc, curr) => {
    const { _id: title, count } = curr;
    acc[title] = count;
    return acc;
  }, {});

  /* {
    "stats": {
        "declined": 31,
        "interview": 15,
        "pending": 29
    }
} */

  const defaultStats = {
    pending: stats.pending || 0,
    interview: stats.interview || 0,
    declined: stats.declined || 0,
  };

  let monthlyApplications = [];

  res.status(StatusCodes.OK).json({ defaultStats, monthlyApplications });
};

export { createJob, getAllJobs, deleteJob, updateJob, showStats };
