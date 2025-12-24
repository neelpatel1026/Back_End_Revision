import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Like } from "../models/likes.model.js";
import { Comment } from "../models/comment.model.js";
import { Playlist } from "../models/playlist.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../util/ApiError.js";
import { ApiResponse } from "../util/ApiResponse.js";
import { asyncHandler } from "../util/asyncHandler.js";
import { uploadOnCloudinary } from "../util/cloudinary.js";
import { deleteFromCloudinary } from "../util/DeleteFromCloudinary.js";


const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
  const match = {};

  if (query) {
    match.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid user id");
    }

    match.owner = new mongoose.Types.ObjectId(userId);
  }

  const sort = {};
  if (sortBy) {
    sort[sortBy] = sortType === "desc" ? -1 : 1;
  } else {
    sort.createdAt = -1;
  }

  const videoAggregate = Video.aggregate([
    {
      $match: match,
    },
    {
      $sort: sort,
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,

            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$ownerDetails",
        },
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const videos = await Video.aggregatePaginate(videoAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const videoFileLocalPath = req.files?.video[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
  // TODO: get video, upload to cloudinary, create video

  if (!title) {
    throw new ApiError(400, "Title field is empty");
  }

  if (!description) {
    throw new ApiError(400, "description field is empty");
  }

  if (!videoFileLocalPath) {
    throw new ApiError(400, "Video file is required");
  }
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail file is required");
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);

  if (!videoFile) {
    throw new ApiError(500, "Video File failed to upload");
  }
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!thumbnail) {
    throw new ApiError(500, "thumbnail file failed to upload");
  }

  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title: title,
    description: description,
    duration: videoFile.duration,
    owner: req.user._id,
  });

  if (!video) {
    throw new ApiError(500, "video failed to save to database");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title , description } = req.body;
  const newThumbnailLocalpath = req.files?.thumbnail[0]?.path;
  //TODO: update video details like title, description, thumbnail

  if (!title && !description && !req.files?.thumbnail) {
    throw new ApiError(
      400,
      "At least one field (title, description, or thumbnail) is required"
    );
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  const prevThumbnailUrl = video.thumbnail;
  let newThumbnailUrl = prevThumbnailUrl;

  if (newThumbnailLocalpath) {
    const newThumbnail = await uploadOnCloudinary(newThumbnailLocalpath);
    if (!newThumbnail.url) {
      throw new ApiError(500, "Error uploading new thumbnail");
    }

    newThumbnailUrl = newThumbnail.url;
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title: title || video.title,
        description: description || video.description,
        thumbnail: newThumbnailUrl,
      },
    },
    { new: true }
  );

  if (newThumbnailLocalpath && prevThumbnailUrl) {
    const urlParts = prevThumbnailUrl?.split("/");
    const publicIdWithExtension = urlParts[urlParts?.length - 1];
    const publicId = publicIdWithExtension?.split(".")[0];

    if (publicId) {
      try {
        const resultOfDeletion = await deleteFromCloudinary(publicId, "image");
      } catch (error) {
        console.log("failed to delete old avatar file ", error);
      }
    }
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "video details updated successfully")
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  //TODO: delete video
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(400, "you are not authorized to delete the video");
  }

  await Like.deleteMany({ video: videoId });
  await Comment.deleteMany({ video: videoId });

  await Playlist.updateMany({ video: videoId }, { $pull: { video: videoId } });

  const thumbnailUrl = video.thumbnail;
  const videoFileUrl = video.videoFile;

  if (videoFileUrl) {
    const urlParts = videoFileUrl?.split("/");
    const publicIdWithExtension = urlParts[urlParts?.length - 1];
    const publicId = publicIdWithExtension?.split(".")[0];

    if (publicId) {
      try {
        
        const resultOfDeletion = await deleteFromCloudinary(publicId, "video");
      } catch (error) {
        console.log("failed to delete the video file ", error);
      }
    }
  }

  if (thumbnailUrl) {
    const urlParts = thumbnailUrl?.split("/");
    const publicIdWithExtension = urlParts[urlParts?.length - 1];
    const publicId = publicIdWithExtension?.split(".")[0];

    if (publicId) {
      try {
        const resultOfDeletion = await deleteFromCloudinary(publicId, "image");
      } catch (error) {
        console.log("failed to delete the thumbnail file ", error);
      }
    }
  }

  await video.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "deleted the video successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "you are not authorized to toggle isPublished status");
  }

  video.isPublished = !video.isPublished;

  await video.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, video, "video publish status toggled successfully")
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};