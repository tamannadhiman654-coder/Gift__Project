import { v2 as cloudinary } from 'cloudinary'
import dotenv from 'dotenv'
dotenv.config()


cloudinary.config({ 
  cloud_name: 'process.env.cloud_name', 
  api_key: 'process.env.api_key', 
  api_secret: 'process.env.api_secret'
});


export const uploadImage = async (img) => {
    try{
  const img_url = await cloudinary.uploader.upload(img)
  return img_url
    }
    catch(err){
        res.send(err.message)
    }
}

export const deleteImage = async (public_id) => {
    try{
  const img_url = await cloudinary.uploader.destroy(public_id)
  return img_url
    }
    catch(err){
        res.send(err.message)
    }
} 

