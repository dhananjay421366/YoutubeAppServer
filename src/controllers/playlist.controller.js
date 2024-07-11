import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/AppError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name || !description) {
    throw new ApiError(400, "All fields are required");
  }
  const playlist = await Playlist.create({
    name,
    description,
  });
  if (!playlist) {
    throw new ApiError(400, "Failed to create the playlist");
  }
  res
    .status(201)
    .json(new ApiResponse(201, playlist, "playlist added successfully"));
});
// const getUserPlaylists = asyncHandler(async (req, res) => {
//   const { userId } = req.params;
//   //TODO: get user playlists
// });
const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    // Check if the user exists (assuming the user is a channel)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    // Fetch all playlists created by the user
    const playlists = await Playlist.find({ owner: userId });

    res
      .status(200)
      .json(new ApiResponse(200, playlists, "Playlists fetched successfully"));
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json(new ApiError(500, "An error occurred while fetching playlists"));
  }
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
