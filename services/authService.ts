import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updatePassword,
  onAuthStateChanged,
  User,
  onIdTokenChanged
} from 'firebase/auth';
import { getDatabase, ref, set, onDisconnect } from 'firebase/database';

// Types
export type AuthUser = {
  uid: string;
  username: string;
  email: string;
  photoURL?: string;
};

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Register a new user
export const registerUser = async (username: string, password: string): Promise<AuthUser> => {
  try {
    // Create email from username (we'll use username as the unique identifier)
    const email = `${username.toLowerCase()}@cobaltchat.app`;
    
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile to add username
    await updateProfile(user, {
      displayName: username,
    });
    
    // Store user in database
    await set(ref(database, `users/${user.uid}`), {
      username,
      email,
      createdAt: Date.now(),
      online: true,
    });
    
    // Set online status to false on disconnect
    const onlineRef = ref(database, `users/${user.uid}/online`);
    onDisconnect(onlineRef).set(false);
    
    return {
      uid: user.uid,
      username,
      email,
    };
  } catch (error: any) {
    console.error('Error registering user:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      throw new Error(`Le pseudo "${username}" est déjà utilisé.`);
    }
    
    throw new Error('Erreur lors de la création du compte. Veuillez réessayer.');
  }
};

// Login user
export const loginUser = async (username: string, password: string): Promise<AuthUser> => {
  try {
    const email = `${username.toLowerCase()}@cobaltchat.app`;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    if (!user.displayName) {
      throw new Error('Profil utilisateur incomplet.');
    }
    
    // Update online status
    await updateOnlineStatus(user.uid, true);
    
    // Set online status to false on disconnect
    const onlineRef = ref(database, `users/${user.uid}/online`);
    onDisconnect(onlineRef).set(false);
    
    return {
      uid: user.uid,
      username: user.displayName,
      email: user.email || email,
      photoURL: user.photoURL || undefined
    };
  } catch (error: any) {
    console.error('Error logging in:', error);
    
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error('Pseudo ou mot de passe incorrect.');
    }
    
    throw new Error('Erreur de connexion. Veuillez réessayer.');
  }
};

// Logout user
export const logoutUser = async (): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (user) {
      await updateOnlineStatus(user.uid, false);
    }
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw new Error('Erreur lors de la déconnexion.');
  }
};

// Get current user
export const getCurrentUser = (): Promise<AuthUser | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user && user.displayName) {
        resolve({
          uid: user.uid,
          username: user.displayName,
          email: user.email || `${user.displayName.toLowerCase()}@cobaltchat.app`,
          photoURL: user.photoURL || undefined
        });
      } else {
        resolve(null);
      }
    });
  });
};

// Auth state observer
export const onAuthStateChange = (callback: (user: AuthUser | null) => void): () => void => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user && user.displayName) {
      callback({
        uid: user.uid,
        username: user.displayName,
        email: user.email || `${user.displayName.toLowerCase()}@cobaltchat.app`,
        photoURL: user.photoURL || undefined
      });
    } else {
      callback(null);
    }
  });
};

// Change password
export const changePassword = async (newPassword: string): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Utilisateur non connecté');
    
    await updatePassword(user, newPassword);
  } catch (error: any) {
    console.error('Error changing password:', error);
    if (error.code === 'auth/requires-recent-login') {
      throw new Error('Pour des raisons de sécurité, veuillez vous reconnecter avant de changer votre mot de passe.');
    }
    throw new Error('Erreur lors du changement de mot de passe. Veuillez réessayer.');
  }
};

// Update profile picture
export const updateProfilePicture = async (photoURL: string): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Utilisateur non connecté');
    
    await updateProfile(user, { photoURL });
    
    // Update in database as well
    await set(ref(database, `users/${user.uid}/photoURL`), photoURL);
  } catch (error) {
    console.error('Error updating profile picture:', error);
    throw new Error('Erreur lors de la mise à jour de la photo de profil.');
  }
};

// Update online status
export const updateOnlineStatus = async (userId: string, status: boolean): Promise<void> => {
  try {
    const userStatusRef = ref(database, `users/${userId}/online`);
    await set(userStatusRef, status);
  } catch (error) {
    console.error('Error updating online status:', error);
  }
};

export default {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  onAuthStateChange,
  changePassword,
  updateProfilePicture,
  updateOnlineStatus
};
