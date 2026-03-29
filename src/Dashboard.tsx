import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, HardDrive, Cpu, Zap, Search, Bell, TrendingUp, Activity, Shield, Cpu as AiIcon, Globe, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from './lib/utils';
import { generateDerivApiInstance } from './lib/deriv-api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const performanceData = [
  { time: '00:00', value: 82 },
  { time: '04:00', value: 85 },
  { time: '08:00', value: 84 },
  { time: '12:00', value: 88 },
  { time: '16:00', value: 87 },
  { time: '20:00', value: 89 },
  { time: '23:59', value: 91 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [accuracy, setAccuracy] = useState(84.2);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    // Simulate slight accuracy fluctuations to feel real
    const interval = setInterval(() => {
      setAccuracy(prev => +(prev + (Math.random() * 0.2 - 0.1)).toFixed(1));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    apiRef.current = generateDerivApiInstance();
    const symbols = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100', '1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V'];
    
    const subscribeToTicks = async () => {
      try {
        await apiRef.current.send({ ticks: symbols });
        apiRef.current.onMessage().subscribe((response: any) => {
          if (response.msg_type === 'tick') {
            const { symbol, quote } = response.tick;
            setLivePrices(prev => ({ ...prev, [symbol]: quote }));
          }
        });
      } catch (error) {
        console.error('Dashboard tick subscription error:', error);
      }
    };

    subscribeToTicks();

    return () => {
      if (apiRef.current) {
        apiRef.current.send({ forget_all: 'ticks' });
      }
    };
  }, []);

  const options = [
    { id: 'builder', name: 'Bot builder', icon: Cpu, desc: 'Build a custom trading bot from scratch.', path: '/bot-builder', color: 'text-blue-400' },
    { id: 'strategy', name: 'Quick strategy', icon: Zap, desc: 'Start with a pre-configured trading strategy.', path: '/bot-builder', color: 'text-yellow-400' },
    { id: 'analysis', name: 'Analysis Tool', icon: TrendingUp, desc: 'Analyze market patterns and get signals.', path: '/analysis', color: 'text-green-400' },
    { id: 'free-bots', name: 'Free Bots', icon: Globe, desc: 'Access high-performance AI-created bots.', path: '/free-bots', color: 'text-purple-400' },
  ];

  return (
    <div className="flex-1 overflow-auto bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto p-6 lg:p-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <img src="/logo.png" alt="Logo" className="h-10 w-10 animate-rotate" referrerPolicy="no-referrer" />
              <h1 className="text-4xl font-bold tracking-tight">
                Welcome to <span className="text-[#4CAF50]">OTIVO AI</span>
              </h1>
            </div>
            <p className="text-[#aaaaaa]">Your intelligent partner in automated trading.</p>
          </div>
          <div className="flex items-center gap-4 bg-[#1a1a1a] p-3 rounded-xl border border-[#2d2f2f]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">AI Engine: Active</span>
            </div>
            <div className="h-4 w-[1px] bg-[#2d2f2f]" />
            <div className="text-sm text-[#aaaaaa]">Latency: 45ms</div>
          </div>
        </div>

        {/* Live Ticker */}
        <div className="mb-10 overflow-hidden bg-[#1a1a1a] border-y border-[#2d2f2f] py-4 -mx-6 lg:-mx-10 px-6 lg:px-10">
          <div className="flex gap-8 animate-marquee whitespace-nowrap">
            {Object.entries(livePrices).map(([symbol, price]) => (
              <div key={symbol} className="flex items-center gap-3 min-w-[150px]">
                <span className="text-xs font-bold text-[#aaaaaa]">{symbol.replace('R_', 'Volatility ')}</span>
                <span className="font-mono text-sm">{(price as number).toFixed(2)}</span>
                {Math.random() > 0.5 ? <ArrowUpRight size={14} className="text-green-500" /> : <ArrowDownRight size={14} className="text-red-500" />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {options.map((option) => (
                <div 
                  key={option.id}
                  onClick={() => navigate(option.path)}
                  className="bg-[#1a1a1a] rounded-2xl p-6 cursor-pointer transition-all hover:bg-[#222] border border-[#2d2f2f] hover:border-[#4CAF50] group relative overflow-hidden"
                >
                  <div className={cn("absolute -right-4 -bottom-4 opacity-5 transition-transform group-hover:scale-110", option.color)}>
                    <option.icon size={120} />
                  </div>
                  <div className={cn("mb-4 p-3 rounded-xl bg-[#151515] w-fit", option.color)}>
                    <option.icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{option.name}</h3>
                  <p className="text-sm text-[#aaaaaa] leading-relaxed">{option.desc}</p>
                </div>
              ))}
            </div>

            {/* Performance Overview */}
            <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2d2f2f]">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-lg font-bold">System Performance</h3>
                  <p className="text-xs text-[#aaaaaa]">Real-time AI prediction accuracy</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#4CAF50]">{accuracy}%</div>
                  <div className="text-[10px] text-[#aaaaaa] uppercase tracking-wider">Accuracy Score</div>
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4CAF50" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d2f2f" vertical={false} />
                    <XAxis dataKey="time" stroke="#555" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2d2f2f', borderRadius: '8px' }}
                      itemStyle={{ color: '#4CAF50' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#4CAF50" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* AI Insights */}
            <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2d2f2f]">
              <div className="flex items-center gap-2 mb-6">
                <AiIcon size={20} className="text-[#4CAF50]" />
                <h3 className="font-bold">Otivo AI Insights</h3>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-[#151515] rounded-xl border border-[#2d2f2f]">
                  <div className="text-xs text-[#aaaaaa] mb-1">Market Sentiment</div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Bullish</span>
                    <span className="text-green-500 text-xs font-bold">+12.4%</span>
                  </div>
                </div>
                <div className="p-4 bg-[#151515] rounded-xl border border-[#2d2f2f]">
                  <div className="text-xs text-[#aaaaaa] mb-1">Top Recommended Asset</div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Volatility 100 (1s)</span>
                    <span className="bg-[#4CAF50]/10 text-[#4CAF50] text-[10px] px-2 py-0.5 rounded-full font-bold">HIGH SIGNAL</span>
                  </div>
                </div>
                <div className="p-4 bg-[#151515] rounded-xl border border-[#2d2f2f]">
                  <div className="text-xs text-[#aaaaaa] mb-1">Risk Level</div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Moderate</span>
                    <div className="flex gap-1">
                      <div className="w-4 h-1 bg-[#4CAF50] rounded-full" />
                      <div className="w-4 h-1 bg-[#4CAF50] rounded-full" />
                      <div className="w-4 h-1 bg-gray-700 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Activity */}
            <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2d2f2f]">
              <div className="flex items-center gap-2 mb-6">
                <Activity size={20} className="text-[#4CAF50]" />
                <h3 className="font-bold">Global Activity</h3>
              </div>
              <div className="space-y-4">
                {[
                  { user: 'User_842', action: 'Bot Started', time: '2m ago', profit: null },
                  { user: 'Trader_X', action: 'Won Trade', time: '5m ago', profit: '+12.50' },
                  { user: 'Otivo_Bot', action: 'Signal Found', time: '8m ago', profit: null },
                  { user: 'Dev_User', action: 'Bot Saved', time: '12m ago', profit: null },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#2d2f2f] flex items-center justify-center text-[10px] font-bold">
                        {item.user[0]}
                      </div>
                      <div>
                        <div className="font-medium">{item.user}</div>
                        <div className="text-[10px] text-[#aaaaaa]">{item.action}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#aaaaaa]">{item.time}</div>
                      {item.profit && <div className="text-[10px] text-green-500 font-bold">{item.profit}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Status */}
            <div className="bg-[#4CAF50]/5 rounded-2xl p-6 border border-[#4CAF50]/20">
              <div className="flex items-center gap-3 mb-4">
                <Shield size={24} className="text-[#4CAF50]" />
                <div>
                  <h3 className="font-bold text-sm">Secure Environment</h3>
                  <p className="text-[10px] text-[#aaaaaa]">End-to-end encryption active</p>
                </div>
              </div>
              <button className="w-full py-2 bg-[#4CAF50] hover:bg-[#45a049] text-black text-xs font-bold rounded-lg transition-colors">
                VIEW SECURITY LOGS
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
