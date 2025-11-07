const cloudinary = require('cloudinary').v2;

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
