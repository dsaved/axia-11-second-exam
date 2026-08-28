import mongoose from "mongoose";

// Describes the shape of a post document, always owned by the user who created it.
const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "description is required"],
      trim: true,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: [true, "creatorId is required"],
    },
  },
  { timestamps: true },
);

const postModel = mongoose.model("post", postSchema);

export default postModel;
