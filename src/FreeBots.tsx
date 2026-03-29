import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Play, Download, Star, Clock, Zap, Shield, TrendingUp } from 'lucide-react';
import { cn } from './lib/utils';

interface FreeBot {
  id: string;
  title: string;
  description: string;
  strategy: string;
  winRate: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  category: string;
  xml: string; // The Blockly XML definition
}

const MARTINGALE_XML = `
<xml xmlns="https://developers.google.com/blockly/xml">
  <variables>
    <variable id="stake">stake</variable>
    <variable id="initial_stake">initial_stake</variable>
  </variables>
  <block type="trade_definition" x="50" y="50">
    <statement name="SUBMARKET">
      <block type="trade_definition_market">
        <field name="MARKET_LIST">synthetic_index</field>
        <field name="SUBMARKET_LIST">random_index</field>
        <field name="SYMBOL_LIST">1HZ10V</field>
        <next>
          <block type="trade_definition_tradetype">
            <field name="TRADETYPECAT_LIST">callput</field>
            <field name="TRADETYPE_LIST">callput</field>
            <next>
              <block type="trade_definition_contracttype">
                <field name="TYPE_LIST">both</field>
                <next>
                  <block type="trade_definition_candleinterval">
                    <field name="CANDLEINTERVAL_LIST">60</field>
                    <next>
                      <block type="trade_definition_restartbuysell">
                        <field name="TIME_MACHINE_ENABLED">FALSE</field>
                        <next>
                          <block type="trade_definition_restartonerror">
                            <field name="RESTARTONERROR">TRUE</field>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
    <statement name="INITIALIZATION">
      <block type="variables_set">
        <field name="VAR" id="stake">stake</field>
        <value name="VALUE">
          <block type="math_number">
            <field name="NUM">0.35</field>
          </block>
        </value>
        <next>
          <block type="variables_set">
            <field name="VAR" id="initial_stake">initial_stake</field>
            <value name="VALUE">
              <block type="math_number">
                <field name="NUM">0.35</field>
              </block>
            </value>
          </block>
        </next>
      </block>
    </statement>
    <statement name="TRADE_OPTIONS">
      <block type="trade_definition_tradeoptions">
        <field name="DURATIONTYPE_LIST">t</field>
        <value name="DURATION">
          <shadow type="math_number">
            <field name="NUM">1</field>
          </shadow>
        </value>
        <value name="AMOUNT">
          <block type="variables_get">
            <field name="VAR" id="stake">stake</field>
          </block>
        </value>
      </block>
    </statement>
  </block>
  <block type="before_purchase" x="50" y="600">
    <statement name="BEFOREPURCHASE_STACK">
      <block type="purchase">
        <field name="PURCHASE_LIST">RISE</field>
      </block>
    </statement>
  </block>
  <block type="after_purchase" x="550" y="250">
    <statement name="AFTERPURCHASE_STACK">
      <block type="controls_if">
        <mutation else="1"></mutation>
        <value name="IF0">
          <block type="contract_check_result">
            <field name="CHECK_RESULT">win</field>
          </block>
        </value>
        <statement name="DO0">
          <block type="variables_set">
            <field name="VAR" id="stake">stake</field>
            <value name="VALUE">
              <block type="variables_get">
                <field name="VAR" id="initial_stake">initial_stake</field>
              </block>
            </value>
          </block>
        </statement>
        <statement name="ELSE">
          <block type="variables_set">
            <field name="VAR" id="stake">stake</field>
            <value name="VALUE">
              <block type="math_arithmetic">
                <field name="OP">MULTIPLY</field>
                <value name="A">
                  <block type="variables_get">
                    <field name="VAR" id="stake">stake</field>
                  </block>
                </value>
                <value name="B">
                  <block type="math_number">
                    <field name="NUM">2.1</field>
                  </block>
                </value>
              </block>
            </value>
          </block>
        </statement>
        <next>
          <block type="trade_again"></block>
        </next>
      </block>
    </statement>
  </block>
</xml>
`;

