import { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, "playlist name cannot be empty");
  }

  if (!description || !description.trim()) {
    throw new ApiError(400, "playlist description cannot be empty");
  }

  const playlist = await Playlist.create({
    name,
    description,
    videos: [],
    owner: req.user._id,
  });

  const populatedPlaylist = await playlist.populate(
    "owner",
    "username avatar"
  );

  return res
    .status(201)
    .json(
      new ApiResponse(201, populatedPlaylist, "playlist created successfully")
    );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "invalid user id");
  }

  const user = await User.findById(userId).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(404, "user not found");
  }

  const playlists = await Playlist.find({ owner: userId })
    .sort({ createdAt: -1 })
    .populate("owner", "username avatar")
    .populate(
      "videos",
      "videoFile thumbnail title description duration views likes"
    );

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlists, "playlist fetched successfully")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "invalid playlist id");
  }

  const playlist = await Playlist.findById(playlistId)
    .populate("owner", "username avatar")
    .populate(
      "videos",
      "videoFile thumbnail title description duration views likes"
    );

  if (!playlist) {
    throw new ApiError(404, "playlist not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "playlist fetched successfully")
    );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "invalid playlist id");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "invalid video id");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "playlist not found");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "video not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "you are not authorized to add videos to this playlist"
    );
  }

  if (playlist.videos.includes(videoId)) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, playlist, "video already exists in playlist")
      );
  }

  playlist.videos.push(videoId);
  await playlist.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "video added to playlist successfully")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "invalid playlist id");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "invalid video id");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "playlist not found");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "video not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "you are not authorized to remove videos from this playlist"
    );
  }

  if (!playlist.videos.includes(videoId)) {
    throw new ApiError(400, "video does not exist in playlist");
  }

  playlist.videos.pull(videoId);
  await playlist.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "video removed from playlist successfully")
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "invalid playlist id");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "you are not authorized to delete this playlist"
    );
  }

  await playlist.deleteOne();

  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, "deleted the playlist successfully")
    );
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, "name cannot be empty");
  }

  if (!description || !description.trim()) {
    throw new ApiError(400, "description cannot be empty");
  }

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "invalid playlist id");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "you are not authorized to update this playlist"
    );
  }

  playlist.name = name;
  playlist.description = description;

  const updatedPlaylist = await playlist.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "updated the playlist successfully")
    );
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
