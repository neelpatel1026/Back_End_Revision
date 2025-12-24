import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/* ===================== TOGGLE SUBSCRIPTION ===================== */
const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const subscriberId = req.user._id;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id");
  }

  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  if (channelId === subscriberId.toString()) {
    throw new ApiError(403, "One cannot subscribe his own channel");
  }

  const existingSubscription = await Subscription.findOne({
    subscriber: subscriberId,
    channel: channelId,
  });

  if (existingSubscription) {
    await existingSubscription.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Unsubscribed to this channel"));
  }

  const subscription = await Subscription.create({
    subscriber: subscriberId,
    channel: channelId,
  });

  const populatedSubscription = await subscription.populate([
    { path: "subscriber", select: "username avatar" },
    { path: "channel", select: "username avatar" },
  ]);

  return res
    .status(201)
    .json(
      new ApiResponse(201, populatedSubscription, "Subscribed to this channel")
    );
});

/* ===================== GET CHANNEL SUBSCRIBERS ===================== */
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id");
  }

  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  if (channelId !== req.user._id.toString()) {
    throw new ApiError(403, "Permission Denied");
  }

  const subscriptions = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
              fullname: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        subscriber: { $first: "$subscriber" },
      },
    },
    {
      $project: {
        subscriber: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscriptions, "Subscribers fetched successfully")
    );
});

/* ===================== GET SUBSCRIBED CHANNELS ===================== */
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber id");
  }

  const subscriber = await User.findById(subscriberId);
  if (!subscriber) {
    throw new ApiError(404, "Subscriber not found");
  }

  if (subscriberId !== req.user._id.toString()) {
    throw new ApiError(403, "Permission Denied");
  }

  const subscriptions = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "subscribedTo",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
              fullname: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        subscribedTo: { $first: "$subscribedTo" },
      },
    },
    {
      $project: {
        subscribedTo: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscriptions, "Subscribed channels fetched successfully")
    );
});

export {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels,
};