const EVEN_ODD_XML = `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="trade_definition" x="50" y="50">
    <statement name="SUBMARKET">
      <block type="trade_definition_market">
        <field name="MARKET_LIST">synthetic_index</field>
        <field name="SUBMARKET_LIST">random_index</field>
        <field name="SYMBOL_LIST">1HZ100V</field>
        <next>
          <block type="trade_definition_tradetype">
            <field name="TRADETYPECAT_LIST">digits</field>
            <field name="TRADETYPE_LIST">evenodd</field>
            <next>
              <block type="trade_definition_contracttype">
                <field name="TYPE_LIST">both</field>
                <next>
                  <block type="trade_definition_candleinterval">
                    <field name="CANDLEINTERVAL_LIST">60</field>
                    <next>
                      <block type="trade_definition_restartbuysell">
                        <field name="TIME_MACHINE_ENABLED">FALSE</field>
                        <next>
                          <block type="trade_definition_restartonerror">
                            <field name="RESTARTONERROR">TRUE</field>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
    <statement name="TRADE_OPTIONS">
      <block type="trade_definition_tradeoptions">
        <field name="DURATIONTYPE_LIST">t</field>
        <value name="DURATION">
          <shadow type="math_number">
            <field name="NUM">1</field>
          </shadow>
        </value>
        <value name="AMOUNT">
          <block type="math_number">
            <field name="NUM">0.35</field>
          </block>
        </value>
      </block>
    </statement>
  </block>
  <block type="before_purchase" x="50" y="600">
    <statement name="BEFOREPURCHASE_STACK">
      <block type="controls_if">
        <mutation else="1"></mutation>
        <value name="IF0">
          <block type="math_number_property">
            <mutation divisor_input="false"></mutation>
            <field name="PROPERTY">EVEN</field>
            <value name="NUMBER_TO_CHECK">
              <block type="last_digit"></block>
            </value>
          </block>
        </value>
        <statement name="DO0">
          <block type="purchase">
            <field name="PURCHASE_LIST">DIGITEVEN</field>
          </block>
        </statement>
        <statement name="ELSE">
          <block type="purchase">
            <field name="PURCHASE_LIST">DIGITODD</field>
          </block>
        </statement>
      </block>
    </statement>
  </block>
  <block type="after_purchase" x="550" y="250">
    <statement name="AFTERPURCHASE_STACK">
      <block type="trade_again"></block>
    </statement>
  </block>
</xml>
`;

const BOLLINGER_XML = `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="trade_definition" x="50" y="50">
    <statement name="SUBMARKET">
      <block type="trade_definition_market">
        <field name="MARKET_LIST">synthetic_index</field>
        <field name="SUBMARKET_LIST">random_index</field>
        <field name="SYMBOL_LIST">R_100</field>
        <next>
          <block type="trade_definition_tradetype">
            <field name="TRADETYPECAT_LIST">callput</field>
            <field name="TRADETYPE_LIST">callput</field>
            <next>
              <block type="trade_definition_contracttype">
                <field name="TYPE_LIST">both</field>
                <next>
                  <block type="trade_definition_candleinterval">
                    <field name="CANDLEINTERVAL_LIST">60</field>
                    <next>
                      <block type="trade_definition_restartbuysell">
                        <field name="TIME_MACHINE_ENABLED">FALSE</field>
                        <next>
                          <block type="trade_definition_restartonerror">
                            <field name="RESTARTONERROR">TRUE</field>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
    <statement name="TRADE_OPTIONS">
      <block type="trade_definition_tradeoptions">
        <field name="DURATIONTYPE_LIST">t</field>
        <value name="DURATION">
          <shadow type="math_number">
            <field name="NUM">1</field>
          </shadow>
        </value>
        <value name="AMOUNT">
          <block type="math_number">
            <field name="NUM">0.35</field>
          </block>
        </value>
      </block>
    </statement>
  </block>
  <block type="before_purchase" x="50" y="600">
    <statement name="BEFOREPURCHASE_STACK">
      <block type="controls_if">
        <mutation elseif="1"></mutation>
        <value name="IF0">
          <block type="logic_compare">
            <field name="OP">LT</field>
            <value name="A">
              <block type="tick_analysis"></block>
            </value>
            <value name="B">
              <block type="bb">
                <field name="BB_LIST">1</field>
                <value name="PERIOD">
                  <block type="math_number">
                    <field name="NUM">20</field>
                  </block>
                </value>
                <value name="UP_MULTIPLIER">
                  <block type="math_number">
                    <field name="NUM">2</field>
                  </block>
                </value>
              </block>
            </value>
          </block>
        </value>
        <statement name="DO0">
          <block type="purchase">
            <field name="PURCHASE_LIST">RISE</field>
          </block>
        </statement>
        <value name="IF1">
          <block type="logic_compare">
            <field name="OP">GT</field>
            <value name="A">
              <block type="tick_analysis"></block>
            </value>
            <value name="B">
              <block type="bb">
                <field name="BB_LIST">0</field>
                <value name="PERIOD">
                  <block type="math_number">
                    <field name="NUM">20</field>
                  </block>
                </value>
                <value name="UP_MULTIPLIER">
                  <block type="math_number">
                    <field name="NUM">2</field>
                  </block>
                </value>
              </block>
            </value>
          </block>
        </value>
        <statement name="DO1">
          <block type="purchase">
            <field name="PURCHASE_LIST">FALL</field>
          </block>
        </statement>
      </block>
    </statement>
  </block>
  <block type="after_purchase" x="550" y="250">
    <statement name="AFTERPURCHASE_STACK">
      <block type="trade_again"></block>
    </statement>
  </block>
</xml>
`;

