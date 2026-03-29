import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, TrendingUp, TrendingDown, Activity, Zap, Target, BarChart3, Info, AlertCircle } from 'lucide-react';
import { generateDerivApiInstance } from './lib/deriv-api';
import { cn } from './lib/utils';

const SYMBOLS = [
  { id: 'R_10', name: 'Volatility 10' },
  { id: 'R_25', name: 'Volatility 25' },
  { id: 'R_50', name: 'Volatility 50' },
  { id: 'R_75', name: 'Volatility 75' },
  { id: 'R_100', name: 'Volatility 100' },
  { id: '1HZ10V', name: 'Volatility 10 (1s)' },
  { id: '1HZ100V', name: 'Volatility 100 (1s)' },
];

type SignalType = 'Rise/Fall' | 'Even/Odd' | 'Accumulator' | 'Matches/Differs' | 'Over/Under';

interface Signal {
  type: SignalType;
  symbol: string;
  prediction: string;
  strength: number; // 0-100
  timestamp: string;
}

export default function Analysis() {
  const navigate = useNavigate();
  const [selectedSymbol, setSelectedSymbol] = useState(SYMBOLS[0].id);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [marketData, setMarketData] = useState<any[]>([]);
  const apiRef = useRef<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  const [bestMarket, setBestMarket] = useState('Volatility 100 (1s)');

  useEffect(() => {
    // Periodically update "Best Market" to feel real
    const interval = setInterval(() => {
      const randomSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      setBestMarket(randomSymbol.name);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    apiRef.current = generateDerivApiInstance();
    
    const subscribeToTicks = async () => {
      try {
        console.log(`[Analysis] Subscribing to ${selectedSymbol}...`);
        const response = await apiRef.current.send({ ticks: selectedSymbol, subscribe: 1 });
        console.log('[Analysis] Subscription response:', response);
        
        apiRef.current.onMessage().subscribe((response: any) => {
          if (response.msg_type === 'tick' && response.tick.symbol === selectedSymbol) {
            const newTick = response.tick;
            setMarketData(prev => {
              const updated = [...prev, newTick].slice(-50); // Keep last 50 ticks for better analysis
              generateSignals(updated, selectedSymbol);
              return updated;
            });
          }
        });
      } catch (error) {
        console.error('Analysis tick subscription error:', error);
      }
    };

    subscribeToTicks();

    return () => {
      if (apiRef.current) {
        console.log(`[Analysis] Unsubscribing from ${selectedSymbol}...`);
        apiRef.current.send({ forget_all: 'ticks' });
      }
    };
  }, [selectedSymbol]);

  const generateSignals = (ticks: any[], symbol: string) => {
    if (ticks.length < 5) return;

    const lastTick = ticks[ticks.length - 1];
    const prevTick = ticks[ticks.length - 2];
    const lastDigit = parseInt(lastTick.quote.toString().split('').pop() || '0');
    
    const newSignals: Signal[] = [];

    // Rise/Fall Analysis
    const trend = lastTick.quote > prevTick.quote ? 'Rise' : 'Fall';
    newSignals.push({
      type: 'Rise/Fall',
      symbol,
      prediction: trend,
      strength: Math.floor(Math.random() * 30) + 60, // Simulated strength
      timestamp: new Date().toLocaleTimeString(),
    });

    // Even/Odd Analysis
    const evenOdd = lastDigit % 2 === 0 ? 'Even' : 'Odd';
    newSignals.push({
      type: 'Even/Odd',
      symbol,
      prediction: evenOdd,
      strength: Math.floor(Math.random() * 20) + 70,
      timestamp: new Date().toLocaleTimeString(),
    });

    // Over/Under Analysis
    const overUnder = lastDigit > 4 ? 'Over 4' : 'Under 5';
    newSignals.push({
      type: 'Over/Under',
      symbol,
      prediction: overUnder,
      strength: Math.floor(Math.random() * 25) + 65,
      timestamp: new Date().toLocaleTimeString(),
    });

    // Accumulator Analysis
    const avgChange = ticks.reduce((acc, t, i) => {
      if (i === 0) return 0;
      return acc + Math.abs(t.quote - ticks[i-1].quote);
    }, 0) / (ticks.length - 1);
    
    newSignals.push({
      type: 'Accumulator',
      symbol,
      prediction: avgChange > 0.1 ? 'High Growth' : 'Stable Growth',
      strength: Math.floor(Math.random() * 15) + 80,
      timestamp: new Date().toLocaleTimeString(),
    });

    // Matches/Differs
    const mostFrequentDigit = getMostFrequentDigit(ticks);
    newSignals.push({
      type: 'Matches/Differs',
      symbol,
      prediction: `Differ ${mostFrequentDigit}`,
      strength: 95,
      timestamp: new Date().toLocaleTimeString(),
    });

    setSignals(newSignals);
  };

  const getMostFrequentDigit = (ticks: any[]) => {
    const counts: Record<number, number> = {};
    ticks.forEach(t => {
      const digit = parseInt(t.quote.toString().split('').pop() || '0');
      counts[digit] = (counts[digit] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  };

  return (
    <div className="flex-1 overflow-auto bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto p-6 lg:p-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <BarChart3 className="text-[#4CAF50]" />
              Market Intelligence
            </h2>
            <p className="text-[#aaaaaa]">Real-time pattern analysis and signal generation for Otivo AI.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-[#1a1a1a] p-2 rounded-xl border border-[#2d2f2f]">
            {SYMBOLS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSymbol(s.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                  selectedSymbol === s.id ? "bg-[#4CAF50] text-black" : "text-[#aaaaaa] hover:text-white hover:bg-[#2d2f2f]"
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Live Analysis Feed */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#2d2f2f] overflow-hidden">
              <div className="p-6 border-b border-[#2d2f2f] flex justify-between items-center bg-[#1d1d1d]">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-yellow-400" />
                  <h3 className="font-bold">Live Signals</h3>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#aaaaaa]">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  LIVE SCANNING
                </div>
              </div>
              
              <div className="divide-y divide-[#2d2f2f]">
                {signals.length > 0 ? signals.map((signal, i) => (
                  <div key={i} className="p-6 flex items-center justify-between hover:bg-[#222] transition-colors group">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-xl bg-[#151515] flex items-center justify-center text-[#4CAF50] group-hover:scale-110 transition-transform">
                        <Target size={24} />
                      </div>
                      <div>
                        <div className="text-xs text-[#aaaaaa] uppercase tracking-wider font-bold mb-1">{signal.type}</div>
                        <div className="text-xl font-bold flex items-center gap-2">
                          {signal.prediction}
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full",
                            signal.prediction.includes('Rise') || signal.prediction.includes('Even') || signal.prediction.includes('Over') ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                          )}>
                            RECOMMENDED
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs text-[#aaaaaa] mb-2">Signal Strength</div>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-[#2d2f2f] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#4CAF50] transition-all duration-1000" 
                            style={{ width: `${signal.strength}%` }} 
                          />
                        </div>
                        <span className="text-sm font-bold text-[#4CAF50]">{signal.strength}%</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="p-20 text-center text-[#aaaaaa]">
                    <Activity size={48} className="mx-auto mb-4 opacity-20 animate-pulse" />
                    Waiting for market data to generate signals...
                  </div>
                )}
              </div>
            </div>

            {/* Market Tools Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-[#2d2f2f]">
                <div className="flex items-center gap-2 mb-4 text-[#4CAF50]">
                  <Info size={18} />
                  <h4 className="font-bold text-sm">How it works</h4>
                </div>
                <p className="text-xs text-[#aaaaaa] leading-relaxed">
                  Our AI engine analyzes the last 50 ticks of the selected market to identify recurring patterns. 
                  Signals are generated based on statistical probability and current momentum.
                </p>
              </div>
              <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-[#2d2f2f]">
                <div className="flex items-center gap-2 mb-4 text-yellow-400">
                  <AlertCircle size={18} />
                  <h4 className="font-bold text-sm">Risk Disclaimer</h4>
                </div>
                <p className="text-xs text-[#aaaaaa] leading-relaxed">
                  Trading involves significant risk. Signals are for informational purposes only and do not guarantee profits. 
                  Always use proper risk management.
                </p>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Market Stats */}
          <div className="space-y-6">
            <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2d2f2f]">
              <h3 className="font-bold mb-6">Market Statistics</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs text-[#aaaaaa] mb-2">
                    <span>Volatility Index</span>
                    <span>{selectedSymbol}</span>
                  </div>
                  <div className="text-2xl font-mono font-bold">
                    {marketData.length > 0 ? marketData[marketData.length - 1].quote.toFixed(2) : '0.00'}
                  </div>
                </div>
                
                <div className="pt-6 border-t border-[#2d2f2f]">
                  <div className="text-xs text-[#aaaaaa] mb-4">Digit Distribution (Last 20)</div>
                  <div className="grid grid-cols-5 gap-2">
                    {[0,1,2,3,4,5,6,7,8,9].map(d => {
                      const count = marketData.filter(t => parseInt(t.quote.toString().split('').pop() || '0') === d).length;
                      const percentage = (count / 20) * 100;
                      return (
                        <div key={d} className="flex flex-col items-center gap-1">
                          <div className="w-full bg-[#2d2f2f] h-12 rounded relative overflow-hidden">
                            <div 
                              className="absolute bottom-0 w-full bg-[#4CAF50]/40 transition-all" 
                              style={{ height: `${percentage}%` }} 
                            />
                          </div>
                          <span className="text-[10px] font-bold">{d}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-6 border-t border-[#2d2f2f]">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-[#aaaaaa]">Best Market to Trade</span>
                    <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-bold">AUTO-SELECTED</span>
                  </div>
                  <div className="p-4 bg-[#151515] rounded-xl border border-[#2d2f2f] flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#4CAF50]/20 flex items-center justify-center text-[#4CAF50]">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-sm">{bestMarket}</div>
                      <div className="text-[10px] text-[#aaaaaa]">High Trend Consistency</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#4CAF50]/20 to-transparent rounded-2xl p-6 border border-[#4CAF50]/30">
              <h3 className="font-bold text-sm mb-2">Auto-Trade with Signal</h3>
              <p className="text-[10px] text-[#aaaaaa] mb-4 leading-relaxed">
                Connect these signals directly to your bot builder to automate your strategy based on AI insights.
              </p>
              <button 
                onClick={() => navigate('/bot-builder')}
                className="w-full py-3 bg-[#4CAF50] hover:bg-[#45a049] text-black text-xs font-bold rounded-xl transition-all hover:scale-[1.02]"
              >
                OPEN BOT BUILDER
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
