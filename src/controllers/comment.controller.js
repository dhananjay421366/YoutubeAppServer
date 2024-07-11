import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/AppError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  try {
    // Extract videoId and pagination parameters from request
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Fetch comments for the specified video with pagination
    const comments = await Comment.find({ videoId })
      .skip((page - 1) * limit)
      .limit(limit);

    // Respond with the comments
    res.json({ comments, message: "Get Video Comments Successful" });
  } catch (error) {
    // Handle errors
    console.error("Error getting comments:", error);
    res.status(500).json({ error: "Error getting comments" });
  }
});

const addComment = asyncHandler(async (req, res, next) => {
  try {
    const { content } = req.body;

    // Check validation
    if (!content || typeof content !== "string") {
      throw new ApiError(400, "Content must be a non-empty string");
    }

    // Create the comment
    const comment = await Comment.create({
      content: content.toLowerCase(), // Assuming content should be lowercase
    });

    // Check if the comment was successfully created
    if (!comment) {
      throw new ApiError(500, "Failed to add the comment");
    }

    // Send response
    res
      .status(201)
      .json(new ApiResponse(201, comment, "Comment added successfully"));
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

const updateComment = asyncHandler(async (req, res) => {
  try {
    const { content } = req.body;
    const { commentId } = req.params;

    // Check if commentId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      throw new ApiError(400, "Invalid commentId");
    }

    // Check if content is provided
    if (!content || typeof content !== "string") {
      throw new ApiError(400, "Content must be a non-empty string");
    }

    // Find the comment by ID and update it
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      console.log(commentId),
      { content: content.toLowerCase() }, // Assuming content should be lowercase
      { new: true }
    );

    // Check if the comment was found and updated
    if (!updatedComment) {
      throw new ApiError(404, "Comment not found");
    }

    // Send response
    res
      .status(200)
      .json(
        new ApiResponse(200, updatedComment, "Comment updated successfully")
      );
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  try {
    const { commentId } = req.params;

    // Check if commentId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      throw new ApiError(400, "Invalid commentId");
    }

    // Find the comment by ID and delete it
    const deletedComment = await Comment.findByIdAndDelete(commentId);

    // Check if the comment was found and deleted
    if (!deletedComment) {
      throw new ApiError(404, "Comment not found");
    }

    // Send response
    res
      .status(200)
      .json(
        new ApiResponse(200, deletedComment, "Comment deleted successfully")
      );
  } catch (error) {
    console.log(error); // Pass the error to the error handling middleware
  }
});

export { getVideoComments, addComment, updateComment, deleteComment };
