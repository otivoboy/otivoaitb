import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bot, 
  LineChart, 
  PieChart, 
  Wrench, 
  Download, 
  Copy, 
  ShieldAlert,
  Bell,
  TrendingUp,
  LogIn,
  UserPlus,
  Moon,
  Sun,
  Maximize,
  Globe,
  Facebook,
  Twitter,
  Youtube,
  LogOut,
  RefreshCw
} from 'lucide-react';
import { cn } from './lib/utils';
import { botEngine } from './lib/botEngine';

interface LayoutProps {
  children: React.ReactNode;
}

interface AccountInfo {
  balance: string;
  currency: string;
  loginid: string;
  is_virtual: boolean;
}

export default function Layout({ children }: LayoutProps) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState(new Date().toISOString().replace('T', ' ').substring(0, 19) + ' GMT');
  const [apiToken, setApiToken] = useState(localStorage.getItem('deriv_api_token') || '');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<any>(null);
  const location = useLocation();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date().toISOString().replace('T', ' ').substring(0, 19) + ' GMT');
    }, 1000);
    
    // Auto-connect if token exists
    if (apiToken && !isConnected && !isConnecting) {
      connectToDeriv();
    }

    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const connectToDeriv = () => {
    const token = apiToken || localStorage.getItem('deriv_api_token');
    if (!token) {
      setError('Please enter an API token');
      return;
    }

    setIsConnecting(true);
    setError(null);

    const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=45065');
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ authorize: token }));
      
      // Start heartbeat
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ ping: 1 }));
        }
      }, 30000);
    };

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      
      if (data.error) {
        setError(data.error.message);
        setIsConnecting(false);
        ws.close();
        return;
      }

      if (data.msg_type === 'ping') {
        return;
      }

      if (data.msg_type === 'authorize') {
        localStorage.setItem('deriv_api_token', token);
        botEngine.setToken(token);
        const auth = data.authorize;
        setAccountInfo({
          balance: auth.balance,
          currency: auth.currency,
          loginid: auth.loginid,
          is_virtual: auth.is_virtual === 1 || auth.loginid.startsWith('VRTC') || auth.loginid.startsWith('VRT'),
        });
        setIsConnected(true);
        setIsConnecting(false);
        
        // Subscribe to balance updates
        ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
      }

      if (data.msg_type === 'balance') {
        setAccountInfo(prev => prev ? { ...prev, balance: data.balance.balance.toString() } : null);
      }
    };

    ws.onclose = () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      setIsConnected(false);
      setIsConnecting(false);
      setAccountInfo(null);
    };

    ws.onerror = () => {
      setError('WebSocket error occurred');
      setIsConnecting(false);
    };
  };

  const disconnectFromDeriv = () => {
    if (socketRef.current) {
      socketRef.current.close();
    }
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Bot Builder', icon: Bot, path: '/bot-builder' },
    { name: 'Charts', icon: LineChart, path: '/charts' },
    { name: 'Analysistool', icon: PieChart, path: '/analysis' },
    { name: 'Free Bots', icon: Download, path: '/free-bots' },
  ];

  return (
    <div className={cn(
      "h-screen flex flex-col transition-colors duration-300 overflow-hidden",
      isDarkMode ? "bg-[#0e0e0e] text-white" : "bg-[#f8f9fa] text-[#2a2e2f]"
    )}>
      {/* Header */}
      <header className="bg-[#151717] px-5 py-2.5 flex justify-between items-center border-b border-[#2d2f2f] shrink-0">
        <div className="flex items-center gap-5">
          <div className="h-10 flex items-center gap-2">
             <img src="/logo.png" alt="Logo" className="h-8 w-8 animate-rotate" referrerPolicy="no-referrer" />
             <span className="text-xl font-bold text-white">OTIVO AI</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {isConnected && accountInfo ? (
            <div className="flex items-center gap-4 bg-[#222] px-4 py-2 rounded border border-[#2d2f2f]">
              <div className="flex flex-col items-end">
                <span className="text-xs text-[#aaaaaa]">Balance</span>
                <span className="text-sm font-bold text-[#4CAF50]">
                  {parseFloat(accountInfo.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {accountInfo.currency}
                </span>
              </div>
              
              <div className="h-8 w-px bg-[#2d2f2f]"></div>
              
              <div className="flex items-center gap-2">
                {accountInfo.is_virtual ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 bg-[#ff4444] rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                      D
                    </div>
                    <span className="text-xs font-medium text-[#aaaaaa]">Virtual</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">CR</span>
                    <span className="text-lg" title="USA Flag">🇺🇸</span>
                  </div>
                )}
              </div>
              
              <button 
                onClick={disconnectFromDeriv}
                className="text-[#aaaaaa] hover:text-white transition-colors"
                title="Disconnect"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <input 
                  type="password"
                  placeholder="Deriv API Token"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  className="bg-[#222] border border-[#2d2f2f] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4CAF50] w-48"
                />
                {error && (
                  <div className="absolute top-full right-0 mt-1 text-[10px] text-red-500 whitespace-nowrap">
                    {error}
                  </div>
                )}
              </div>
              <button 
                onClick={connectToDeriv}
                disabled={isConnecting}
                className={cn(
                  "bg-[#4CAF50] text-white px-4 py-2 rounded text-sm flex items-center gap-1.5 font-medium transition-all hover:bg-[#45a049]",
                  isConnecting && "opacity-50 cursor-not-allowed"
                )}
              >
                {isConnecting ? <RefreshCw size={16} className="animate-spin" /> : <LogIn size={16} />}
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-[#151717] flex px-5 border-b border-[#2d2f2f] overflow-x-auto shrink-0">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={cn(
              "px-4 py-3 text-sm flex items-center gap-2 whitespace-nowrap transition-colors",
              location.pathname === item.path 
                ? "text-white border-b-2 border-[#4CAF50]" 
                : "text-[#aaaaaa] hover:bg-[#2d2f2f] hover:text-white"
            )}
          >
            <item.icon size={16} /> {item.name}
          </Link>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#151717] px-5 py-2.5 flex justify-between items-center border-t border-[#2d2f2f] shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-2.5 h-2.5 rounded-full bg-[#4CAF50]"></div>
          <span className="text-xs text-[#aaaaaa]">{currentDateTime}</span>
          <div className="flex gap-2.5">
            <Facebook size={16} className="text-[#aaaaaa] cursor-pointer hover:text-white" />
            <Twitter size={16} className="text-[#aaaaaa] cursor-pointer hover:text-white" />
            <Youtube size={16} className="text-[#aaaaaa] cursor-pointer hover:text-white" />
          </div>
        </div>
        <div className="flex gap-2.5">
          <button 
            onClick={toggleDarkMode}
            className="bg-[#2d2f2f] text-white p-1.5 rounded cursor-pointer flex items-center gap-1.5"
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="bg-[#2d2f2f] text-white p-1.5 rounded cursor-pointer flex items-center gap-1.5">
            <Maximize size={16} />
          </button>
          <div className="bg-[#2d2f2f] text-white px-2.5 py-1.5 rounded cursor-pointer flex items-center gap-1.5">
            <Globe size={16} />
            <span className="text-sm">EN</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
