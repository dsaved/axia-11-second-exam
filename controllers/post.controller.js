import postModel from "../models/post.model.js";
import { createError } from "../utils/error.util.js";
import { validateCreatePostInput } from "../validators/post.validator.js";

// Creates a post owned by the authenticated user identified on req.user.
export const createPost = async (req, res, next) => {
  try {
    const errors = validateCreatePostInput(req.body);
    if (errors.length) {
      throw createError(400, errors.join(", "));
    }

    const { title, description } = req.body;

    // The owner is taken from the verified token only, so a creatorId sent
    // in the request body is ignored rather than trusted.
    const userId = req.user.id;

    const post = await postModel.create({ title, description, creatorId: userId });

    return res.status(201).json({
      message: "post created successfully",
      post,
    });
  } catch (error) {
    next(error);
  }
};
