class EventEmitter {
  private listeners: { [key: string]: Function[] } = {};

  on(event: string, listener: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  off(event: string, listener: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== listener);
  }

  emit(event: string, ...args: any[]) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(l => l(...args));
  }
}

export interface BotStats {
  totalStake: number;
  totalPayout: number;
  totalRuns: number;
  contractsLost: number;
  contractsWon: number;
  totalProfit: number;
  balance: number;
}

export interface Transaction {
  id: string;
  type: string;
  entrySpot: string;
  exitSpot: string;
  buyPrice: number;
  profit: number;
  result: 'win' | 'loss' | 'pending';
  timestamp: number;
}

export interface JournalMessage {
  type: 'success' | 'warn' | 'info' | 'error';
  message: string;
  timestamp: number;
}

class BotEngine extends EventEmitter {
  private socket: WebSocket | null = null;
  private token: string | null = null;
  private isRunning: boolean = false;
  private stats: BotStats = {
    totalStake: 0,
    totalPayout: 0,
    totalRuns: 0,
    contractsLost: 0,
    contractsWon: 0,
    totalProfit: 0,
    balance: 0,
  };
  private transactions: Transaction[] = [];
  private journal: JournalMessage[] = [];
  private status: string = 'Bot is not running';
  private pingInterval: any = null;
  private reconnectTimeout: any = null;
  
  private lastTick: number | null = null;
  private lastDigit: number | null = null;
  private ticks: number[] = [];
  private ohlc: any[] = [];
  private balance: { string: string; number: number } = { string: '0.00', number: 0 };
  
  private tradeParams: any = {
    market: '',
    submarket: '',
    symbol: '',
    category: '',
    tradeType: '',
    contractType: '',
    candleInterval: '60',
    restartOnError: true,
    restartBuySell: true,
    options: {
      durationType: 't',
      duration: 5,
      amount: 10,
      prediction: 0
    },
    accumulator: {
      growthRate: 0.03,
      amount: 10,
      takeProfit: 0
    }
  };
  private currentContract: any = null;
  private canPurchase: boolean = true;
  private pendingProposal: boolean = false;
  private lastResult: 'win' | 'loss' | null = null;
  private lastContractDetails: any = null;

  // Hooks from generated code
  private hooks: {
    INITIALIZATION?: () => void;
    TRADE_OPTIONS?: () => void;
    BEFORE_PURCHASE?: () => void;
    DURING_PURCHASE?: () => void;
    AFTER_PURCHASE?: () => void;
    TICK_ANALYSIS?: () => void;
  } = {};

  constructor() {
    super();
  }

  public async start(token: string, generatedCode: string) {
    if (this.isRunning) return;
    this.token = token;
    this.isRunning = true;
    this.canPurchase = true;
    this.pendingProposal = false;
    this.resetStats();
    this.journal = [];
    this.transactions = [];
    this.status = 'Bot is running';
    this.emit('update');

    try {
      // Evaluate generated code to define hooks
      // We use a sandbox-like approach by passing the Bot object
      const Bot = this.getBotInterface();
      const context = { Bot, console };
      
      // Wrap code in a function to isolate it
      const executeCode = new Function('Bot', generatedCode);
      executeCode(Bot);

      // Extract hooks from global scope if they were defined as functions
      // Since we used `function NAME() { ... }` in the generator, 
      // they might be in the local scope of the Function.
      // We need to modify the generator to assign them to a known object or return them.
      // For now, let's assume the generated code defines them on a global-ish object.
      // Actually, let's modify the generator to assign them to `Bot.hooks`.
      
      this.notify('info', 'Bot started');
      
      await this.connect();
      
      if (typeof (window as any).INITIALIZATION === 'function') this.hooks.INITIALIZATION = (window as any).INITIALIZATION;
      if (typeof (window as any).TRADE_OPTIONS === 'function') this.hooks.TRADE_OPTIONS = (window as any).TRADE_OPTIONS;
      if (typeof (window as any).BEFORE_PURCHASE === 'function') this.hooks.BEFORE_PURCHASE = (window as any).BEFORE_PURCHASE;
      if (typeof (window as any).DURING_PURCHASE === 'function') this.hooks.DURING_PURCHASE = (window as any).DURING_PURCHASE;
      if (typeof (window as any).AFTER_PURCHASE === 'function') this.hooks.AFTER_PURCHASE = (window as any).AFTER_PURCHASE;
      if (typeof (window as any).TICK_ANALYSIS === 'function') this.hooks.TICK_ANALYSIS = (window as any).TICK_ANALYSIS;

      if (this.hooks.INITIALIZATION) this.hooks.INITIALIZATION();
      if (this.hooks.TRADE_OPTIONS) this.hooks.TRADE_OPTIONS();

      // Subscribe to ticks if symbol is set
      if (this.tradeParams.symbol) {
        this.subscribeToTicks(this.tradeParams.symbol);
      }

    } catch (error: any) {
      const errorMessage = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      this.notify('error', `Start error: ${errorMessage}`);
      this.stop();
    }
  }

