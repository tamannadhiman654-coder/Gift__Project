import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

console.log("Cloudinary ENV Check:", process.env.cloud_name ? "Loaded" : "NOT LOADED");

cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
});

export const uploadImage = async (localPath) => {
  try {
    console.log("Uploading:", localPath);
    const result = await cloudinary.uploader.upload(localPath, {
      folder: 'ecommerce_profiles',
    });
    console.log("Cloudinary Success:", result.secure_url);
    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (err) {
    console.log("CLOUDINARY ERROR FULL:", err); // ye terminal me dekho
    throw new Error(err.message || JSON.stringify(err));
  }
};

export const deleteImage = async (public_id) => {
  if (!public_id) return;
  return await cloudinary.uploader.destroy(public_id);
};