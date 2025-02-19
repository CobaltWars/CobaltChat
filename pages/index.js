import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue } from 'firebase/database';
import dynamic from 'next/dynamic';

const firebaseConfig = {
  apiKey: "AIzaSyDo4XJZh6o-cY4YMXG1SDNADXHE8b7rdHE",
  authDomain: "cobaltchat-1d2c6.firebaseapp.com",
  databaseURL: "https://cobaltchat-1d2c6-default-rtdb.firebaseio.com",
  projectId: "cobaltchat-1d2c6",
  storageBucket: "cobaltchat-1d2c6.firebasestorage.app",
  messagingSenderId: "159212936433",
  appId: "1:159212936433:web:adb2022e743d10fc8d1d50"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const ChatComponent = () => {
  const [isClient, setIsClient] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState(''); // Nouveau state pour le nom temporaire
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const messagesRef = ref(database, 'messages');
    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.entries(data)
          .map(([id, msg]) => ({
            id,
            ...msg
          }))
          .sort((a, b) => b.timestamp - a.timestamp);
        setMessages(messageList);
      }
    });

    setIsInitialized(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !username.trim()) return;

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

  // Nouvelle fonction pour gérer la validation du nom d'utilisateur
  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (tempUsername.trim()) {
      setUsername(tempUsername.trim());
      setTempUsername('');
    }
  };

  if (!isClient || !isInitialized) {
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">CobaltChat</h1>
	  <p className="text-center">Version BETA - Des MAJ régulières auront lieu</p>
      
      {/* Configuration du nom d'utilisateur */}
      {!username && (
        <form onSubmit={handleUsernameSubmit} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Entrez votre pseudo"
              className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              disabled={!tempUsername.trim()}
            >
              Valider
            </button>
          </div>
        </form>
      )}

      {/* Affichage du nom d'utilisateur actuel */}
      {username && (
        <div className="mb-4 text-sm text-gray-600">
          Connecté en tant que: {username}
          <button 
            onClick={() => setUsername('')}
            className="ml-2 text-blue-500 hover:text-blue-700"
          >
            Changer
          </button>
        </div>
      )}

      {/* Zone des messages */}
      <div className="h-96 overflow-y-auto border rounded p-4 mb-4 bg-gray-50">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`mb-2 p-2 rounded ${
              msg.username === username 
                ? 'bg-blue-100 ml-auto mr-0 max-w-[80%]' 
                : 'bg-white max-w-[80%]'
            }`}
          >
            <div className="font-bold text-sm text-gray-600">{msg.username}</div>
            <div className="mt-1">{msg.text}</div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(msg.timestamp).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Formulaire d'envoi */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Votre message..."
          className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!username}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!username || !newMessage.trim()}
        >
          Envoyer
        </button>
      </form>
    </div>
  );
};

export default dynamic(() => Promise.resolve(ChatComponent), {
  ssr: false
});