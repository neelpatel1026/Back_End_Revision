import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "./ApiError.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const deleteFromCloudinary = async (publicId,resource_type="image") => {

  try {
    if(!publicId){
      throw new ApiError(400,"publicId is required for deletion")
    }
    const result= await cloudinary.uploader
      .destroy(publicId,{resource_type:resource_type})

      console.log(result)

      return result;
      
  } catch (error) {
    console.log("unsuccessful deletion", error)
    return null;
  }
};

export { deleteFromCloudinary };