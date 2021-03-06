const router = express.Router();
import express from "express";
import {
  createJob,
  getAllJobs,
  deleteJob,
  updateJob,
  showStats,
} from "../controllers/jobsController.js";

/********* User is authenticated prior to every route. 'middleware/auth' *********/
router.route("/").post(createJob).get(getAllJobs);
router.route("/stats").get(showStats);
router.route("/:id").delete(deleteJob).patch(updateJob);

export default router;
