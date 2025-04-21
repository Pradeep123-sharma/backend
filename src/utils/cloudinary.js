import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// method to upload file
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (! localFilePath) {
            throw new Error ("File not found !");
        }
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        console.log("File Uploaded successfully on cloudinary.", response.url);
        console.log(response); // It is optional. 
        return response;// this is for user so that he also knows something.

    } catch (error) {
        fs.unlinkSync(localFilePath); // Remove the locally saved file as the upload operation get failed.
        return null;
    }
}

export { uploadOnCloudinary };
