import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/AppError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Content field is required");
  }
  let tweet = await Tweet.create({
    content: content,
  });
  if (!tweet) {
    throw new ApiError(400, "Failed to create the tweet");
  }
  res.status(201).json(new ApiResponse(201, tweet, "Tweet added successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  try {
    // Extract the user's ID from the request parameters or authenticated user information
    const { userId } = req.params; // Assuming user ID is available in the request parameters

    // Query the Tweet model to find tweets authored by the user
    const userTweets = await Tweet.find({ owner: userId });

    // Return the tweets in the response
    res
      .status(200)
      .json(
        new ApiResponse(200, userTweets, "User tweets fetched successfully")
      );
  } catch (error) {
    // Handle errors
    console.error("Error fetching user tweets:", error);
    res
      .status(500)
      .json(new ApiResponse(500, null, "Error fetching user tweets"));
  }
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  try {
    const { content } = req.body;
    const { tweetId } = req.params;

    // Check if commentId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
      throw new ApiError(400, "Invalid tweetId");
    }

    // Check if content is provided
    if (!content || typeof content !== "string") {
      throw new ApiError(400, "Content must be a non-empty string");
    }

    // Find the comment by ID and update it
    const updatedTweet = await Tweet.findByIdAndUpdate(
      tweetId,

      { content: content.toLowerCase() }, // Assuming content should be lowercase
      { new: true }
    );

    // Check if the comment was found and updated
    if (!updatedTweet) {
      throw new ApiError(404, "tweet not found");
    }

    // Send response
    res
      .status(200)
      .json(new ApiResponse(200, updatedTweet, "tweet updated successfully"));
  } catch (error) {
    console.log(error); // Pass the error to the error handling middleware
  }
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  try {
    const { tweetId } = req.params;

    // Check if commentId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
      throw new ApiError(400, "Invalid tweetId");
    }

    // Find the comment by ID and delete it
    const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

    // Check if the comment was found and deleted
    if (!deletedTweet) {
      throw new ApiError(404, "Tweet not found");
    }

    // Send response
    res
      .status(200)
      .json(new ApiResponse(200, deletedTweet, "tweet deleted successfully"));
  } catch (error) {
    console.log(error); // Pass the error to the error handling middleware
  }
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
