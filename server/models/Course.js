import mongoose from "mongoose";

// Sub-schema for individual lectures
const lectureSchema = new mongoose.Schema(
  {
    lectureId: {type: String, required: true, unique: true},
    lectureTitle: {type: String, required: true, trim: true},
    lectureDuration: {type: Number, required: true, min: 0},
    lectureUrl: {type: String, required: true, trim: true},
    isPreviewFree: {type: Boolean, default: false},
    lectureOrder: {type: Number, required: true, min: 1},
  },
  {_id: false}
);

// Sub-schema for course chapters
const chapterSchema = new mongoose.Schema(
  {
    chapterId: {type: String, required: true, unique: true},
    chapterOrder: {type: Number, required: true, min: 1},
    chapterTitle: {type: String, required: true, trim: true},
    chapterContent: [lectureSchema],
  },
  {_id: false}
);

// Main schema for the Course model
const courseSchema = new mongoose.Schema(
  {
    courseTitle: {type: String, required: true, trim: true},
    courseDescription: {type: String, required: true},
    courseThumbnail: {type: String, required: true},
    coursePrice: {type: Number, required: true, min: 0},
    isPublished: {type: Boolean, default: true},
    discount: {type: Number, required: true, min: 0, max: 100, default: 0},
    courseContent: [chapterSchema],
    courseRating: [
      {
        userId: {type: String, required: true},
        rating: {type: Number, min: 1, max: 5, required: true},
      },
    ],
    educator: {type: String, ref: "User", required: true},
    enrolledStudents: [{type: String, ref: "User"}],
  },
  {timestamps: true, minimize: false}
);

const Course = mongoose.model("Course", courseSchema);

export default Course;
