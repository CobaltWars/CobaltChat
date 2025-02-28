import React, { useState, useRef } from 'react';
import { updateProfilePicture } from '../services/authService';
import { uploadProfilePicture } from '../services/storageService';
import { AuthUser } from '../services/authService';

type ProfileModalProps = {
  user: AuthUser;
  onClose: () => void;
  onUpdate: (user: Partial<AuthUser>) => void;
};

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(user.photoURL || null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Veuillez sélectionner une image.');
        return;
      }
      
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('L\'image est trop volumineuse. Limite: 5MB');
        return;
      }
      
      // Preview the image
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviewImage(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
      
      setError(null);
      setSuccess(null);
    }
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.length) {
      setError('Veuillez sélectionner une image.');
      return;
    }
    
    const file = fileInputRef.current.files[0];
    setIsLoading(true);
    setError(null);
    
    try {
      const downloadURL = await uploadProfilePicture(file, user.uid);
      await updateProfilePicture(downloadURL);
      
      onUpdate({ photoURL: downloadURL });
      setSuccess('Photo de profil mise à jour avec succès!');
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la mise à jour de la photo de profil.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-semibold mb-4 dark:text-white">Profil</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
            {success}
          </div>
        )}
        
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-4">
            <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-blue-500">
              {previewImage ? (
                <img 
                  src={previewImage} 
                  alt="Profile" 
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-500">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <button 
              onClick={handleFileSelect}
              className="absolute bottom-0 right-0 rounded-full bg-blue-500 text-white p-2 shadow-md hover:bg-blue-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
          
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          
          <p className="text-lg font-semibold dark:text-white">{user.username}</p>
        </div>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
          >
            Annuler
          </button>
          <button
            onClick={handleUpload}
            disabled={isLoading || !fileInputRef.current?.files?.length}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Chargement...' : 'Mettre à jour'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
