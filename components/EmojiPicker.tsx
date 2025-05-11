// Le composant est incomplet, voici la version complète
const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => {
  const [activeGroup, setActiveGroup] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div ref={pickerRef} className="absolute bottom-12 left-0 bg-white rounded-lg shadow-lg border w-64 h-64 flex flex-col z-50">
      <div className="flex border-b">
        {EMOJI_GROUPS.map((group, index) => (
          <button
            key={group.name}
            onClick={() => setActiveGroup(index)}
            className={`flex-1 py-2 text-sm ${activeGroup === index ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
          >
            {group.name}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-2 grid grid-cols-8 gap-1">
        {EMOJI_GROUPS[activeGroup].emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="text-xl hover:bg-gray-100 rounded p-1"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;
