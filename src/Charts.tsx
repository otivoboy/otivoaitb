import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, HistogramData, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { 
  CandlestickChart, 
  LineChart as LucideLineChart, 
  AreaChart, 
  BarChart, 
  PieChart, 
  Pencil, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Camera,
  ChevronRight,
  Clock,
  Coins,
  Settings,
  Search
} from 'lucide-react';
import { cn } from './lib/utils';
import { generateDerivApiInstance, getToken } from './lib/deriv-api';

export default function Charts() {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
    const [currentSymbol, setCurrentSymbol] = useState('frxEURUSD');
    const [currentTimeframe, setCurrentTimeframe] = useState('1m');
    const [isLoading, setIsLoading] = useState(false);
    const apiRef = useRef<any>(null);
    const subscriptionRef = useRef<any>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { color: '#151717' },
                textColor: '#ffffff',
            },
            grid: {
                vertLines: { color: '#2d2f2f' },
                horzLines: { color: '#2d2f2f' },
            },
            crosshair: {
                mode: 1, // Normal
            },
            rightPriceScale: {
                borderColor: '#2d2f2f',
            },
            timeScale: {
                borderColor: '#2d2f2f',
                timeVisible: true,
                secondsVisible: false,
            },
        });

        chartRef.current = chart;

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#4CAF50',
            downColor: '#ff4d4f',
            borderDownColor: '#ff4d4f',
            borderUpColor: '#4CAF50',
            wickDownColor: '#ff4d4f',
            wickUpColor: '#4CAF50',
        });
        candleSeriesRef.current = candleSeries;

        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#6e7070',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '',
        });
        volumeSeriesRef.current = volumeSeries;

        volumeSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        });

        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            }
        };

        window.addEventListener('resize', handleResize);
        
        // Initialize API
        apiRef.current = generateDerivApiInstance();
        loadLiveData(currentSymbol, currentTimeframe);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
            }
            chartRef.current?.remove();
        };
    }, []);

    useEffect(() => {
        if (apiRef.current) {
            loadLiveData(currentSymbol, currentTimeframe);
        }
    }, [currentSymbol, currentTimeframe]);

    const loadLiveData = async (symbol: string, timeframe: string) => {
        if (!apiRef.current) return;
        setIsLoading(true);

        // Cleanup previous subscription
        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
        }

        const granularityMap: Record<string, number> = {
            '1m': 60,
            '5m': 300,
            '15m': 900,
            '30m': 1800,
            '1h': 3600,
            '4h': 14400,
            '1d': 86400,
            '1w': 604800,
        };

        const granularity = granularityMap[timeframe] || 60;

        try {
            const { token } = getToken();
            if (token) {
                await apiRef.current.send({ authorize: token });
            }

            const request = {
                ticks_history: symbol,
                adjust_start_time: 1,
                count: 1000,
                end: 'latest',
                start: 1,
                style: 'candles',
                granularity: granularity,
                subscribe: 1,
            };

            const observable = apiRef.current.subscribe(request);
            
            subscriptionRef.current = observable.subscribe(
                (response: any) => {
                    console.log('Deriv API Response:', response.msg_type, response);
                    if (response.error) {
                        console.error('Deriv API Error:', response.error);
                        return;
                    }

                    if (response.candles) {
                        console.log(`Received ${response.candles.length} candles for ${symbol}`);
                        const candlesData = response.candles.map((c: any) => ({
                            time: c.epoch as any,
                            open: parseFloat(c.open),
                            high: parseFloat(c.high),
                            low: parseFloat(c.low),
                            close: parseFloat(c.close),
                        }));
                        candleSeriesRef.current?.setData(candlesData);
                        
                        const volumesData = response.candles.map((c: any) => ({
                            time: c.epoch as any,
                            value: Math.random() * 100 + 50,
                            color: parseFloat(c.close) >= parseFloat(c.open) ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 77, 79, 0.5)',
                        }));
                        volumeSeriesRef.current?.setData(volumesData);
                        
                        chartRef.current?.timeScale().fitContent();
                        setIsLoading(false);
                    }

                    if (response.msg_type === 'ohlc' && response.ohlc.symbol === symbol) {
                        console.log('Received OHLC update:', response.ohlc);
                        const candle = response.ohlc;
                        const update = {
                            time: candle.open_time as any,
                            open: parseFloat(candle.open),
                            high: parseFloat(candle.high),
                            low: parseFloat(candle.low),
                            close: parseFloat(candle.close),
                        };
                        candleSeriesRef.current?.update(update);
                    }
                },
                (error: any) => {
                    console.error('Deriv API Subscription Error:', error);
                    setIsLoading(false);
                }
            );

        } catch (error) {
            console.error('Error loading live data:', error);
            setIsLoading(false);
        }
    };

    const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

  return (
    <div className="flex flex-col h-full bg-[#0e0e0e]">
      {/* Chart Controls */}
      <div className="flex justify-between px-5 py-2.5 bg-[#151717] border-b border-[#2d2f2f]">
        <div className="flex items-center gap-2.5">
          <button className="bg-[#2d2f2f] hover:bg-[#3d3f3f] text-white p-2 rounded text-sm transition-colors">
            <CandlestickChart size={18} />
          </button>
          <button className="bg-[#2d2f2f] hover:bg-[#3d3f3f] text-white p-2 rounded text-sm transition-colors">
            <LucideLineChart size={18} />
          </button>
          <button className="bg-[#2d2f2f] hover:bg-[#3d3f3f] text-white p-2 rounded text-sm transition-colors">
            <AreaChart size={18} />
          </button>
          <button className="bg-[#2d2f2f] hover:bg-[#3d3f3f] text-white p-2 rounded text-sm transition-colors">
            <BarChart size={18} />
          </button>
          <div className="w-px h-6 bg-[#2d2f2f] mx-1" />
          <button className="bg-[#2d2f2f] hover:bg-[#3d3f3f] text-white px-3 py-2 rounded text-sm flex items-center gap-1.5">
            <PieChart size={16} /> Indicators
          </button>
          <button className="bg-[#2d2f2f] hover:bg-[#3d3f3f] text-white px-3 py-2 rounded text-sm flex items-center gap-1.5">
            <Pencil size={16} /> Drawings
          </button>
        </div>
        <div className="flex gap-2.5">
          <button className="bg-[#2d2f2f] hover:bg-[#3d3f3f] text-white p-2 rounded text-sm">
            <ZoomIn size={18} />
          </button>
          <button className="bg-[#2d2f2f] hover:bg-[#3d3f3f] text-white p-2 rounded text-sm">
            <ZoomOut size={18} />
          </button>
          <button className="bg-[#2d2f2f] hover:bg-[#3d3f3f] text-white p-2 rounded text-sm">
            <Maximize size={18} />
          </button>
          <button className="bg-[#2d2f2f] hover:bg-[#3d3f3f] text-white p-2 rounded text-sm">
            <Camera size={18} />
          </button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Main Chart */}
        <div className="flex-1 relative bg-[#151717]">
          <div ref={chartContainerRef} className="absolute inset-0 w-full h-full" />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#151717]/50 z-10">
              <div className="w-10 h-10 border-4 border-[#4CAF50]/20 border-t-[#4CAF50] rounded-full animate-spin" />
            </div>
          )}
        </div>
        
        {/* Chart Sidebar */}
        <div className="w-[280px] bg-[#151717] border-l border-[#2d2f2f] flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-[#2d2f2f]">
            <div className="flex items-center gap-2 font-bold mb-4">
              <Clock size={16} className="text-[#4CAF50]" />
              Timeframe
            </div>
            <div className="grid grid-cols-3 gap-2">
              {timeframes.map((tf) => (
                <button 
                  key={tf}
                  onClick={() => setCurrentTimeframe(tf)}
                  className={cn(
                    "px-2 py-1.5 rounded text-xs transition-colors",
                    currentTimeframe === tf ? "bg-[#4CAF50] text-white" : "bg-[#2d2f2f] text-[#aaaaaa] hover:text-white"
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-4 border-b border-[#2d2f2f]">
            <div className="flex items-center gap-2 font-bold mb-4">
              <Coins size={16} className="text-[#4CAF50]" />
              Symbol
            </div>
            <div className="relative">
              <select 
                value={currentSymbol}
                onChange={(e) => setCurrentSymbol(e.target.value)}
                className="w-full bg-[#2d2f2f] border border-[#3d3f3f] rounded px-3 py-2 text-sm text-white focus:outline-none appearance-none"
              >
                <optgroup label="Forex">
                  <option value="frxEURUSD">EUR/USD</option>
                  <option value="frxGBPUSD">GBP/USD</option>
                  <option value="frxUSDJPY">USD/JPY</option>
                  <option value="frxAUDUSD">AUD/USD</option>
                  <option value="frxEURGBP">EUR/GBP</option>
                </optgroup>
                <optgroup label="Synthetic Indices">
                  <option value="R_10">Volatility 10 Index</option>
                  <option value="R_25">Volatility 25 Index</option>
                  <option value="R_50">Volatility 50 Index</option>
                  <option value="R_75">Volatility 75 Index</option>
                  <option value="R_100">Volatility 100 Index</option>
                  <option value="1HZ10V">Volatility 10 (1s) Index</option>
                  <option value="1HZ100V">Volatility 100 (1s) Index</option>
                  <option value="JD10">Jump 10 Index</option>
                  <option value="JD25">Jump 25 Index</option>
                  <option value="JD50">Jump 50 Index</option>
                </optgroup>
                <optgroup label="Commodities">
                  <option value="frxXAUUSD">Gold/USD</option>
                  <option value="frxXAGUSD">Silver/USD</option>
                  <option value="frxXPTUSD">Platinum/USD</option>
                </optgroup>
                <optgroup label="Cryptocurrencies">
                  <option value="cryBTCUSD">BTC/USD</option>
                  <option value="cryETHUSD">ETH/USD</option>
                  <option value="cryLTCUSD">LTC/USD</option>
                </optgroup>
              </select>
              <ChevronRight size={14} className="absolute right-3 top-3 text-[#aaaaaa] rotate-90 pointer-events-none" />
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-2 font-bold mb-4">
              <Settings size={16} className="text-[#4CAF50]" />
              Settings
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#aaaaaa] block mb-1.5">Theme</label>
                <select className="w-full bg-[#2d2f2f] border border-[#3d3f3f] rounded px-3 py-2 text-sm text-white focus:outline-none">
                  <option>Dark</option>
                  <option>Light</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[#aaaaaa] block mb-1.5">Price Scale</label>
                <select className="w-full bg-[#2d2f2f] border border-[#3d3f3f] rounded px-3 py-2 text-sm text-white focus:outline-none">
                  <option>Right</option>
                  <option>Left</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