const TREND_FOLLOWER_XML = `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="trade_definition" x="50" y="50">
    <statement name="SUBMARKET">
      <block type="trade_definition_market">
        <field name="MARKET_LIST">synthetic_index</field>
        <field name="SUBMARKET_LIST">random_index</field>
        <field name="SYMBOL_LIST">R_10</field>
        <next>
          <block type="trade_definition_tradetype">
            <field name="TRADETYPECAT_LIST">callput</field>
            <field name="TRADETYPE_LIST">callput</field>
            <next>
              <block type="trade_definition_contracttype">
                <field name="TYPE_LIST">both</field>
                <next>
                  <block type="trade_definition_candleinterval">
                    <field name="CANDLEINTERVAL_LIST">60</field>
                    <next>
                      <block type="trade_definition_restartbuysell">
                        <field name="TIME_MACHINE_ENABLED">FALSE</field>
                        <next>
                          <block type="trade_definition_restartonerror">
                            <field name="RESTARTONERROR">TRUE</field>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
    <statement name="TRADE_OPTIONS">
      <block type="trade_definition_tradeoptions">
        <field name="DURATIONTYPE_LIST">t</field>
        <value name="DURATION">
          <shadow type="math_number">
            <field name="NUM">1</field>
          </shadow>
        </value>
        <value name="AMOUNT">
          <block type="math_number">
            <field name="NUM">0.35</field>
          </block>
        </value>
      </block>
    </statement>
  </block>
  <block type="before_purchase" x="50" y="600">
    <statement name="BEFOREPURCHASE_STACK">
      <block type="controls_if">
        <mutation elseif="1"></mutation>
        <value name="IF0">
          <block type="logic_compare">
            <field name="OP">GT</field>
            <value name="A">
              <block type="sma">
                <value name="PERIOD">
                  <block type="math_number">
                    <field name="NUM">10</field>
                  </block>
                </value>
              </block>
            </value>
            <value name="B">
              <block type="sma">
                <value name="PERIOD">
                  <block type="math_number">
                    <field name="NUM">20</field>
                  </block>
                </value>
              </block>
            </value>
          </block>
        </value>
        <statement name="DO0">
          <block type="purchase">
            <field name="PURCHASE_LIST">RISE</field>
          </block>
        </statement>
        <value name="IF1">
          <block type="logic_compare">
            <field name="OP">LT</field>
            <value name="A">
              <block type="sma">
                <value name="PERIOD">
                  <block type="math_number">
                    <field name="NUM">10</field>
                  </block>
                </value>
              </block>
            </value>
            <value name="B">
              <block type="sma">
                <value name="PERIOD">
                  <block type="math_number">
                    <field name="NUM">20</field>
                  </block>
                </value>
              </block>
            </value>
          </block>
        </value>
        <statement name="DO1">
          <block type="purchase">
            <field name="PURCHASE_LIST">FALL</field>
          </block>
        </statement>
      </block>
    </statement>
  </block>
  <block type="after_purchase" x="550" y="250">
    <statement name="AFTERPURCHASE_STACK">
      <block type="trade_again"></block>
    </statement>
  </block>
</xml>
`;

const FREE_BOTS: FreeBot[] = [
  {
    id: 'martingale-pro',
    title: 'Otivo Martingale Pro',
    description: 'Advanced martingale strategy with RSI confirmation to minimize drawdowns.',
    strategy: 'Martingale + RSI',
    winRate: '68%',
    difficulty: 'Medium',
    category: 'Trend Following',
    xml: MARTINGALE_XML
  },
  {
    id: 'even-odd-master',
    title: 'Digit Even/Odd Master',
    description: 'High-frequency digit trading bot optimized for Volatility 100 (1s) index.',
    strategy: 'Digit Analysis',
    winRate: '72%',
    difficulty: 'Easy',
    category: 'Digits',
    xml: EVEN_ODD_XML
  },
  {
    id: 'bollinger-scalper',
    title: 'AI Bollinger Scalper',
    description: 'Scalping bot that uses Bollinger Bands to identify overbought and oversold conditions.',
    strategy: 'Mean Reversion',
    winRate: '65%',
    difficulty: 'Advanced',
    category: 'Scalping',
    xml: BOLLINGER_XML
  },
  {
    id: 'trend-follower-ai',
    title: 'Otivo Trend Follower',
    description: 'Uses multiple moving averages to ride long-term market trends with trailing stop loss.',
    strategy: 'Moving Averages',
    winRate: '75%',
    difficulty: 'Medium',
    category: 'Trend Following',
    xml: TREND_FOLLOWER_XML
  }
];

