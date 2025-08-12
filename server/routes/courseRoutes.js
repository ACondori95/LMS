import express from "express";
import {getAllCourse, getCourseId} from "../controllers/courseController.js";

const courseRouter = express.Router();

// Get all courses
courseRouter.get("/", getAllCourse);

// Get a single course by ID
courseRouter.get("/:id", getCourseId);

export default courseRouter;
