import { useState, useEffect, useRef } from 'react';
import { getDatabase, ref, push, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { LoginForm, RegisterForm } from './AuthComponents';
import { registerUser, loginUser, logoutUser, getCurrentUser, AuthUser, onAuthStateChange } from '../services/authService';
import FileDisplay from './FileDisplay';

// Types
type Attachment = {
  name: string;
  type: string;
  data: string; // base64 encoded data
  size: number;
};

type Message = {
  id: string;
  text: string;
  username: string;
  userId: string;
  timestamp: number;
  attachment?: Attachment;
};

const ChatComponent: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showLoginForm, setShowLoginForm] = useState(true); // true for login, false for register
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
    
    // Subscribe to auth state changes
    const unsubscribeAuth = onAuthStateChange(setUser);
    
    return () => {
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const database = getDatabase();
    
    // Load only the last 50 messages, ordered by timestamp
    const messagesRef = query(
      ref(database, 'messages'),
      orderByChild('timestamp'),
      limitToLast(50)
    );
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.entries(data)
          .map(([id, msg]) => ({
            id,
            ...(msg as Omit<Message, 'id'>)
          }))
          .sort((a, b) => a.timestamp - b.timestamp); // Chronological order
        setMessages(messageList);
        setIsLoading(false);
        // Only auto-scroll if user is near the bottom already
        setTimeout(scrollToBottom, 100);
      } else {
        setMessages([]);
        setIsLoading(false);
      }
    });

    // Cleanup function to unsubscribe from Firebase
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check file size (limit to 5MB for base64 storage)
      if (file.size > 5 * 1024 * 1024) {
        alert("Le fichier est trop volumineux. Limite: 5MB");
        e.target.value = '';
        return;
      }
      
      setFileUpload(file);
    }
  };

  // Remove selected file
  const removeSelectedFile = () => {
    setFileUpload(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !fileUpload) || !user) return;

    setIsUploading(true);
    const database = getDatabase();
    const messagesRef = ref(database, 'messages');

    try {
      const messageData: Omit<Message, 'id'> = {
        text: newMessage,
        username: user.username,
        userId: user.uid,
        timestamp: Date.now()
      };

      // Process file attachment if exists
      if (fileUpload) {
        const base64Data = await fileToBase64(fileUpload);
        
        messageData.attachment = {
          name: fileUpload.name,
          type: fileUpload.type,
          data: base64Data,
          size: fileUpload.size
        };
      }

      await push(messagesRef, messageData);
      
      setNewMessage('');
      setFileUpload(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Erreur d'envoi:", error);
      alert("Erreur lors de l'envoi du message");
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (but not Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleLogin = async (username: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    
    try {
      await loginUser(username, password);
      // Auth state listener will update the user state
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (username: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    
    try {
      await registerUser(username, password);
      // Auth state listener will update the user state
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      // Auth state listener will update the user state
    } catch (error: any) {
      console.error('Logout error:', error);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  // Group messages by day
  const groupedMessages = messages.reduce<Record<string, Message[]>>((groups, message) => {
    const date = formatDate(message.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not logged in, show authentication forms
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-2 text-center text-blue-600">CobaltChat</h1>
        <p className="text-center text-gray-500 mb-8">Version BETA - Des MAJ régulières auront lieu</p>
        
        {showLoginForm ? (
          <LoginForm 
            onLogin={handleLogin} 
            onSwitchToRegister={() => setShowLoginForm(false)} 
            isLoading={authLoading}
            error={authError}
          />
        ) : (
          <RegisterForm 
            onRegister={handleRegister} 
            onSwitchToLogin={() => setShowLoginForm(true)} 
            isLoading={authLoading}
            error={authError}
          />
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col p-4 bg-gray-50">
      <h1 className="text-3xl font-bold mb-2 text-center text-blue-600">CobaltChat</h1>
      <p className="text-center text-gray-500 mb-4">Version BETA - Des MAJ régulières auront lieu</p>
      
      {/* User info and logout */}
      <div className="mb-4 flex items-center justify-between bg-white rounded-lg shadow-sm p-3">
        <div className="text-sm text-gray-600">
          Connecté en tant que: <span className="font-medium">{user.username}</span>
        </div>
        <button 
          onClick={handleLogout}
          className="text-sm text-blue-500 hover:text-blue-700"
        >
          Déconnexion
        </button>
      </div>

      {/* Messages area */}
      <div 
        ref={messageContainerRef} 
        className="flex-1 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50 shadow-inner"
      >
        {Object.entries(groupedMessages).map(([date, messagesForDay]) => (
          <div key={date} className="mb-4">
            <div className="text-center my-3">
              <span className="px-2 py-1 bg-gray-200 rounded-full text-xs text-gray-600">
                {date}
              </span>
            </div>
            
            {messagesForDay.map((msg) => (
              <div 
                key={msg.id} 
                className={`mb-3 ${
                  msg.userId === user.uid 
                    ? 'flex justify-end' 
                    : 'flex justify-start'
                }`}
              >
                <div 
                  className={`p-3 rounded-lg max-w-[80%] ${
                    msg.userId === user.uid 
                      ? 'bg-blue-500 text-white rounded-br-none' 
                      : 'bg-white border rounded-bl-none'
                  }`}
                >
                  <div className={`font-bold text-sm ${
                    msg.userId === user.uid 
                      ? 'text-blue-100' 
                      : 'text-gray-600'
                  }`}>
                    {msg.username}
                  </div>
                  {msg.text && <div className="mt-1 whitespace-pre-wrap">{msg.text}</div>}
                  
                  {/* Display file or image attachment */}
                  {msg.attachment && (
                    <div className="mt-2">
                      <FileDisplay attachment={msg.attachment} />
                    </div>
                  )}
                  
                  <div className={`text-xs mt-1 text-right ${
                    msg.userId === user.uid 
                      ? 'text-blue-200' 
                      : 'text-gray-500'
                  }`}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* File upload display */}
      {fileUpload && (
        <div className="mb-2 p-2 bg-gray-100 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center mr-2">
              {fileUpload.type.startsWith('image/') ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="text-sm truncate max-w-xs">{fileUpload.name}</div>
          </div>
          <button 
            onClick={removeSelectedFile}
            className="text-red-500 hover:text-red-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Send form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Votre message... (Entrée pour envoyer, Shift+Entrée pour sauter une ligne)"
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px] max-h-[200px] resize-y"
            disabled={isUploading}
          />
          
          <div className="flex flex-col gap-2">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden" 
              accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              disabled={isUploading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            
            <button
              type="submit"
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isUploading || (!newMessage.trim() && !fileUpload)}
            >
              {isUploading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
        
        {/* Upload limit warning */}
        <div className="text-xs text-gray-500 italic">
          Limite de taille des fichiers: 5MB. Formats supportés: images, PDF, documents Office et texte.
        </div>
      </form>
    </div>
  );
};

export default ChatComponent;