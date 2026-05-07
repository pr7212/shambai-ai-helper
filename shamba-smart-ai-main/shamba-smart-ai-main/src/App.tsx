import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Camera, 
  Send, 
  MapPin, 
  Image as ImageIcon, 
  Loader2, 
  Leaf, 
  X,
  MessageSquare,
  Sprout
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  timestamp: Date;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Habari! I am ShambaSmart AI, your farming expert. How can I help you today? You can ask me a question or send me a photo of your crop.",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLocationToggle = () => {
    if (location) {
      setLocation(null);
      return;
    }

    setIsLocationLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsLocationLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsLocationLoading(false);
          alert("Could not get your location. Please check your settings.");
        }
      );
    } else {
      setIsLocationLoading(false);
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      image: selectedImage || undefined,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    const currentImage = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);

    try {
      let prompt = input;
      if (isOffline) {
        prompt = `[OFFLINE MODE ACTIVE] ${prompt}`;
      }
      const systemInstruction = `You are ShambaSmart AI, an agricultural assistant built for small-scale farmers in Kenya and East Africa.
      Your job is to provide clear, practical, and actionable farming advice in simple language.
      
      ${isOffline ? 'CRITICAL: The user is in OFFLINE MODE. Start your response with "(Offline Mode Advice):" and provide general, robust advice that does not rely on real-time data.' : ''}

      GENERAL RULES:
      - Use simple, non-technical language.
      - Be concise and direct.
      - Always give actionable steps.
      - Focus on crops common in East Africa (maize, beans, tomatoes, sukuma wiki).
      - Consider local climate (long rains: March-May, short rains: Oct-Dec).
      - Suggest low-cost, locally available solutions (ash, neem, manure, etc.).
      - Avoid expensive or hard-to-find chemicals unless necessary.
      - If unsure, say: "I am not fully sure, but here is the best advice."
      
      IF USER SENDS AN IMAGE:
      Analyze the crop and respond in this format:
      Crop:
      Problem/Disease:
      Confidence Level (High/Medium/Low):
      Explanation:
      (Simple explanation of what is happening)
      Treatment:
      - Step 1
      - Step 2
      Prevention:
      - Tip 1
      - Tip 2
      
      IF USER ASKS A QUESTION:
      Respond in this format:
      Answer:
      (Simple explanation)
      What to do:
      - Step 1
      - Step 2
      Extra tip:
      (Short helpful tip)
      
      TONE:
      - Friendly, helpful, and supportive.
      - Like a local farming expert.
      - Not scientific or complicated.`;

      let locationContext = "";
      if (location) {
        locationContext = `\n\nUser's current location: Latitude ${location.lat}, Longitude ${location.lng}. Use this to tailor advice for local climate and current season in East Africa.`;
      }

      const contents: any[] = [];
      
      if (currentImage) {
        const base64Data = currentImage.split(',')[1];
        contents.push({
          parts: [
            { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
            { text: prompt || "Analyze this crop image and provide advice." + locationContext }
          ]
        });
      } else {
        contents.push({
          parts: [{ text: prompt + locationContext }]
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || "I'm sorry, I couldn't process that. Please try again.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error calling Gemini:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Pole! I am having some trouble connecting. Please check your internet and try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-shamba-paper shadow-2xl overflow-hidden font-body">
      {/* Header */}
      <header className="bg-white border-b-2 border-shamba-green px-6 py-5 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="bg-shamba-lime border-2 border-shamba-green p-2 rotate-3 shadow-[2px_2px_0px_#004D40]">
            <Sprout className="text-shamba-green w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-black text-shamba-green leading-none tracking-tighter uppercase">ShambaSmart</h1>
            <p className="text-[10px] font-display font-bold text-shamba-green/60 uppercase tracking-[0.2em]">East Africa's Agri-Expert</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end mr-2">
            <span className="text-[10px] font-display font-black text-shamba-green uppercase tracking-widest">Location</span>
            <span className="text-xs font-display font-bold text-shamba-green">Nairobi, KE</span>
          </div>
          <button 
            onClick={() => setIsOffline(!isOffline)}
            className={`px-3 py-1 border-2 border-shamba-green font-display font-black text-[10px] uppercase tracking-widest transition-all shadow-[2px_2px_0px_#004D40] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] ${isOffline ? 'bg-red-500 text-white' : 'bg-white text-shamba-green'}`}
          >
            Offline: {isOffline ? 'ON' : 'OFF'}
          </button>
          <button 
            onClick={handleLocationToggle}
            className={`p-2 border-2 border-shamba-green transition-all shadow-[2px_2px_0px_#004D40] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] ${location ? 'bg-shamba-lime text-shamba-green' : 'bg-white text-shamba-green'}`}
            title={location ? "Location active" : "Enable location"}
          >
            {isLocationLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
        {messages.length === 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center space-y-10 py-10"
          >
            <div className="space-y-4">
              <div className="inline-block bg-shamba-lime border-2 border-shamba-green px-4 py-1 -rotate-2 font-display font-bold uppercase text-sm shadow-[3px_3px_0px_#004D40]">
                Jambo, Farmer!
              </div>
              <h2 className="text-5xl font-display font-black text-shamba-green leading-[0.9] tracking-tighter uppercase">
                Grow Smarter<br/>Not Harder
              </h2>
              <p className="text-shamba-green/70 max-w-xs mx-auto font-medium">
                Get instant, expert advice for your crops using AI.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 w-full max-w-sm">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="brutal-button p-8 flex flex-col items-center gap-4 group"
              >
                <Camera className="w-12 h-12 group-hover:scale-110 transition-transform" />
                <span className="text-xl font-display font-black">Upload Crop Photo</span>
              </button>

              <button 
                onClick={() => {
                  const inputEl = document.querySelector('input[type="text"]') as HTMLInputElement;
                  inputEl?.focus();
                }}
                className="brutal-button-secondary p-8 flex flex-col items-center gap-4 group"
              >
                <MessageSquare className="w-12 h-12 group-hover:scale-110 transition-transform" />
                <span className="text-xl font-display font-black">Ask a Question</span>
              </button>
            </div>

            <div className="flex gap-2 opacity-30 grayscale">
              <Leaf className="w-6 h-6" />
              <Leaf className="w-6 h-6 rotate-45" />
              <Leaf className="w-6 h-6 -rotate-45" />
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            (index === 0 && messages.length === 1) ? null : (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[90%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                  <div className={`p-5 brutal-card ${
                    msg.role === 'user' 
                      ? 'bg-shamba-green text-white border-shamba-green' 
                      : 'bg-white text-shamba-green'
                  }`}>
                    {msg.image && (
                      <div className="border-2 border-shamba-green mb-4 overflow-hidden shadow-[4px_4px_0px_#C6FF00]">
                        <img 
                          src={msg.image} 
                          alt="Uploaded crop" 
                          className="w-full object-cover max-h-72"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div className="markdown-body">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 mt-2 opacity-60 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[9px] font-display font-bold uppercase tracking-widest">
                      {msg.role === 'user' ? 'Farmer' : 'ShambaSmart'}
                    </span>
                    <span className="text-[9px] font-display font-bold uppercase tracking-widest">-</span>
                    <span className="text-[9px] font-display font-bold uppercase tracking-widest">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          ))}
        </AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="brutal-card bg-shamba-lime p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-shamba-green" />
              <span className="font-display font-black uppercase text-xs tracking-widest">Analyzing Shamba...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <div className="bg-white border-t-2 border-shamba-green p-5 pb-10">
        {selectedImage && (
          <div className="relative inline-block mb-6">
            <div className="border-2 border-shamba-green p-1 bg-shamba-lime shadow-[4px_4px_0px_#004D40]">
              <img 
                src={selectedImage} 
                alt="Preview" 
                className="w-24 h-24 object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-3 -right-3 bg-red-500 border-2 border-shamba-green text-white rounded-none p-1 shadow-[2px_2px_0px_#004D40] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 border-2 border-shamba-green bg-white text-shamba-green shadow-[3px_3px_0px_#004D40] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
          >
            <Camera className="w-7 h-7" />
          </button>
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ASK ANYTHING..."
              className="w-full bg-white border-2 border-shamba-green py-4 px-5 focus:outline-none focus:bg-shamba-lime/10 font-display font-bold text-sm placeholder:text-shamba-green/30 uppercase tracking-wider"
            />
          </div>

          <button
            type="submit"
            disabled={(!input.trim() && !selectedImage) || isLoading}
            className={`p-4 border-2 border-shamba-green transition-all ${
              (!input.trim() && !selectedImage) || isLoading
                ? 'bg-gray-100 text-gray-300 border-gray-200 shadow-none'
                : 'bg-shamba-lime text-shamba-green shadow-[4px_4px_0px_#004D40] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#004D40] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
            }`}
          >
            <Send className="w-7 h-7" />
          </button>
        </form>
      </div>
    </div>
  );
}