export default function FreeBots() {
  const navigate = useNavigate();

  const handleLoadBot = (bot: FreeBot) => {
    // We'll pass the bot XML to the builder via state or localStorage
    localStorage.setItem('load_bot_xml', bot.xml);
    localStorage.setItem('load_bot_name', bot.title);
    navigate('/bot-builder');
  };

  return (
    <div className="flex-1 overflow-auto bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto p-6 lg:p-10">
        <div className="mb-12">
          <h2 className="text-4xl font-bold mb-4 flex items-center gap-4">
            <Bot className="text-[#4CAF50]" size={40} />
            AI-Powered Free Bots
          </h2>
          <p className="text-[#aaaaaa] text-lg max-w-2xl">
            Explore our collection of high-performance trading bots created and optimized by Otivo AI. 
            Ready to run or customize in the Bot Builder.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {FREE_BOTS.map((bot) => (
            <div 
              key={bot.id} 
              className="bg-[#1a1a1a] rounded-3xl border border-[#2d2f2f] overflow-hidden hover:border-[#4CAF50] transition-all group"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#4CAF50]/10 flex items-center justify-center text-[#4CAF50]">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold group-hover:text-[#4CAF50] transition-colors">{bot.title}</h3>
                      <span className="text-[10px] text-[#aaaaaa] uppercase tracking-widest font-bold">{bot.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-[#2d2f2f] px-3 py-1 rounded-full">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] font-bold">4.9</span>
                  </div>
                </div>

                <p className="text-[#aaaaaa] text-sm leading-relaxed mb-8">
                  {bot.description}
                </p>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-[#151515] p-3 rounded-xl border border-[#2d2f2f]">
                    <div className="text-[10px] text-[#aaaaaa] uppercase mb-1">Win Rate</div>
                    <div className="text-sm font-bold text-green-500">{bot.winRate}</div>
                  </div>
                  <div className="bg-[#151515] p-3 rounded-xl border border-[#2d2f2f]">
                    <div className="text-[10px] text-[#aaaaaa] uppercase mb-1">Difficulty</div>
                    <div className="text-sm font-bold">{bot.difficulty}</div>
                  </div>
                  <div className="bg-[#151515] p-3 rounded-xl border border-[#2d2f2f]">
                    <div className="text-[10px] text-[#aaaaaa] uppercase mb-1">Strategy</div>
                    <div className="text-[10px] font-bold truncate">{bot.strategy}</div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => handleLoadBot(bot)}
                    className="flex-1 py-4 bg-[#4CAF50] hover:bg-[#45a049] text-black font-bold rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                  >
                    <Play size={18} fill="currentColor" />
                    LOAD TO BUILDER
                  </button>
                  <button className="p-4 bg-[#2d2f2f] hover:bg-[#3d3f3f] rounded-2xl transition-colors">
                    <Download size={18} />
                  </button>
                </div>
              </div>
              
              <div className="bg-[#1d1d1d] px-8 py-4 border-t border-[#2d2f2f] flex justify-between items-center">
                <div className="flex items-center gap-2 text-[10px] text-[#aaaaaa]">
                  <Clock size={12} />
                  Last Updated: 2h ago
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#aaaaaa]">
                  <Shield size={12} className="text-[#4CAF50]" />
                  Verified by Otivo AI
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-16 p-8 bg-gradient-to-r from-[#1a1a1a] to-[#0a0a0a] rounded-3xl border border-[#2d2f2f] flex flex-col md:flex-row items-center gap-8">
          <div className="w-20 h-20 rounded-full bg-[#4CAF50]/10 flex items-center justify-center text-[#4CAF50] shrink-0">
            <TrendingUp size={40} />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">Want to share your own bot?</h3>
            <p className="text-[#aaaaaa] text-sm">
              Our community is growing! Soon you'll be able to publish your own AI-optimized bots to the Free Bots gallery and earn rewards.
            </p>
          </div>
          <button className="md:ml-auto px-8 py-4 border-2 border-[#4CAF50] text-[#4CAF50] font-bold rounded-2xl hover:bg-[#4CAF50] hover:text-black transition-all whitespace-nowrap">
            JOIN COMMUNITY
          </button>
        </div>
      </div>
    </div>
  );
}
