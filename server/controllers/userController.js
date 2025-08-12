import mongoose from "mongoose";
import Course from "../models/Course.js";
import CourseProgress from "../models/CourseProgress.js";
import Purchase from "../models/Purchase.js";
import User from "../models/User.js";
import {MercadoPagoConfig, Preference} from "mercadopago";

// Initialize Mercado Pago with a client instance
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});
const preference = new Preference(client);

// Helper function for sending consistent error response
const sendErrorResponse = (res, statusCode, message) => {
  console.error(message);
  res.status(statusCode).json({success: false, message});
};

// --- Get User Data ---
export const getUserData = async (req, res) => {
  try {
    const {userId} = req.auth;
    const user = await User.findById(userId).select("-__v");

    if (!user) {
      return sendErrorResponse(res, 404, "User not found.");
    }

    res.json({success: true, user});
  } catch (error) {
    sendErrorResponse(res, 500, `Failed to fetch user data: ${error.message}`);
  }
};

// --- Users Enrolled Courses ---
export const userEnrolledCourses = async (req, res) => {
  try {
    const {userId} = req.auth;
    const user = await User.findById(userId).populate(
      "enrolledCourses",
      "-__v"
    );

    if (!user) {
      return sendErrorResponse(res, 404, "User not found.");
    }

    res
      .status(200)
      .json({success: true, enrolledCourses: user.enrolledCourses});
  } catch (error) {
    sendErrorResponse(
      res,
      500,
      `Failed to fetch enrolled courses: ${error.message}`
    );
  }
};

// --- Purchase Course ---
export const purchaseCourse = async (req, res) => {
  const {userId} = req.auth;
  const {courseId} = req.body;
  const {origin} = req.headers;

  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    return sendErrorResponse(res, 400, "Invalid course ID.");
  }

  try {
    const user = await User.findById(userId);
    const course = await Course.findById(courseId);

    if (!user || !course) {
      return sendErrorResponse(res, 404, "User or course not found.");
    }

    // Check if the user is already enrolled
    if (user.enrolledCourses.includes(courseId)) {
      return sendErrorResponse(
        res,
        400,
        "User is already enrolled in this course."
      );
    }

    const discountedPrice = (
      course.coursePrice -
      (course.discount * course.coursePrice) / 100
    ).toFixed(2);

    // Create a new purchase document with status "pending"
    const newPurchase = await Purchase.create({
      courseId: course._id,
      userId,
      amount: discountedPrice,
      status: "pending",
    });

    const preferenceBody = {
      items: [
        {
          id: course._id.toString(),
          title: course.courseTitle,
          quantity: 1,
          currency_id: process.env.CURRENCY.toUpperCase(),
          unit_price: Number(discountedPrice),
        },
      ],
      payer: {email: user.email, name: user.name},
      back_urls: {
        success: `${origin}/loading/my-enrollments`,
        failure: `${origin}/`,
        pending: `${origin}/loading/my-enrollments`,
      },
      auto_return: "approved",
      external_reference: newPurchase._id.toString(),
    };

    // Use the new client and preference instance to create the preference
    const mpResponse = await preference.create({body: preferenceBody});

    res.status(200).json({success: true, checkoutUrl: mpResponse.init_point});
  } catch (error) {
    sendErrorResponse(res, 500, `Purchase failed: ${error.message}`);
  }
};

// --- Update User Course Progress ---
export const updateUserCourseProgress = async (req, res) => {
  const {userId} = req.auth;
  const {courseId, lectureId} = req.body;

  if (!courseId || !lectureId || !mongoose.Types.ObjectId.isValid(courseId)) {
    return sendErrorResponse(res, 400, "Invalid course or lecture ID.");
  }

  try {
    const updatedProgress = await CourseProgress.findByIdAndUpdate(
      {userId, courseId},
      {$addToSet: {lectureCompleted: lectureId}},
      {new: true, upsert: true}
    );

    if (updatedProgress.lectureCompleted.includes(lectureId)) {
      res.status(200).json({
        success: true,
        message: "Progress Updated",
        progress: updatedProgress,
      });
    } else {
      res.status(200).json({
        success: true,
        message: "Lecture Already Completed",
        progress: updatedProgress,
      });
    }
  } catch (error) {
    sendErrorResponse(
      res,
      500,
      `Failed to update course progress: ${error.message}`
    );
  }
};

// --- Get User Course Progress ---
export const getUserCourseProgress = async (req, res) => {
  const {userId} = req.auth;
  const {courseId} = req.body;

  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    return sendErrorResponse(res, 400, "Invalid course ID.");
  }

  try {
    const progressData = await CourseProgress.findOne({userId, courseId});
    res.status(200).json({success: true, progressData});
  } catch (error) {
    sendErrorResponse(
      res,
      500,
      `Failed to get course progress: ${error.message}`
    );
  }
};

// --- Add User Ratings to Course ---
export const addUserRating = async (req, res) => {
  const {userId} = req.auth;
  const {courseId, rating} = req.body;

  if (
    !courseId ||
    !rating ||
    !rating < 1 ||
    rating > 5 ||
    !mongoose.Types.ObjectId.isValid(courseId)
  ) {
    return sendErrorResponse(res, 404, "Course not found.");
  }

  try {
    const course = await Course.findById(courseId);

    if (!course) {
      return sendErrorResponse(res, 404, "Course not found.");
    }

    const isEnrolled = await User.exists({
      _id: userId,
      enrolledCourses: courseId,
    });
    if (!isEnrolled) {
      return sendErrorResponse(
        res,
        403,
        "User is not enrolled in this course."
      );
    }

    const existingRating = course.courseRating.find((r) => r.userId === userId);

    if (existingRating) {
      existingRating.rating = rating;
    } else {
      course.courseRating.push({userId, rating});
    }
    await course.save();

    res
      .status(200)
      .json({success: true, message: "Rating added successfully."});
  } catch (error) {
    sendErrorResponse(res, 500, `Failed to add rating: ${error.message}`);
  }
};
