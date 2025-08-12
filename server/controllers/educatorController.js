import {clerkClient} from "@clerk/express";
import Course from "../models/Course.js";
import {v2 as cloudinary} from "cloudinary";
import Purchase from "../models/Purchase.js";

// Helper function for consistent error responses
const sendErrorResponse = (res, statusCode, message) => {
  console.error(message);
  res.status(statusCode).json({success: false, message});
};

// --- Update role to educator ---
export const updateRoleToEducator = async (req, res) => {
  try {
    const {userId} = req.auth;
    if (!userId) {
      return sendErrorResponse(res, 401, "User not authenticated.");
    }

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {role: "educator"},
    });

    res.status(200).json({success: true, message: "Role updated to educator."});
  } catch (error) {
    sendErrorResponse(res, 500, `Failed to update role: ${error.message}`);
  }
};

// --- Add New Course ---
export const addCourse = async (req, res) => {
  try {
    const {courseData} = req.body;
    const imageFile = req.file;
    const {userId} = req.auth;

    if (!imageFile) {
      return sendErrorResponse(res, 400, "Thumbnail not attached.");
    }

    // Upload the image to Cloudinary first
    const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
      folder: "course-thumbnail",
    });

    // Parse the courseData string
    const parsedCourseData = JSON.parse(courseData);

    // Add the educator ID and course thumbnail URL
    const newCourse = await Course.create({
      ...parsedCourseData,
      educator: userId,
      courseThumbnail: imageUpload.secure_url,
    });

    res.status(201).json({
      success: true,
      message: "Course added successfully.",
      course: newCourse,
    });
  } catch (error) {
    sendErrorResponse(res, 500, `Failed to add course: ${error.message}`);
  }
};

// --- Get Educator Courses ---
export const getEducatorCourses = async (req, res) => {
  try {
    const {userId} = req.auth;
    const courses = await Course.find({educator: userId}).select("-__v");
    res.status(200).json({success: true, courses});
  } catch (error) {
    sendErrorResponse(
      res,
      500,
      `Failed to fetch educator courses: ${error.message}`
    );
  }
};

// --- Get Educator Dashboard Data ---
export const educatorDashboardData = async (req, res) => {
  try {
    const {userId} = req.auth;

    // Fetch all courses by the educator
    const courses = await Course.find({educator: userId}).select(
      "_id courseTitle courseRating"
    );
    const totalCourses = courses.length;
    const courseIds = courses.map((course) => course._id);

    // Use aggregation to get total earnings and enrolled students
    const purchases = await Purchase.aggregate([
      {$match: {courseId: {$in: courseIds}, status: "completed"}},
      {
        $group: {
          _id: null,
          totalEarnings: {$sum: "$amount"},
          totalStudents: {$sum: 1},
        },
      },
    ]);

    const totalEarnings = purchases.length > 0 ? purchases[0].totalEarnings : 0;
    const totalStudents = purchases.length > 0 ? purchases[0].totalStudents : 0;

    res.status(200).json({
      success: true,
      dashboardData: {totalEarnings, totalStudents, totalCourses, courses},
    });
  } catch (error) {
    sendErrorResponse(
      res,
      500,
      `Failed to fetch dashboard data: ${error.message}`
    );
  }
};

// --- Get Enrolled Students Data ---
export const getEnrolledStudentsData = async (req, res) => {
  try {
    const {userId} = req.auth;

    // Find all courses by the educator
    const courses = await Course.find({educator: userId});
    const courseIds = courses.map((course) => course._id);

    // Find all purchases for these courses and populate user and course data
    const enrolledStudents = await Purchase.find({
      courseId: {$in: courseIds},
      status: "completed",
    })
      .populate("userId", "firstName lastName imageUrl")
      .populate("courseId", "courseTitle");

    // Reformat the data for a cleaner response
    const formattedStudents = enrolledStudents.map((purchase) => ({
      studentName: `${purchase.userId.firstName} ${purchase.userId.lastName}`,
      studentImageUrl: purchase.userId.imageUrl,
      courseTitle: purchase.courseId.courseTitle,
      purchaseDate: purchase.createdAt,
    }));

    res.status(200).json({success: true, enrolledStudents: formattedStudents});
  } catch (error) {
    sendErrorResponse(
      res,
      500,
      `Failed to fetch enrolled students: ${error.message}`
    );
  }
};
