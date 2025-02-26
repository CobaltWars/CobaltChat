import { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, query, orderByChild, limitToLast } from 'firebase/database';

// Types
type Message = {
  id: string;
  text: string;
  username: string;
  timestamp: number;
};

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase outside component to prevent multiple initializations
let app;
let database;

try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
} catch (error) {
  console.error("Firebase initialization error:", error);
}

const ChatComponent: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Check for saved username in localStorage
    const savedUsername = localStorage.getItem('cobaltchat_username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
    
    if (!database) return;
    
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
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !username.trim()) return;

    if (!database) {
      alert("Erreur de connexion à la base de données");
      return;
    }

    const messagesRef = ref(database, 'messages');

    try {
      await push(messagesRef, {
        text: newMessage,
        username: username,
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

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempUsername.trim()) {
      const username = tempUsername.trim();
      setUsername(username);
      setTempUsername('');
      // Save username in localStorage
      localStorage.setItem('cobaltchat_username', username);
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

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-2 text-center text-blue-600">CobaltChat</h1>
      <p className="text-center text-gray-500 mb-4">Version BETA - Des MAJ régulières auront lieu</p>
      
      {/* Username configuration */}
      {!username && (
        <div className="mb-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Bienvenue sur CobaltChat</h2>
          <p className="mb-4 text-gray-600">Choisissez un pseudo pour commencer à chatter</p>
          <form onSubmit={handleUsernameSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Entrez votre pseudo"
              className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              disabled={!tempUsername.trim()}
            >
              Valider
            </button>
          </form>
        </div>
      )}

      {/* Current user display */}
      {username && (
        <div className="mb-4 flex items-center justify-between bg-white rounded-lg shadow-sm p-3">
          <div className="text-sm text-gray-600">
            Connecté en tant que: <span className="font-medium">{username}</span>
          </div>
          <button 
            onClick={() => {
              setUsername('');
              localStorage.removeItem('cobaltchat_username');
            }}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            Changer de pseudo
          </button>
        </div>
      )}

      {/* Messages area */}
      {username && (
        <>
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
                      msg.username === username 
                        ? 'flex justify-end' 
                        : 'flex justify-start'
                    }`}
                  >
                    <div 
                      className={`p-3 rounded-lg max-w-[80%] ${
                        msg.username === username 
                          ? 'bg-blue-500 text-white rounded-br-none' 
                          : 'bg-white border rounded-bl-none'
                      }`}
                    >
                      <div className={`font-bold text-sm ${
                        msg.username === username 
                          ? 'text-blue-100' 
                          : 'text-gray-600'
                      }`}>
                        {msg.username}
                      </div>
                      <div className="mt-1 whitespace-pre-wrap">{msg.text}</div>
                      <div className={`text-xs mt-1 text-right ${
                        msg.username === username 
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
        </>
      )}
    </div>
  );
};

export default ChatComponent;