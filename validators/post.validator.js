// Checks a create post payload and returns every problem found with it.
export const validateCreatePostInput = (payload = {}) => {
  const { title, description } = payload;
  const errors = [];

  if (typeof title !== "string" || !title.trim()) {
    errors.push("title is required");
  }

  if (typeof description !== "string" || !description.trim()) {
    errors.push("description is required");
  }

  return errors;
};
