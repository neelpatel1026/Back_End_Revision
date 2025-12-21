import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/* ------------------ CHANNEL STATS ------------------ */
const getChannelStats = asyncHandler(async (req, res) => {
  const channelId = req.user._id;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id");
  }

  const channel = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "owner",
        pipeline: [
          { $match: { isPublished: true } },
          {
            $project: {
              views: 1,
            },
          },
        ],
        as: "videos",
      },
    },
    {
      $lookup: {
        from: "likes",
        let: { channelVideos: "$videos._id" },
        pipeline: [
          {
            $match: {
              $expr: { $in: ["$video", "$$channelVideos"] },
            },
          },
        ],
        as: "likes",
      },
    },
    {
      $addFields: {
        totalSubscribers: { $size: "$subscribers" },
        totalVideos: { $size: "$videos" },
        totalViews: { $sum: "$videos.views" },
        totalLikes: { $size: "$likes" },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
        totalSubscribers: 1,
        totalVideos: 1,
        totalViews: 1,
        totalLikes: 1,
      },
    },
  ]);

  if (!channel.length) {
    throw new ApiError(404, "Channel not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "Channel stats fetched successfully")
    );
});

/* ------------------ CHANNEL VIDEOS ------------------ */
const getChannelVideos = asyncHandler(async (req, res) => {
  const channelId = req.user._id;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id");
  }

  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
        isPublished: true,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        duration: 1,
        views: 1,
        createdAt: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, videos, "Channel videos fetched successfully")
    );
});

export { getChannelStats, getChannelVideos };
