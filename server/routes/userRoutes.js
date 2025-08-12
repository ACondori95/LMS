import express from "express";
import {
  addUserRating,
  getUserCourseProgress,
  getUserData,
  purchaseCourse,
  updateUserCourseProgress,
  userEnrolledCourses,
} from "../controllers/userController.js";

const userRouter = express.Router();

// User Profile and Enrolled Courses
userRouter.get("/data", getUserData);
userRouter.get("/enrolled-courses", userEnrolledCourses);

// Course Purchase
userRouter.post("/purchase", purchaseCourse);

// Course Progress
userRouter.post("/course-progress", updateUserCourseProgress);
userRouter.get("/course-progress", getUserCourseProgress);

// Ratings
userRouter.post("/rating", addUserRating);

export default userRouter;
