import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

import {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
} from "../controllers/video.controller.js";
import { toggleVideoLike } from "../controllers/like.controller.js";
import {
  addComment,
  getVideoComments,
} from "../controllers/comment.controller.js";

const router = Router();

router.use(verifyJWT);

// keep getallvideos in user routes file

//add video
router.route("/").post(
  upload.fields([
    {
      name: "video",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  publishAVideo
);

router.route("/:videoId").get(getVideoById);

router.route("/:videoId").patch(upload.single("thumbnail"), updateVideo);

router.route("/:videoId").delete(deleteVideo);

router.route("/:videoId/toggle-publish").patch(togglePublishStatus);

//Like
router.route("/:videoId/toggle-like").patch(toggleVideoLike);

//Comment
router.route("/:videoId/comments").get(getVideoComments);
router.route("/:videoId/comments").post(addComment);

export default router;