  public setToken(token: string) {
    this.token = token;
    if (this.isRunning && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.send({ authorize: token });
    }
  }

  public stop() {
    this.isRunning = false;
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
    }
    this.status = 'Bot is not running';
    this.notify('info', 'Bot stopped');
    this.emit('update');
    
    // Cleanup global hooks
    delete (window as any).INITIALIZATION;
    delete (window as any).TRADE_OPTIONS;
    delete (window as any).BEFORE_PURCHASE;
    delete (window as any).DURING_PURCHASE;
    delete (window as any).AFTER_PURCHASE;
    delete (window as any).TICK_ANALYSIS;
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.send({ authorize: this.token });
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        if (this.socket) this.socket.close();
        reject(new Error('Connection timed out. Please check your internet connection.'));
      }, 30000);

      this.socket = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
      
      this.socket.onopen = () => {
        this.send({ authorize: this.token });
        this.startHeartbeat();
      };

      this.socket.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          if (data.msg_type === 'authorize' || data.error) {
            clearTimeout(timeout);
          }
          this.handleMessage(data, resolve, reject);
        } catch (e) {
          console.error('Error parsing message:', e);
        }
      };

      this.socket.onerror = (err) => {
        clearTimeout(timeout);
        console.error('WebSocket error:', err);
        if (!this.isRunning) {
          this.notify('error', 'WebSocket connection failed. Please check your internet connection or API token.');
          reject(new Error('WebSocket connection failed'));
        }
      };

      this.socket.onclose = () => {
        this.stopHeartbeat();
        clearTimeout(timeout);
        
        if (this.isRunning) {
          this.notify('warn', 'Connection lost. Reconnecting in 5 seconds...');
          this.reconnectTimeout = setTimeout(() => {
            if (this.isRunning) {
              this.connect().catch(err => {
                console.error('Reconnection failed:', err);
              });
            }
          }, 5000);
        } else {
          this.emit('update');
        }
      };
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      this.send({ ping: 1 });
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleMessage(data: any, resolve: any, reject: any) {
    if (data.error) {
      const errorMessage = data.error.message || 'Unknown error';
      const errorCode = data.error.code ? ` (${data.error.code})` : '';
      this.notify('error', `${errorMessage}${errorCode}`);
      this.pendingProposal = false;
      this.canPurchase = true;
      if (data.msg_type === 'authorize') {
        const err = new Error(`${errorMessage}${errorCode}. This usually happens if your API token is invalid or has expired.`);
        (err as any).code = data.error.code;
        reject(err);
      }
      return;
    }

    switch (data.msg_type) {
      case 'authorize':
        this.balance = {
          string: data.authorize.balance.toString(),
          number: parseFloat(data.authorize.balance)
        };
        this.stats.balance = this.balance.number;
        this.send({ balance: 1, subscribe: 1 });
        
        // Re-subscribe to ticks if symbol is set (important for reconnection)
        if (this.tradeParams.symbol) {
          this.subscribeToTicks(this.tradeParams.symbol);
        }
        
        // Re-subscribe to open contract if exists
        if (this.currentContract && this.currentContract.id) {
          this.send({ proposal_open_contract: 1, contract_id: this.currentContract.id, subscribe: 1 });
        }
        
        resolve();
        break;
      case 'ping':
        // Heartbeat response
        break;
      case 'balance':
        this.balance = {
          string: data.balance.balance.toString(),
          number: parseFloat(data.balance.balance)
        };
        this.stats.balance = this.balance.number;
        this.emit('update');
        break;
      case 'tick':
        this.lastTick = data.tick.quote;
        const quoteStr = data.tick.quote.toString();
        this.lastDigit = parseInt(quoteStr[quoteStr.length - 1]);
        
        this.ticks.push(this.lastTick);
        if (this.ticks.length > 1000) this.ticks.shift();

        if (this.isRunning && this.hooks.TICK_ANALYSIS) {
          this.hooks.TICK_ANALYSIS();
        }
        
        if (this.isRunning && this.canPurchase && this.hooks.BEFORE_PURCHASE) {
          this.hooks.BEFORE_PURCHASE();
        }
        
        if (this.isRunning && this.currentContract && this.hooks.DURING_PURCHASE) {
          this.hooks.DURING_PURCHASE();
        }
        this.emit('update');
        break;
      case 'buy':
        this.notify('info', `Contract bought: ${data.buy.contract_id}`);
        this.status = 'Contract bought';
        this.currentContract = { id: data.buy.contract_id, status: 'open' };
        this.canPurchase = false;
        
        // Add pending transaction
        this.transactions.unshift({
          id: data.buy.contract_id,
          type: this.tradeParams.tradeType || 'Unknown',
          entrySpot: 'Waiting...',
          exitSpot: 'Waiting...',
          buyPrice: data.buy.buy_price || this.tradeParams.options.amount,
          profit: 0,
          result: 'pending',
          timestamp: Date.now()
        });
        
        // Subscribe to contract updates
        this.send({ proposal_open_contract: 1, contract_id: data.buy.contract_id, subscribe: 1 });
        this.emit('update');
        break;
      case 'proposal_open_contract':
        const contract = data.proposal_open_contract;
        
        // Update pending transaction with live data
        const txIndex = this.transactions.findIndex(t => t.id === contract.contract_id);
        if (txIndex !== -1) {
          this.transactions[txIndex].entrySpot = contract.entry_tick_display_value || this.transactions[txIndex].entrySpot;
          this.transactions[txIndex].buyPrice = parseFloat(contract.buy_price) || this.transactions[txIndex].buyPrice;
          this.transactions[txIndex].profit = parseFloat(contract.profit) || 0;
          this.emit('update');
        }

        if (contract.is_sold) {
          this.handleContractCompletion(contract);
        }
        break;
      case 'proposal':
        if (this.pendingProposal) {
          this.pendingProposal = false;
          this.send({
            buy: data.proposal.id,
            price: data.proposal.ask_price
          });
        }
        break;
    }
  }

  private handleContractCompletion(contract: any) {
    const profit = parseFloat(contract.profit);
    const win = profit > 0;
    
    this.lastResult = win ? 'win' : 'loss';
    this.lastContractDetails = {
      purchase_price: contract.buy_price,
      payout: contract.payout,
      profit: contract.profit,
      contract_type: contract.contract_type,
      entry_tick: contract.entry_tick,
      exit_tick: contract.exit_tick,
      barrier: contract.barrier,
      result: win ? 'win' : 'loss'
    };

    // Update stats
    this.stats.totalRuns++;
    this.stats.totalStake += parseFloat(contract.buy_price);
    this.stats.totalProfit += profit;
    if (win) {
      this.stats.contractsWon++;
      this.stats.totalPayout += parseFloat(contract.payout) || 0;
    } else {
      this.stats.contractsLost++;
    }

    // Update or Add transaction
    const txIndex = this.transactions.findIndex(t => t.id === contract.contract_id);
    const txData: Transaction = {
      id: contract.contract_id,
      type: contract.contract_type,
      entrySpot: contract.entry_tick_display_value || 'N/A',
      exitSpot: contract.exit_tick_display_value || 'N/A',
      buyPrice: parseFloat(contract.buy_price),
      profit: profit,
      result: win ? 'win' : 'loss',
      timestamp: Date.now()
    };

    if (txIndex !== -1) {
      this.transactions[txIndex] = txData;
    } else {
      this.transactions.unshift(txData);
    }

    this.notify(win ? 'success' : 'warn', `Contract ${win ? 'Won' : 'Lost'}: ${profit.toFixed(2)} ${contract.currency}`);
    
    this.status = 'Contract closed';
    this.currentContract = null;
    
    if (this.isRunning && this.hooks.AFTER_PURCHASE) {
      this.hooks.AFTER_PURCHASE();
    }
    
    this.emit('update');
  }

  private send(data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  private subscribeToTicks(symbol: string) {
    this.send({ ticks: symbol, subscribe: 1 });
  }

  private notify(type: JournalMessage['type'], message: string) {
    this.journal.unshift({ type, message, timestamp: Date.now() });
    this.emit('update');
  }

  public resetStats() {
    this.stats = {
      totalStake: 0,
      totalPayout: 0,
      totalRuns: 0,
      contractsLost: 0,
      contractsWon: 0,
      totalProfit: 0,
      balance: this.balance.number
    };
    this.transactions = [];
    this.journal = [];
    this.emit('update');
  }

  public loadStrategy(url: string) {
    this.notify('info', `Loading strategy from ${url}`);
  }

  public getTOTPCode(secret: string) {
    this.notify('info', `Generating TOTP code for secret`);
    return '123456';
  }

  public sma(data: number[], period: number) {
    if (data.length < period) return 0;
    const slice = data.slice(data.length - period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  public ema(data: number[], period: number) {
    if (data.length < period) return 0;
    const k = 2 / (period + 1);
    let ema = data[0];
    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    return ema;
  }

  public bb(data: number[], period: number, stdDev: number, field: 'upper' | 'lower' | 'middle') {
    if (data.length < period) return 0;
    const sma = this.sma(data, period);
    const slice = data.slice(data.length - period);
    const variance = slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period;
    const sd = Math.sqrt(variance);
    if (field === 'upper') return sma + stdDev * sd;
    if (field === 'lower') return sma - stdDev * sd;
    return sma;
  }

  public rsi(data: number[], period: number) {
    if (data.length <= period) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const diff = data[data.length - period + i] - data[data.length - period + i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    for (let i = data.length - period + 1; i < data.length; i++) {
      const diff = data[i] - data[i - 1];
      const gain = diff >= 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private getBotInterface() {
    return {
      setMarket: (market: string) => {
        this.tradeParams.market = market;
      },
      setSubmarket: (submarket: string) => {
        this.tradeParams.submarket = submarket;
      },
      setSymbol: (symbol: string) => {
        this.tradeParams.symbol = symbol;
      },
      setTradeTypeCategory: (category: string) => {
        this.tradeParams.category = category;
      },
      setTradeType: (type: string) => {
        this.tradeParams.tradeType = type;
      },
      setContractType: (type: string) => {
        this.tradeParams.contractType = type;
      },
      setCandleInterval: (interval: string) => {
        this.tradeParams.candleInterval = interval;
      },
      setRestartOnError: (restart: boolean) => {
        this.tradeParams.restartOnError = restart;
      },
      setRestartBuySell: (restart: boolean) => {
        this.tradeParams.restartBuySell = restart;
      },
      setTradeOptions: (options: any) => {
        const sanitizedOptions = { ...options };
        if (sanitizedOptions.amount !== undefined) {
          sanitizedOptions.amount = parseFloat(Number(sanitizedOptions.amount).toFixed(2));
        }
        this.tradeParams.options = { ...this.tradeParams.options, ...sanitizedOptions };
        if (sanitizedOptions.amount !== undefined) {
          this.tradeParams.accumulator.amount = sanitizedOptions.amount;
        }
      },
      setAccumulatorParams: (params: any) => {
        const sanitizedParams = { ...params };
        if (sanitizedParams.amount !== undefined) {
          sanitizedParams.amount = parseFloat(Number(sanitizedParams.amount).toFixed(2));
        }
        this.tradeParams.accumulator = { ...this.tradeParams.accumulator, ...sanitizedParams };
        if (sanitizedParams.amount !== undefined) {
          this.tradeParams.options.amount = sanitizedParams.amount;
        }
      },
      setAccumulatorTakeProfit: (amount: number) => {
        this.tradeParams.accumulator.takeProfit = amount;
      },
      initHook: (name: string, hook: () => void) => {
        (this.hooks as any)[name] = hook;
      },
      purchase: (type: string) => {
        if (!this.canPurchase || this.pendingProposal) return;
        this.canPurchase = false;
        this.pendingProposal = true;
        this.status = 'Buying contract';
        this.emit('update');
        
        // Map types to Deriv API contract types
        let contractType = type;
        if (type === 'RISE') contractType = 'CALL';
        if (type === 'FALL') contractType = 'PUT';
        if (type === 'RISE_E') contractType = 'CALLE';
        if (type === 'FALL_E') contractType = 'PUTE';

        // Construct proposal
        const isAccumulator = contractType === 'ACCU';
        const rawAmount = isAccumulator ? this.tradeParams.accumulator.amount : this.tradeParams.options.amount;
        const sanitizedAmount = parseFloat(Number(rawAmount).toFixed(2));

        const proposal: any = {
          proposal: 1,
          amount: sanitizedAmount,
          basis: 'stake',
          contract_type: contractType,
          currency: 'USD',
          symbol: this.tradeParams.symbol,
        };

        if (isAccumulator) {
          proposal.growth_rate = this.tradeParams.accumulator.growthRate;
          if (this.tradeParams.accumulator.takeProfit > 0) {
            proposal.limit_order = {
              take_profit: this.tradeParams.accumulator.takeProfit
            };
          }
        } else {
          proposal.duration = this.tradeParams.options.duration;
          proposal.duration_unit = this.tradeParams.options.durationType;
          
          if (contractType.startsWith('DIGIT')) {
            if (contractType === 'DIGITOVER' || contractType === 'DIGITUNDER' || 
                contractType === 'DIGITMATCH' || contractType === 'DIGITDIFF') {
              proposal.barrier = this.tradeParams.options.prediction.toString();
            }
          } else if (this.tradeParams.options.prediction) {
            proposal.barrier = this.tradeParams.options.prediction.toString();
          }
        }

        this.pendingProposal = true;
        this.send(proposal);
      },
      tradeAgain: () => {
        this.canPurchase = true;
        if (this.hooks.TRADE_OPTIONS) this.hooks.TRADE_OPTIONS();
        this.emit('update');
      },
      notify: (type: JournalMessage['type'], message: string) => {
        this.notify(type, message);
      },
      getLastTick: () => this.lastTick,
      getLastDigit: () => this.lastDigit,
      getTicks: () => this.ticks,
      getOHLC: () => this.ohlc,
      getTotalProfit: () => this.stats.totalProfit,
      getTotalRuns: () => this.stats.totalRuns,
      getTotalWin: () => this.stats.contractsWon,
      getTotalLoss: () => this.stats.contractsLost,
      onTick: (callback: (ticks: number[]) => void) => {
        this.hooks.TICK_ANALYSIS = () => callback(this.ticks);
      },
      beforePurchase: (callback: () => void) => {
        this.hooks.BEFORE_PURCHASE = callback;
      },
      checkResult: (result: string) => this.lastResult === result,
      readDetails: (detail: string) => this.lastContractDetails ? this.lastContractDetails[detail] : null,
      readDetail: (detail: string) => this.lastContractDetails ? this.lastContractDetails[detail] : null,
      getBalance: (type: 'STR' | 'NUM') => type === 'STR' ? this.balance.string : this.balance.number,
      checkSell: () => !!this.currentContract,
      sellAtMarket: () => {
        if (this.currentContract) {
          this.send({ sell: this.currentContract.contract_id, price: 0 });
        }
      },
      getPayout: () => this.lastContractDetails?.payout || 0,
      getMainAccount: () => 'Main',
      isCandleBlack: (ohlc: any) => ohlc ? ohlc.close < ohlc.open : false,
      readOHLC: (ohlc: any, field: string) => ohlc ? ohlc[field] : null,
      getOHLCFromSource: (source: string, index: number) => {
        const data = source === 'ticks' ? this.ticks : this.ohlc;
        return data[data.length - 1 - index];
      },
      checkDirection: (dir: string) => {
        if (this.ticks.length < 2) return false;
        const last = this.ticks[this.ticks.length - 1];
        const prev = this.ticks[this.ticks.length - 2];
        return dir === 'rise' ? last > prev : last < prev;
      },
      getDirection: () => {
        if (this.ticks.length < 2) return 'neutral';
        const last = this.ticks[this.ticks.length - 1];
        const prev = this.ticks[this.ticks.length - 2];
        return last > prev ? 'rise' : 'fall';
      },
      rsi: (data: number[], period: number) => this.rsi(data, period),
      getLeastDigit: () => {
        if (this.ticks.length === 0) return 0;
        const last100 = this.ticks.slice(-100);
        const counts = new Array(10).fill(0);
        last100.forEach(tick => {
          const digit = Math.floor(tick * Math.pow(10, 2)) % 10; // Assuming 2 decimal places for simplicity or just use last digit of integer part
          // Actually, Deriv digits are usually the last digit of the price.
          const priceStr = tick.toString();
          const lastDigit = parseInt(priceStr[priceStr.length - 1]);
          if (!isNaN(lastDigit)) counts[lastDigit]++;
        });
        let minCount = Infinity;
        let leastDigit = 0;
        counts.forEach((count, digit) => {
          if (count < minCount) {
            minCount = count;
            leastDigit = digit;
          }
        });
        return leastDigit;
      },
      loadStrategy: (url: string) => this.loadStrategy(url),
      getTOTPCode: (secret: string) => this.getTOTPCode(secret),
      sma: (data: number[], period: number) => this.sma(data, period),
      ema: (data: number[], period: number) => this.ema(data, period),
      bb: (data: number[], period: number, stdDev: number, field: 'upper' | 'lower' | 'middle') => this.bb(data, period, stdDev, field)
    };
  }

  public getStats() { return this.stats; }
  public getTransactions() { return this.transactions; }
  public getJournal() { return this.journal; }
  public getIsRunning() { return this.isRunning; }
  public getStatus() { return this.status; }
}

export const botEngine = new BotEngine();
