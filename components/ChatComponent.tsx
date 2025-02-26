import { useState, useEffect, useRef } from 'react';
import { getDatabase, ref, push, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { LoginForm, RegisterForm } from './AuthComponents';
import { registerUser, loginUser, logoutUser, getCurrentUser, AuthUser, onAuthStateChange } from '../services/authService';

// Types
type Message = {
  id: string;
  text: string;
  username: string;
  userId: string;
  timestamp: number;
};

const ChatComponent: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showLoginForm, setShowLoginForm] = useState(true); // true for login, false for register
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const database = getDatabase();
    const messagesRef = ref(database, 'messages');

    try {
      await push(messagesRef, {
        text: newMessage,
        username: user.username,
        userId: user.uid,
        timestamp: Date.now()
      });
      setNewMessage('');
    } catch (error) {
      console.error("Erreur d'envoi:", error);
      alert("Erreur lors de l'envoi du message");
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
    <div className="max-w-3xl mx-auto p-4">
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
        className="h-96 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50 shadow-inner"
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
                  <div className="mt-1 whitespace-pre-wrap">{msg.text}</div>
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

      {/* Send form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Votre message... (Entrée pour envoyer, Shift+Entrée pour sauter une ligne)"
          className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px] max-h-[200px] resize-y"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!newMessage.trim()}
        >
          Envoyer
        </button>
      </form>
    </div>
  );
};

export default ChatComponent;