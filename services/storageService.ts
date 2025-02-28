import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './authService';

const storage = getStorage(app);

export const uploadProfilePicture = async (file: File, userId: string): Promise<string> => {
  try {
    // Resize the image before uploading if it's too large
    let fileToUpload = file;
    if (file.size > 1024 * 1024) { // if larger than 1MB
      fileToUpload = await resizeImage(file, 500); // resize to max 500px width/height
    }
    
    const fileRef = storageRef(storage, `profile_pictures/${userId}`);
    await uploadBytes(fileRef, fileToUpload);
    const downloadURL = await getDownloadURL(fileRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw new Error('Erreur lors du téléchargement de l\'image.');
  }
};

// Helper function to resize images
const resizeImage = (file: File, maxSize: number): Promise<File> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        image.src = event.target.result as string;
        
        image.onload = () => {
          const canvas = document.createElement('canvas');
          let width = image.width;
          let height = image.height;
          
          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(image, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(resizedFile);
          }, file.type);
        };
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const uploadAttachment = async (file: File, messageId: string): Promise<string> => {
  try {
    const fileRef = storageRef(storage, `attachments/${messageId}_${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  } catch (error) {
    console.error('Error uploading attachment:', error);
    throw new Error('Erreur lors du téléchargement du fichier.');
  }
};

export default {
  uploadProfilePicture,
  uploadAttachment
};
