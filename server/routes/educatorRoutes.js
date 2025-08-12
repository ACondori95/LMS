import express from "express";
import {
  addCourse,
  educatorDashboardData,
  getEducatorCourses,
  getEnrolledStudentsData,
  updateRoleToEducator,
} from "../controllers/educatorController.js";
import upload from "../configs/multer.js";
import {protectEducator} from "../middlewares/authMiddleware.js";

const educatorRouter = express.Router();

// Role Management
educatorRouter.get("/update-role", updateRoleToEducator);

// Course Management (Protected Routes)
educatorRouter.post(
  "/add-course",
  protectEducator,
  upload.single("image"),
  addCourse
);

// Data Retrieval (Protected Routes)
educatorRouter.get("/courses", protectEducator, getEducatorCourses);
educatorRouter.get("/dashboard", protectEducator, educatorDashboardData);
educatorRouter.get(
  "/students/enrolled",
  protectEducator,
  getEnrolledStudentsData
);

export default educatorRouter;
