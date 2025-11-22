const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const fs = require('fs');

exports.uploadFileToCloudinary = async (file, folder = 'avatars') => {
  try {
    const base64String = file.buffer.toString('base64');
    const dataURI = `data:${file.mimetype};base64,${base64String}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder,
      resource_type: 'image',
    });
    return result.secure_url;
  } catch (error) {
    throw new Error(`File upload failed: ${error.message}`);
  }
};

exports.uploadDataURIToCloudinary = async (dataURI, folder = 'property') => {
  try {
    const result = await cloudinary.uploader.upload(dataURI, {
      folder,
      resource_type: 'image',
    });
    return result.secure_url;
  } catch (error) {
    throw new Error(`File upload failed: ${error.message}`);
  }
}

exports.addWatermarkToImage = async (base64Image) => {
  const imageBuffer = Buffer.from(base64Image.split(',')[1], 'base64');

  const finalImage = await sharp(imageBuffer)
    .composite([
      {
        input: '../logo192.png',
        gravity: 'southeast',
        blend: 'overlay',
        opacity: 0.5,
      },
    ])
    .toBuffer();

  return `data:image/png;base64,${finalImage.toString('base64')}`;
}
