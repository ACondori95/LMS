import mongoose from "mongoose";

const courseProgressSchema = new mongoose.Schema(
  {
    userId: {type: String, ref: "User", required: true},
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    completed: {type: Boolean, default: false},
    lectureCompleted: [{type: String}],
  },
  {timestamps: true}
);

const CourseProgress = mongoose.model("CourseProgress", courseProgressSchema);

export default CourseProgress;
