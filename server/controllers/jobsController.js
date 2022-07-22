import Job from "../models/Job.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../errors/index.js";
import checkPermissions from "../utils/checkPermissions.js";
import mongoose from "mongoose";
import moment from "moment";

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
  const { status, jobType, sort, search } = req.query;

  const queryObject = {
    createdBy: req.user.userId,
  };

  if (status !== "all") {
    queryObject.status = status;
  }

  if (jobType !== "all") {
    queryObject.jobType = jobType;
  }

  if (search) {
    queryObject.position = { $regex: search, $options: "i" };
  }

  let result = Job.find(queryObject);

  if (sort === "latest") {
    result = result.sort("-createdAt");
  }
  if (sort === "oldest") {
    result = result.sort("createdAt");
  }
  if (sort === "a-z") {
    result = result.sort("position");
  }
  if (sort === "z-a") {
    result = result.sort("-position");
  }

  /* pagination */
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  result = result.skip(skip).limit(limit);

  const jobs = await result;

  //get total jobs taking in consideration the query, and not the limit
  const totalJobs = await Job.countDocuments(queryObject);

  /*  e.g.
  total jobs = 31
  31/10
  3.1
  round up ... 4 pages
  */
  const numOfPages = Math.ceil(totalJobs / limit);

  res.status(StatusCodes.OK).json({
    totalJobs,
    numOfPages,
    jobs,
  });
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

  //group by year, and by months (because of overlapping months, year by year...)
  //then sort it by most recent jobs
  //then limit to 6 most recent months

  let monthlyApplications = await Job.aggregate([
    { $match: { createdBy: mongoose.Types.ObjectId(req.user.userId) } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": -1, "_id.month": -1 } },
    { $limit: 6 },
  ]);

  // prettify the result, to front-ends needs
  monthlyApplications = monthlyApplications
    .map(item => {
      const {
        _id: { year, month },
        count,
      } = item;
      const date = moment()
        .month(month - 1)
        .year(year)
        .format("MMM Y");
      return { date, count };
    })
    .reverse();

  res.status(StatusCodes.OK).json({ defaultStats, monthlyApplications });
};

export { createJob, getAllJobs, deleteJob, updateJob, showStats };
