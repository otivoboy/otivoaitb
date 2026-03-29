import React, { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Square, 
  Save, 
  FolderOpen, 
  Zap, 
  HelpCircle, 
  Settings, 
  ChevronRight,
  Search,
  Bell,
  Clock,
  MessageSquare,
  LayoutDashboard,
  Bot,
  LineChart,
  PieChart,
  Wrench,
  Layout,
  RotateCcw,
  Undo,
  Redo,
  Plus,
  Minus,
  Quote,
  RotateCw,
  X,
  Package,
  Download,
  Eye,
  TrendingUp,
  TrendingDown,
  Loader2,
  Activity
} from 'lucide-react';
import { cn } from './lib/utils';

import { javascriptGenerator } from 'blockly/javascript';
import { registerProcedureBlocks } from './lib/procedures';
import { botEngine, BotStats, Transaction, JournalMessage } from './lib/botEngine';
import AIAssistant from './components/AIAssistant';

const CONTRACT_ICONS: Record<string, React.ReactNode> = {
  'CALL': <TrendingUp size={14} />,
  'PUT': <TrendingDown size={14} />,
  'RISE': <TrendingUp size={14} />,
  'FALL': <TrendingDown size={14} />,
  'MATCH': <PieChart size={14} />,
  'DIFF': <PieChart size={14} className="rotate-45" />,
  'DIGITMATCH': <PieChart size={14} />,
  'DIGITDIFF': <PieChart size={14} className="rotate-45" />,
  'DIGITEVEN': <PieChart size={14} />,
  'DIGITODD': <PieChart size={14} />,
  'ACCU': <TrendingUp size={14} />,
};

export default function BotBuilder() {
  const blocklyDiv = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workspace = useRef<Blockly.WorkspaceSvg | null>(null);
  const [workspaceInstance, setWorkspaceInstance] = useState<Blockly.WorkspaceSvg | null>(null);
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [botStatus, setBotStatus] = useState('Bot is not running');
  const [progress, setProgress] = useState(0);
  const [isToolboxVisible, setIsToolboxVisible] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('summary');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [stats, setStats] = useState<BotStats>(botEngine.getStats());
  const [transactions, setTransactions] = useState<Transaction[]>(botEngine.getTransactions());
  const [journal, setJournal] = useState<JournalMessage[]>(botEngine.getJournal());
  const [isRunPanelOpen, setIsRunPanelOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 1024;

  useEffect(() => {
    if (isRunPanelOpen && isMobile) {
      setIsToolboxVisible(false);
      setIsAIAssistantOpen(false);
    }
  }, [isRunPanelOpen, isMobile]);

  useEffect(() => {
    if (isToolboxVisible && isMobile) {
      setIsRunPanelOpen(false);
      setIsAIAssistantOpen(false);
    }
  }, [isToolboxVisible, isMobile]);

  useEffect(() => {
    if (isAIAssistantOpen && isMobile) {
      setIsToolboxVisible(false);
      setIsRunPanelOpen(false);
    }
  }, [isAIAssistantOpen, isMobile]);

  useEffect(() => {
    const handleUpdate = () => {
      setStats({ ...botEngine.getStats() });
      setTransactions([...botEngine.getTransactions()]);
      setJournal([...botEngine.getJournal()]);
      setIsBotRunning(botEngine.getIsRunning());
      setBotStatus(botEngine.getStatus());
    };

    botEngine.on('update', handleUpdate);
    return () => {
      botEngine.off('update', handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (!isBotRunning) {
      setProgress(0);
      return;
    }

    if (botStatus === 'Buying contract') {
      setProgress(20);
      const interval = setInterval(() => {
        setProgress(prev => (prev < 40 ? prev + 1 : prev));
      }, 100);
      return () => clearInterval(interval);
    } else if (botStatus === 'Contract bought') {
      setProgress(40);
      const interval = setInterval(() => {
        setProgress(prev => (prev < 90 ? prev + 0.5 : prev));
      }, 200);
      return () => clearInterval(interval);
    } else if (botStatus === 'Contract closed') {
      setProgress(100);
      const timer = setTimeout(() => setProgress(0), 1500);
      return () => clearTimeout(timer);
    } else if (botStatus === 'Bot is running') {
      // Idle state, just a small pulse or low progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 15) return 10;
          return prev + 0.2;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [botStatus, isBotRunning]);

  const handleRunBot = async () => {
    if (isBotRunning) {
      botEngine.stop();
    } else {
      if (!workspace.current) return;
      try {
        const code = javascriptGenerator.workspaceToCode(workspace.current);
        console.log("Generated code:", code);
        
        const token = localStorage.getItem('deriv_api_token');
        if (!token) {
          alert('Please connect to Deriv first in the header.');
          return;
        }
        
        if (!code || code.trim() === '') {
          alert('The workspace is empty or no code was generated. Please ensure your blocks are connected to a "Trade parameters" block.');
          return;
        }

        await botEngine.start(token, code);
      } catch (error) {
        console.error("Code generation error:", error);
        alert("Failed to generate code from blocks. Error: " + (error as Error).message);
      }
    }
  };

  const handleSaveWorkspace = () => {
    if (!workspace.current) return;
    const xml = Blockly.Xml.workspaceToDom(workspace.current);
    const xmlText = Blockly.Xml.domToPrettyText(xml);
    const blob = new Blob([xmlText], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'otivo-strategy.xml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleZoomIn = () => {
    if (!workspace.current) return;
    workspace.current.zoom(0, 0, 1);
  };

  const handleZoomOut = () => {
    if (!workspace.current) return;
    workspace.current.zoom(0, 0, -1);
  };

  const handleResetZoom = () => {
    if (!workspace.current) return;
    workspace.current.setScale(1);
    workspace.current.scrollCenter();
  };

  const handleQuickStrategy = () => {
    alert('Quick Strategy feature coming soon! This will allow you to generate common strategies instantly.');
  };

  const handleTutorial = () => {
    window.open('https://deriv.com/bot-builder-tutorial', '_blank');
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const xmlText = e.target?.result as string;
      if (workspace.current && xmlText) {
        try {
          // Robust XML parsing
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, "text/xml");
          const xml = xmlDoc.documentElement;

          if (xml.tagName.toLowerCase() === 'xml' || xml.tagName.toLowerCase() === 'block') {
            workspace.current.clear();
            
            // Handle both full workspace XML and single block XML
            if (xml.tagName.toLowerCase() === 'block') {
              const newXml = Blockly.utils.xml.createElement('xml');
              newXml.appendChild(xml);
              Blockly.Xml.domToWorkspace(newXml, workspace.current);
            } else {
              // Ensure variables are created first
              const variables = xml.getElementsByTagName('variables')[0];
              if (variables) {
                Blockly.Xml.domToVariables(variables, workspace.current);
              }
              Blockly.Xml.domToWorkspace(xml, workspace.current);

              // Resolve any loader blocks
              const loaderBlocks = xml.getElementsByTagName('block');
              for (let i = 0; i < loaderBlocks.length; i++) {
                const block = loaderBlocks[i];
                if (block.getAttribute('type') === 'loader') {
                  const urlField = block.getElementsByTagName('field')[0];
                  if (urlField && urlField.getAttribute('name') === 'URL') {
                    const url = urlField.textContent;
                    if (url && url.startsWith('http')) {
                      try {
                        const response = await fetch(url);
                        const subText = await response.text();
                        const subXmlDoc = parser.parseFromString(subText, "text/xml");
                        const subXml = subXmlDoc.documentElement;
                        Blockly.Xml.appendDomToWorkspace(subXml, workspace.current);
                      } catch (err) {
                        console.error("Failed to load sub-strategy:", err);
                      }
                    }
                  }
                }
              }
            }
            
            // Ensure all blocks are rendered correctly
            setTimeout(() => {
              if (workspace.current) {
                workspace.current.getAllBlocks(false).forEach(block => {
                  if (block.initSvg) block.initSvg();
                  if (block.render) block.render();
                });
                Blockly.svgResize(workspace.current);
              }
            }, 100);
            
            console.log("XML imported successfully");
          } else {
            throw new Error("Invalid XML root element: " + xml.tagName);
          }
        } catch (err) {
          console.error("Error importing XML:", err);
          alert("Failed to import XML. Please ensure it is a valid Blockly XML file. Error: " + (err as Error).message);
        }
      }
    };
    reader.readAsText(file);
    // Reset input value to allow importing the same file again
    event.target.value = '';
  };

  useEffect(() => {
    if (!blocklyDiv.current) return;

    // Custom Block Definitions
    const riseIcon = {
      src: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDRMMjAgMTJIMTRWMTZIMTBWMTJINEwxMiA0WiIgZmlsbD0iZ3JlZW4iLz4KPC9zdmc+Cg==',
      width: 24,
      height: 24,
      alt: 'Rise',
    };
    const fallIcon = {
      src: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDIwTDQgMTJIMDBWOFgxNFYxMkwxMiAyMFoiIGZpbGw9InJlZCIvPgo8L3N2Zz4K',
      width: 24,
      height: 24,
      alt: 'Fall',
    };
    const matchIcon = {
      src: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iNCIgeT0iNCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iMiIgZmlsbD0iIzAwYTc5ZSIvPgo8cGF0aCBkPSJNOSAxMkwxMSAxNEwxNSAxMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+Cjwvc3ZnPg==',
      width: 24,
      height: 24,
      alt: 'Match',
    };
    const differIcon = {
      src: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iNCIgeT0iNCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iMiIgZmlsbD0iI2ZmNDQ0ZiIvPgo8cGF0aCBkPSJNOSA5TDE1IDE1TTkgMTVMMTUgOSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+Cjwvc3ZnPg==',
      width: 24,
      height: 24,
      alt: 'Differ',
    };
    const digitsIcon = {
      src: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHRleHQgeD0iNCIgeT0iMTgiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPjEyMzwvdGV4dD4KPC9zdmc+',
      width: 24,
      height: 24,
      alt: 'Digits',
    };
    const accumulatorIcon = {
      src: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQgMjBMMTAgMTRMMTQgMThMMjAgMTIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwYTc5ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPg==',
      width: 24,
      height: 24,
      alt: 'Accumulator',
    };

    Blockly.Blocks['trade'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Trade parameters (Legacy)");
        this.appendDummyInput()
            .appendField("Market:")
            .appendField(new Blockly.FieldDropdown([
              ["Synthetic Index", "synthetic_index"],
              ["Forex", "forex"],
              ["Indices", "indices"],
              ["Commodities", "commodities"]
            ]), "MARKET_LIST")
            .appendField("Submarket:")
            .appendField(new Blockly.FieldDropdown([
              ["Random Index", "random_index"]
            ]), "SUBMARKET_LIST")
            .appendField("Symbol:")
            .appendField(new Blockly.FieldDropdown([
              ["Volatility 10 (1s) Index", "1HZ10V"],
              ["Volatility 10 Index", "R_10"]
            ]), "SYMBOL_LIST");
        this.appendDummyInput()
            .appendField("Trade Type Category:")
            .appendField(new Blockly.FieldDropdown([
              ["Up/Down", "updown"],
              ["Digits", "digits"]
            ]), "TRADETYPECAT_LIST")
            .appendField("Trade Type:")
            .appendField(new Blockly.FieldDropdown([
              ["Rise/Fall", "risefall"],
              ["Match/Diff", "matchdiff"]
            ]), "TRADETYPE_LIST");
        this.appendDummyInput()
            .appendField("Contract Type:")
            .appendField(new Blockly.FieldDropdown([
              ["Both", "both"],
              ["Rise", "rise"],
              ["Fall", "fall"]
            ]), "TYPE_LIST")
            .appendField("Interval:")
            .appendField(new Blockly.FieldDropdown([
              ["1 minute", "60"],
              ["2 minutes", "120"],
              ["5 minutes", "300"]
            ]), "CANDLEINTERVAL_LIST");
        this.appendDummyInput()
            .appendField("Restart on Buy/Sell:")
            .appendField(new Blockly.FieldDropdown([
              ["Yes", "TRUE"],
              ["No", "FALSE"]
            ]), "TIME_MACHINE_ENABLED")
            .appendField("Restart on error:")
            .appendField(new Blockly.FieldDropdown([
              ["Yes", "TRUE"],
              ["No", "FALSE"]
            ]), "RESTARTONERROR");
        this.appendStatementInput("INITIALIZATION")
            .setCheck(null)
            .appendField("Run once at start:");
        this.setStyle('trade_parameters');
      }
    };

    Blockly.Blocks['trade_definition'] = {
      init: function() {
        this.appendDummyInput()
            .appendField(new (Blockly as any).FieldImage("https://img.icons8.com/material-rounded/24/ffffff/document.png", 16, 16, "*"))
            .appendField("1. Trade parameters");
        this.appendStatementInput("SUBMARKET").setCheck(null);
        this.appendDummyInput()
            .appendField("Run once at start:");
        this.appendStatementInput("INITIALIZATION").setCheck(null);
        this.appendDummyInput()
            .appendField("Trade options:");
        this.appendStatementInput("TRADE_OPTIONS").setCheck(null);
        this.setColour("#065f86");
        this.setTooltip("Define your trade parameters here.");
        this.setHelpUrl("");
      }
    };

    Blockly.Blocks['trade_definition_market'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Market:")
            .appendField(new Blockly.FieldDropdown([
              ["Derived", "synthetic_index"],
              ["Forex", "forex"],
              ["Indices", "indices"],
              ["Commodities", "commodities"]
            ]), "MARKET_LIST")
            .appendField(">")
            .appendField(new Blockly.FieldDropdown([
              ["Continuous Indices", "random_index"],
              ["Major Pairs", "major_pairs"],
              ["Asia/Oceania", "asia_oceania"]
            ]), "SUBMARKET_LIST")
            .appendField(">")
            .appendField(new Blockly.FieldDropdown([
              ["Volatility 10 (1s) Index", "1HZ10V"],
              ["Volatility 10 Index", "R_10"],
              ["Volatility 25 Index", "R_25"],
              ["Volatility 50 Index", "R_50"],
              ["Volatility 75 Index", "R_75"],
              ["Volatility 100 Index", "R_100"],
              ["Volatility 25 (1s) Index", "1HZ25V"],
              ["Volatility 50 (1s) Index", "1HZ50V"],
              ["Volatility 75 (1s) Index", "1HZ75V"],
              ["Volatility 100 (1s) Index", "1HZ100V"],
              ["Jump 10 Index", "Jump_10"],
              ["Jump 25 Index", "Jump_25"],
              ["Jump 50 Index", "Jump_50"],
              ["Jump 75 Index", "Jump_75"],
              ["Jump 100 Index", "Jump_100"],
              ["Bear Market Index", "R_100"],
              ["Bull Market Index", "R_10"]
            ]), "SYMBOL_LIST");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour("#d2d2d2");
      }
    };

    Blockly.Blocks['trade_definition_tradetype'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Trade Type:")
            .appendField(new Blockly.FieldDropdown([
              ["Up/Down", "callput"],
              ["Digits", "digits"],
              ["Accumulator", "accumulator"],
              ["In/Out", "staysinout"],
              ["Asian", "asian"]
            ]), "TRADETYPECAT_LIST")
            .appendField(">")
            .appendField(new Blockly.FieldDropdown([
              ["Rise/Fall", "callput"],
              ["Matches/Differs", "matchdiff"],
              ["Over/Under", "overunder"],
              ["Even/Odd", "evenodd"],
              ["Buy", "buy"]
            ]), "TRADETYPE_LIST");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour("#d2d2d2");
      }
    };

    Blockly.Blocks['trade_definition_contracttype'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Contract Type:")
            .appendField(new Blockly.FieldDropdown([
              ["Both", "both"],
              ["Buy", "buy"],
              ["Rise", "rise"],
              ["Fall", "fall"],
              ["Rise (Allow Equals)", "RISE_E"],
              ["Fall (Allow Equals)", "FALL_E"],
              ["Digit Under", "DIGITUNDER"],
              ["Digit Over", "DIGITOVER"],
              ["Digit Even", "DIGITEVEN"],
              ["Digit Odd", "DIGITODD"],
              ["Digit Match", "DIGITMATCH"],
              ["Digit Differ", "DIGITDIFF"],
              ["Accumulator", "ACCU"]
            ]), "TYPE_LIST");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour("#d2d2d2");
      }
    };

    Blockly.Blocks['trade_definition_candleinterval'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Default Candle Interval:")
            .appendField(new Blockly.FieldDropdown([["1 minute", "60"], ["2 minutes", "120"], ["5 minutes", "300"]]), "CANDLEINTERVAL_LIST");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour("#d2d2d2");
      }
    };

    Blockly.Blocks['trade_definition_tradeoptions'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Duration:")
            .appendField(new Blockly.FieldDropdown([["Ticks", "t"], ["Seconds", "s"], ["Minutes", "m"], ["Hours", "h"], ["Days", "d"]]), "DURATIONTYPE_LIST");
        this.appendValueInput("DURATION")
            .setCheck("Number");
        this.appendDummyInput()
            .appendField("Stake: USD");
        this.appendValueInput("AMOUNT")
            .setCheck("Number");
        this.appendDummyInput('STAKE_INFO')
            .appendField("(min: 0.35 - max: 50000)");
        this.appendDummyInput('PREDICTION_LABEL')
            .appendField("Prediction:");
        this.appendValueInput("PREDICTION")
            .setCheck("Number");
        this.getInput('PREDICTION_LABEL')?.setVisible(false);
        this.getInput('PREDICTION')?.setVisible(false);
        this.setInputsInline(true);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour("#d2d2d2");
      },
      onchange: function(event: any) {
        if (!this.workspace || this.workspace.isDragging() || (event.type !== Blockly.Events.BLOCK_MOVE && event.type !== Blockly.Events.BLOCK_CHANGE && event.type !== Blockly.Events.FINISHED_LOADING)) {
          return;
        }
        
        const allBlocks = this.workspace.getAllBlocks(false);
        const tradeTypeBlock = allBlocks.find((b: any) => b.type === 'trade_definition_tradetype');
        
        let showPrediction = false;
        if (tradeTypeBlock) {
          const tradeType = tradeTypeBlock.getFieldValue('TRADETYPE_LIST');
          showPrediction = (tradeType === 'matchdiff' || tradeType === 'overunder');
        }
        
        const predictionLabel = this.getInput('PREDICTION_LABEL');
        const predictionInput = this.getInput('PREDICTION');
        
        if (predictionLabel && predictionInput) {
          if (showPrediction) {
            predictionLabel.setVisible(true);
            predictionInput.setVisible(true);
          } else {
            predictionLabel.setVisible(false);
            predictionInput.setVisible(false);
          }
          if (this.rendered) {
            this.render();
          }
        }
      }
    };

    Blockly.Blocks['trade_definition_accumulator'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Accumulator parameters:");
        this.appendDummyInput()
            .appendField("Growth Rate:")
            .appendField(new Blockly.FieldDropdown([["1%", "0.01"], ["2%", "0.02"], ["3%", "0.03"], ["4%", "0.04"], ["5%", "0.05"]]), "GROWTH_RATE");
        this.appendValueInput("AMOUNT")
            .setCheck("Number")
            .appendField("Stake: USD");
        this.appendValueInput("TAKE_PROFIT")
            .setCheck("Number")
            .appendField("Take Profit: USD");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour("#d2d2d2");
      }
    };

    Blockly.Blocks['trade_definition_restartbuysell'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Restart buy/sell on error (disable for better performance):")
            .appendField(new Blockly.FieldCheckbox("FALSE"), "TIME_MACHINE_ENABLED");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour("#d2d2d2");
      }
    };

    Blockly.Blocks['trade_definition_restartonerror'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Restart last trade on error (bot ignores the unsuccessful trade):")
            .appendField(new Blockly.FieldCheckbox("TRUE"), "RESTARTONERROR");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour("#d2d2d2");
      }
    };

    Blockly.Blocks['math_number_positive'] = {
      init: function() {
        this.appendDummyInput()
            .appendField(new Blockly.FieldNumber(0, 0), "NUM");
        this.setOutput(true, "Number");
        this.setStyle('math_blocks');
      }
    };

    Blockly.Blocks['during_purchase'] = {
      init: function() {
        this.appendDummyInput()
            .appendField(new (Blockly as any).FieldImage("https://img.icons8.com/material-rounded/24/ffffff/money.png", 16, 16, "*"))
            .appendField("3. Sell conditions");
        this.appendStatementInput("DURING_PURCHASE_STACK").setCheck(null);
        this.setStyle('sell_conditions');
      }
    };

    Blockly.Blocks['check_sell'] = {
      init: function() {
        this.appendDummyInput().appendField("Sell is available");
        this.setOutput(true, "Boolean");
        this.setColour("#ffffff");
      }
    };

    Blockly.Blocks['sell_at_market'] = {
      init: function() {
        this.appendDummyInput().appendField("Sell at Market");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour("#ffffff");
      }
    };

    Blockly.Blocks['get_payout'] = {
      init: function() {
        this.appendDummyInput().appendField("Get Payout");
        this.setOutput(true, "Number");
        this.setColour("#ffffff");
      }
    };

    Blockly.Blocks['ticks'] = {
      init: function() {
        this.appendDummyInput().appendField("Ticks List");
        this.setOutput(true, "Array");
        this.setColour("#ffffff");
      }
    };

    Blockly.Blocks['last_tick'] = {
      init: function() {
        this.appendDummyInput().appendField("Last Tick");
        this.setOutput(true, "Number");
        this.setColour("#ffffff");
      }
    };

    Blockly.Blocks['ohlc'] = {
      init: function() {
        this.appendDummyInput().appendField("OHLC List");
        this.setOutput(true, "Array");
        this.setColour("#ffffff");
      }
    };

    Blockly.Blocks['total_runs'] = {
      init: function() {
        this.appendDummyInput().appendField("Total Runs");
        this.setOutput(true, "Number");
        this.setColour("#ffffff");
      }
    };

    Blockly.Blocks['total_win'] = {
      init: function() {
        this.appendDummyInput().appendField("Total Win");
        this.setOutput(true, "Number");
        this.setColour("#ffffff");
      }
    };

    Blockly.Blocks['total_loss'] = {
      init: function() {
        this.appendDummyInput().appendField("Total Loss");
        this.setOutput(true, "Number");
        this.setColour("#ffffff");
      }
    };

    Blockly.Blocks['main_account'] = {
      init: function() {
        this.appendDummyInput().appendField("Main Account");
        this.setOutput(true, "String");
        this.setColour("#ffffff");
      }
    };

    Blockly.Blocks['is_candle_black'] = {
      init: function() {
        this.appendDummyInput().appendField("Is Candle Black?");
        this.appendValueInput("OHLC").setCheck("Object").appendField("OHLC:");
        this.setOutput(true, "Boolean");
        this.setColour("#ffffff");
      }
    };

    Blockly.Blocks['read_ohlc'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Read OHLC:")
            .appendField(new Blockly.FieldDropdown([["Open", "open"], ["High", "high"], ["Low", "low"], ["Close", "close"]]), "OHLC_FIELD");
        this.appendValueInput("OHLC").setCheck("Object").appendField("OHLC:");
        this.setOutput(true, "Number");
        this.setColour("#ffffff");
      }
    };

    Blockly.Blocks['get_ohlc'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Get OHLC from")
            .appendField(new Blockly.FieldDropdown([["Ticks", "ticks"], ["Candles", "candles"]]), "SOURCE")
            .appendField("at index");
        this.appendValueInput("INDEX").setCheck("Number");
        this.setOutput(true, "Object");
        this.setColour("#ffffff");
      }
    };

    Blockly.Blocks['check_direction'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Check Direction")
            .appendField(new Blockly.FieldDropdown([["Rise", "rise"], ["Fall", "fall"]]), "DIRECTION");
        this.setOutput(true, "Boolean");
        this.setColour("#ffffff");
      }
    };

    Blockly.Blocks['direction'] = {
      init: function() {
        this.appendDummyInput().appendField("Direction");
        this.setOutput(true, "String");
        this.setColour("#ffffff");
      }
    };

    Blockly.Blocks['math_number_positive'] = {
      init: function() {
        this.appendDummyInput()
            .appendField(new Blockly.FieldNumber(0, 0), "NUM");
        this.setOutput(true, "Number");
        this.setColour("#ffffff");
      }
    };

    Blockly.Blocks['lists_create_with'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("set")
            .appendField(new Blockly.FieldVariable("list"), "VARIABLE")
            .appendField("to create list with");
        this.appendStatementInput("STACK")
            .setCheck("lists_statement");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(260);
      }
    };

    Blockly.Blocks['lists_statement'] = {
      init: function() {
        this.appendValueInput("VALUE")
            .setCheck(null);
        this.setPreviousStatement(true, "lists_statement");
        this.setNextStatement(true, "lists_statement");
        this.setColour(260);
      }
    };

    Blockly.Blocks['notify'] = {
      init: function() {
        this.appendValueInput("MESSAGE")
            .setCheck(null)
            .appendField("Notify")
            .appendField(new Blockly.FieldDropdown([["info", "info"], ["success", "success"], ["warn", "warn"], ["error", "error"]]), "NOTIFICATION_TYPE")
            .appendField("sound")
            .appendField(new Blockly.FieldDropdown([["silent", "silent"], ["announcement", "announcement"]]), "NOTIFICATION_SOUND");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour("#065f86");
      }
    };

    Blockly.Blocks['purchase'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Purchase")
            .appendField(new Blockly.FieldDropdown([["Rise", "RISE"], ["Fall", "FALL"], ["Digit Over", "DIGITOVER"], ["Digit Under", "DIGITUNDER"]]), "PURCHASE_LIST");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour("#4caf50");
      }
    };


    Blockly.Blocks['trade_again'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Trade again");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour("#4caf50");
      }
    };

    Blockly.Blocks['tick_analysis'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Tick Analysis Actions:");
        this.appendStatementInput("TICKANALYSIS_STACK")
            .setCheck(null);
        this.setColour("#065f86");
      }
    };

    Blockly.Blocks['ticks'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Ticks List");
        this.setOutput(true, "Array");
        this.setColour("#065f86");
      }
    };

    Blockly.Blocks['lists_getIndex'] = {
      init: function() {
        this.appendValueInput("VALUE")
            .setCheck("Array")
            .appendField("in list");
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([["get", "GET"]]), "MODE")
            .appendField(new Blockly.FieldDropdown([["#", "FROM_START"], ["from end", "FROM_END"]]), "WHERE");
        this.appendValueInput("AT")
            .setCheck("Number");
        this.setInputsInline(true);
        this.setOutput(true, null);
        this.setColour(260);
      }
    };

    Blockly.Blocks['math_random_int'] = {
      init: function() {
        this.appendValueInput("FROM")
            .setCheck("Number")
            .appendField("random integer from");
        this.appendValueInput("TO")
            .setCheck("Number")
            .appendField("to");
        this.setInputsInline(true);
        this.setOutput(true, "Number");
        this.setColour(230);
      }
    };

    Blockly.Blocks['text_statement'] = {
      init: function() {
        this.appendValueInput("TEXT")
            .setCheck(null);
        this.setPreviousStatement(true, "text_statement");
        this.setNextStatement(true, "text_statement");
        this.setColour(160);
      }
    };

    Blockly.Blocks['text_print'] = {
      init: function() {
        this.appendValueInput("TEXT")
            .setCheck(null)
            .appendField("print");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(160);
      }
    };

    Blockly.Blocks['text_join'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("create text with")
            .appendField(new Blockly.FieldVariable("text"), "VARIABLE");
        this.appendStatementInput("STACK")
            .setCheck("text_statement");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(160);
      }
    };

    Blockly.Blocks['before_purchase'] = {
      init: function() {
        this.appendDummyInput()
            .appendField(new (Blockly as any).FieldImage("https://img.icons8.com/material-rounded/24/ffffff/shopping-basket.png", 16, 16, "*"))
            .appendField("2. Purchase conditions");
        this.appendStatementInput("BEFOREPURCHASE_STACK").setCheck(null);
        this.setStyle('purchase_conditions');
      }
    };

    Blockly.Blocks['after_purchase'] = {
      init: function() {
        this.appendDummyInput()
            .appendField(new (Blockly as any).FieldImage("https://img.icons8.com/material-rounded/24/ffffff/finish-flag.png", 16, 16, "*"))
            .appendField("4. Restart trading conditions");
        this.appendStatementInput("AFTERPURCHASE_STACK").setCheck(null);
        this.setStyle('restart_trading');
      }
    };

    Blockly.Blocks['trade_again'] = {
      init: function() {
        this.appendDummyInput()
            .appendField(new (Blockly as any).FieldImage("https://img.icons8.com/material-rounded/24/ffffff/refresh.png", 16, 16, "*"))
            .appendField("Trade again");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setStyle('restart_trading');
      }
    };

    Blockly.Blocks['contract_check_result'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Check Contract Result")
            .appendField(new Blockly.FieldDropdown([["Win", "win"], ["Loss", "loss"]]), "CHECK_RESULT");
        this.setOutput(true, "Boolean");
        this.setColour(200);
      }
    };

    Blockly.Blocks['notify'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Notify")
            .appendField(new Blockly.FieldDropdown([["Success", "success"], ["Warning", "warn"], ["Info", "info"], ["Error", "error"]]), "NOTIFICATION_TYPE");
        this.appendValueInput("MESSAGE").setCheck("String").appendField("Message:");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour("#ffffff");
      }
    };

    Blockly.Blocks['read_details'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Read Detail:")
            .appendField(new Blockly.FieldDropdown([
              ["Purchase Price", "purchase_price"],
              ["Payout", "payout"],
              ["Profit", "profit"],
              ["Contract Type", "contract_type"],
              ["Entry Spot", "entry_tick"],
              ["Exit Spot", "exit_tick"],
              ["Barrier", "barrier"],
              ["Result", "result"]
            ]), "DETAIL_INDEX");
        this.setOutput(true, null);
        this.setColour(160);
        this.setTooltip("Read specific details from the last contract");
      }
    };

    Blockly.Blocks['purchase'] = {
      init: function() {
        this.appendDummyInput()
            .appendField(new (Blockly as any).FieldImage("https://img.icons8.com/material-rounded/24/ffffff/shopping-cart.png", 16, 16, "*"))
            .appendField("Purchase:")
            .appendField(new Blockly.FieldDropdown([
              [riseIcon, "RISE"],
              [fallIcon, "FALL"],
              [differIcon, "DIGITDIFF"],
              [matchIcon, "DIGITMATCH"],
              ["Over", "DIGITOVER"],
              ["Under", "DIGITUNDER"],
              ["Buy", "ACCU"],
              ["Even", "DIGITEVEN"],
              ["Odd", "DIGITODD"]
            ]), "PURCHASE_LIST");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setStyle('purchase_conditions');
      }
    };

    Blockly.Blocks['tick_analysis'] = {
      init: function() {
        this.appendDummyInput().appendField("Tick Analysis");
        this.appendStatementInput("TICKANALYSIS_STACK").setCheck(null).appendField("Actions:");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setStyle('analysis_blocks');
      }
    };

    Blockly.Blocks['last_digit'] = {
      init: function() {
        this.appendDummyInput().appendField("Last Digit");
        this.setOutput(true, "Number");
        this.setStyle('analysis_blocks');
      }
    };

    Blockly.Blocks['least_digit'] = {
      init: function() {
        this.appendDummyInput().appendField("Least Digit");
        this.setOutput(true, "Number");
        this.setStyle('analysis_blocks');
      }
    };

    Blockly.Blocks['balance'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Balance:")
            .appendField(new Blockly.FieldDropdown([["String", "STR"], ["Number", "NUM"]]), "BALANCE_TYPE");
        this.setOutput(true, null);
        this.setStyle('analysis_blocks');
      }
    };

    Blockly.Blocks['total_profit'] = {
      init: function() {
        this.appendDummyInput().appendField("Total Profit");
        this.setOutput(true, "Number");
        this.setStyle('analysis_blocks');
      }
    };

    Blockly.Blocks['rsi_statement'] = {
      init: function() {
        this.appendDummyInput().appendField("RSI Indicator");
        this.appendDummyInput()
            .appendField("Variable:")
            .appendField(new Blockly.FieldVariable("rsi"), "VARIABLE");
        this.appendStatementInput("STATEMENT").setCheck(null).appendField("Input:");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setStyle('analysis_blocks');
      }
    };

    Blockly.Blocks['input_list'] = {
      init: function() {
        this.appendValueInput("INPUT_LIST").setCheck("Array").appendField("Input List:");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(160);
      }
    };

    Blockly.Blocks['period'] = {
      init: function() {
        this.appendValueInput("PERIOD").setCheck("Number").appendField("Period:");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(160);
      }
    };

    Blockly.Blocks['tick'] = {
      init: function() {
        this.appendDummyInput().appendField("Current Tick");
        this.setOutput(true, "Number");
        this.setStyle('analysis_blocks');
      }
    };

    Blockly.Blocks['lists_create_with'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Create List with Variable:")
            .appendField(new Blockly.FieldVariable("list"), "VARIABLE");
        this.appendStatementInput("STACK").setCheck(null).appendField("Items:");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(260);
      }
    };

    Blockly.Blocks['text_join'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Join Text with Variable:")
            .appendField(new Blockly.FieldVariable("text"), "VARIABLE");
        this.appendStatementInput("STACK").setCheck(null).appendField("Items:");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(160);
      }
    };

    Blockly.Blocks['lists_statement'] = {
      init: function() {
        this.appendValueInput("VALUE").setCheck(null).appendField("Item:");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(260);
      }
    };

    Blockly.Blocks['lists_getIndex'] = {
      init: function() {
        this.appendValueInput("VALUE").setCheck("Array").appendField("in list");
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([["get", "GET"], ["get and remove", "GET_REMOVE"], ["remove", "REMOVE"]]), "MODE")
            .appendField(new Blockly.FieldDropdown([["from start", "FROM_START"], ["from end", "FROM_END"], ["first", "FIRST"], ["last", "LAST"], ["random", "RANDOM"]]), "WHERE");
        this.setOutput(true);
        this.setColour(260);
        this.setInputsInline(true);
      },
      mutationToDom: function() {
        const container = Blockly.utils.xml.createElement('mutation');
        const isStatement = !this.outputConnection;
        container.setAttribute('statement', isStatement.toString());
        const isAt = !!this.getInput('AT');
        container.setAttribute('at', isAt.toString());
        return container;
      },
      domToMutation: function(xmlElement: Element) {
        const isStatement = xmlElement.getAttribute('statement') === 'true';
        const isAt = xmlElement.getAttribute('at') !== 'false';
        this.updateShape_(isStatement, isAt);
      },
      updateShape_: function(isStatement: boolean, isAt: boolean) {
        if (isAt) {
          if (!this.getInput('AT')) {
            this.appendValueInput('AT').setCheck('Number');
          }
        } else {
          if (this.getInput('AT')) {
            this.removeInput('AT');
          }
        }
        
        if (isStatement) {
          this.setOutput(false);
          this.setPreviousStatement(true);
          this.setNextStatement(true);
        } else {
          this.setOutput(true);
          this.setPreviousStatement(false);
          this.setNextStatement(false);
        }
      }
    };

    Blockly.Blocks['lists_setIndex'] = {
      init: function() {
        this.appendValueInput("LIST").setCheck("Array").appendField("in list");
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([["set", "SET"], ["insert at", "INSERT"]]), "MODE")
            .appendField(new Blockly.FieldDropdown([["from start", "FROM_START"], ["from end", "FROM_END"], ["first", "FIRST"], ["last", "LAST"], ["random", "RANDOM"]]), "WHERE");
        this.appendValueInput("TO").appendField("as");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(260);
        this.setInputsInline(true);
      },
      mutationToDom: function() {
        const container = Blockly.utils.xml.createElement('mutation');
        const isAt = !!this.getInput('AT');
        container.setAttribute('at', isAt.toString());
        return container;
      },
      domToMutation: function(xmlElement: Element) {
        const isAt = xmlElement.getAttribute('at') !== 'false';
        this.updateShape_(isAt);
      },
      updateShape_: function(isAt: boolean) {
        if (isAt) {
          if (!this.getInput('AT')) {
            this.appendValueInput('AT').setCheck('Number');
            this.moveInputBefore('AT', 'TO');
          }
        } else {
          if (this.getInput('AT')) {
            this.removeInput('AT');
          }
        }
      }
    };

    Blockly.Blocks['lists_length'] = {
      init: function() {
        this.appendValueInput("VALUE").setCheck("Array").appendField("length of");
        this.setOutput(true, "Number");
        this.setColour(260);
      }
    };

    Blockly.Blocks['lists_create_empty'] = {
      init: function() {
        this.appendDummyInput().appendField("create empty list");
        this.setOutput(true, "Array");
        this.setColour(260);
      }
    };

    Blockly.Blocks['math_constant'] = {
      init: function() {
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([["\u03c0", "PI"], ["e", "E"], ["\u03c6", "GOLDEN_RATIO"], ["sqrt(2)", "SQRT2"], ["sqrt(\u00bd)", "SQRT1_2"], ["\u221e", "INFINITY"]]), "CONSTANT");
        this.setOutput(true, "Number");
        this.setColour(230);
      }
    };

    Blockly.Blocks['math_random_float'] = {
      init: function() {
        this.appendDummyInput().appendField("random fraction");
        this.setOutput(true, "Number");
        this.setColour(230);
      }
    };

    Blockly.Blocks['text_statement'] = {
      init: function() {
        this.appendValueInput("TEXT").setCheck("String").appendField("Text:");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(160);
      }
    };

    Blockly.Blocks['text_print'] = {
      init: function() {
        this.appendValueInput("TEXT").setCheck(null).appendField("Print:");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(160);
      }
    };

    Blockly.Blocks['text_prompt_ext'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Prompt for")
            .appendField(new Blockly.FieldDropdown([["Text", "TEXT"], ["Number", "NUMBER"]]), "TYPE");
        this.appendValueInput("TEXT").setCheck("String").appendField("Message:");
        this.setOutput(true, null);
        this.setColour(160);
      }
    };

    Blockly.Blocks['math_random_int'] = {
      init: function() {
        this.appendValueInput("FROM").setCheck("Number").appendField("Random Integer from:");
        this.appendValueInput("TO").setCheck("Number").appendField("to:");
        this.setOutput(true, "Number");
        this.setColour(230);
      }
    };

    Blockly.Blocks['math_round'] = {
      init: function() {
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([["Round", "ROUND"], ["Round Up", "ROUNDUP"], ["Round Down", "ROUNDDOWN"]]), "OP");
        this.appendValueInput("NUM").setCheck("Number");
        this.setOutput(true, "Number");
        this.setColour(230);
      }
    };

    Blockly.Blocks['math_number_property'] = {
      init: function() {
        this.appendValueInput("NUMBER_TO_CHECK").setCheck("Number");
        this.appendDummyInput()
            .appendField("is")
            .appendField(new Blockly.FieldDropdown([
              ["Even", "EVEN"], ["Odd", "ODD"], ["Prime", "PRIME"], ["Whole", "WHOLE"],
              ["Positive", "POSITIVE"], ["Negative", "NEGATIVE"], ["Divisible By", "DIVISIBLE_BY"]
            ]), "PROPERTY");
        this.setOutput(true, "Boolean");
        this.setColour(230);
      }
    };

    Blockly.Blocks['math_single'] = {
      init: function() {
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([
              ["Square Root", "ROOT"], ["Absolute", "ABS"], ["Negate", "NEG"],
              ["Natural Log", "LN"], ["Log 10", "LOG10"], ["Exp", "EXP"], ["10^", "POW10"]
            ]), "OP");
        this.appendValueInput("NUM").setCheck("Number");
        this.setOutput(true, "Number");
        this.setColour(230);
      }
    };

    Blockly.Blocks['logic_ternary'] = {
      init: function() {
        this.appendValueInput("IF").setCheck("Boolean").appendField("Test:");
        this.appendValueInput("THEN").setCheck(null).appendField("If True:");
        this.appendValueInput("ELSE").setCheck(null).appendField("If False:");
        this.setOutput(true, null);
        this.setColour(210);
      }
    };

    Blockly.Blocks['math_change'] = {
      init: function() {
        this.appendValueInput("DELTA")
            .setCheck("Number")
            .appendField("Change")
            .appendField(new Blockly.FieldVariable("item"), "VAR")
            .appendField("by");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(230);
      }
    };

    Blockly.Blocks['logic_boolean'] = {
      init: function() {
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([["True", "TRUE"], ["False", "FALSE"]]), "BOOL");
        this.setOutput(true, "Boolean");
        this.setColour(210);
      }
    };

    Blockly.Blocks['variables_set'] = {
      init: function() {
        this.appendValueInput("VALUE")
            .appendField("Set")
            .appendField(new Blockly.FieldVariable("item"), "VAR")
            .appendField("to");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(330);
      }
    };

    Blockly.Blocks['variables_get'] = {
      init: function() {
        this.appendDummyInput()
            .appendField(new Blockly.FieldVariable("item"), "VAR");
        this.setOutput(true, null);
        this.setColour(330);
      }
    };

    Blockly.Blocks['math_number'] = {
      init: function() {
        this.appendDummyInput()
            .appendField(new Blockly.FieldNumber(0), "NUM");
        this.setOutput(true, "Number");
        this.setColour("#ffffff");
      }
    };

    Blockly.Blocks['text'] = {
      init: function() {
        this.appendDummyInput()
            .appendField(new Blockly.FieldTextInput(""), "TEXT");
        this.setOutput(true, "String");
        this.setColour(160);
      }
    };

    Blockly.Blocks['logic_compare'] = {
      init: function() {
        this.appendValueInput("A");
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([["=", "EQ"], ["\u2260", "NEQ"], ["<", "LT"], ["\u2264", "LTE"], [">", "GT"], ["\u2265", "GTE"]]), "OP");
        this.appendValueInput("B");
        this.setInputsInline(true);
        this.setOutput(true, "Boolean");
        this.setColour(210);
      }
    };

    Blockly.Blocks['math_on_list'] = {
      init: function() {
        this.appendValueInput("LIST").setCheck("Array").appendField(new Blockly.FieldDropdown([["sum", "SUM"], ["min", "MIN"], ["max", "MAX"], ["average", "AVERAGE"], ["median", "MEDIAN"], ["mode", "MODE"], ["standard deviation", "STD_DEV"], ["random item", "RANDOM"]]), "OP").appendField("of list");
        this.setOutput(true, "Number");
        this.setColour(230);
      }
    };

    Blockly.Blocks['math_arithmetic'] = {
      init: function() {
        this.appendValueInput("A").setCheck("Number");
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([["+", "ADD"], ["-", "MINUS"], ["*", "MULTIPLY"], ["/", "DIVIDE"], ["^", "POWER"]]), "OP");
        this.appendValueInput("B").setCheck("Number");
        this.setInputsInline(true);
        this.setOutput(true, "Number");
        this.setColour(230);
      }
    };

    Blockly.Blocks['logic_null'] = {
      init: function() {
        this.appendDummyInput().appendField("null");
        this.setOutput(true, null);
        this.setColour(210);
      }
    };

    Blockly.Blocks['logic_negate'] = {
      init: function() {
        this.appendValueInput("BOOL").setCheck("Boolean").appendField("not");
        this.setOutput(true, "Boolean");
        this.setColour(210);
      }
    };

    Blockly.Blocks['logic_operation'] = {
      init: function() {
        this.appendValueInput("A").setCheck("Boolean");
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([["and", "AND"], ["or", "OR"]]), "OP");
        this.appendValueInput("B").setCheck("Boolean");
        this.setInputsInline(true);
        this.setOutput(true, "Boolean");
        this.setColour(210);
      }
    };

    Blockly.Blocks['controls_whileUntil'] = {
      init: function() {
        this.appendValueInput("BOOL").setCheck("Boolean").appendField("repeat");
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([["while", "WHILE"], ["until", "UNTIL"]]), "MODE");
        this.appendStatementInput("DO").appendField("do");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(120);
      }
    };

    Blockly.Blocks['controls_for'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("count with")
            .appendField(new Blockly.FieldVariable("i"), "VAR")
            .appendField("from");
        this.appendValueInput("FROM").setCheck("Number");
        this.appendValueInput("TO").setCheck("Number").appendField("to");
        this.appendValueInput("BY").setCheck("Number").appendField("by");
        this.appendStatementInput("DO").appendField("do");
        this.setInputsInline(true);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(120);
      }
    };

    Blockly.Blocks['controls_forEach'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("for each item")
            .appendField(new Blockly.FieldVariable("j"), "VAR")
            .appendField("in list");
        this.appendValueInput("LIST").setCheck("Array");
        this.appendStatementInput("DO").appendField("do");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(120);
      }
    };

    Blockly.Blocks['controls_flow_statements'] = {
      init: function() {
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([["break out of loop", "BREAK"], ["continue with next iteration", "CONTINUE"]]), "FLOW");
        this.setPreviousStatement(true);
        this.setColour(120);
      }
    };

    // Advanced procedure blocks are registered via registerProcedureBlocks(Blockly)

    Blockly.Blocks['sma'] = {
      init: function() {
        this.appendValueInput("INPUT").setCheck("Array").appendField("SMA Input:");
        this.appendValueInput("PERIOD").setCheck("Number").appendField("Period:");
        this.setOutput(true, "Number");
        this.setStyle('analysis_blocks');
      }
    };

    Blockly.Blocks['ema'] = {
      init: function() {
        this.appendValueInput("INPUT").setCheck("Array").appendField("EMA Input:");
        this.appendValueInput("PERIOD").setCheck("Number").appendField("Period:");
        this.setOutput(true, "Number");
        this.setStyle('analysis_blocks');
      }
    };

    Blockly.Blocks['bb'] = {
      init: function() {
        this.appendValueInput("INPUT").setCheck("Array").appendField("Bollinger Bands Input:");
        this.appendValueInput("PERIOD").setCheck("Number").appendField("Period:");
        this.appendValueInput("UPPER").setCheck("Number").appendField("Std Dev:");
        this.appendDummyInput()
            .appendField("Field:")
            .appendField(new Blockly.FieldDropdown([["Upper", "0"], ["Middle", "1"], ["Lower", "2"]]), "BB_FIELD");
        this.setOutput(true, "Number");
        this.setStyle('analysis_blocks');
      }
    };

    Blockly.Blocks['timeout'] = {
      init: function() {
        this.appendValueInput("SECONDS").setCheck("Number").appendField("Wait");
        this.appendDummyInput().appendField("seconds");
        this.appendStatementInput("STACK").appendField("then do");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(120);
      }
    };

    Blockly.Blocks['loader'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Load Strategy from URL:")
            .appendField(new Blockly.FieldTextInput("https://..."), "URL");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(290);
      }
    };

    Blockly.Blocks['totp_code'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("TOTP Code for Secret:")
            .appendField(new Blockly.FieldTextInput(""), "SECRET");
        this.setOutput(true, "String");
        this.setColour("#ffffff");
      }
    };

    Blockly.Blocks['is_replace_variable'] = {
      init: function() {
        this.appendDummyInput()
            .appendField("Replace Variable")
            .appendField(new Blockly.FieldVariable("item"), "VAR")
            .appendField("with")
            .appendField(new Blockly.FieldVariable("item2"), "VAR2");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(330);
      }
    };

    registerProcedureBlocks(Blockly);

    // Custom Block Generators
    (javascriptGenerator as any).forBlock['trade_definition'] = function(block: Blockly.Block) {
      const tradeOptions = (javascriptGenerator as any).statementToCode(block, 'TRADE_OPTIONS');
      const submarket = (javascriptGenerator as any).statementToCode(block, 'SUBMARKET');
      const initialization = (javascriptGenerator as any).statementToCode(block, 'INITIALIZATION');
      
      return `
        window.INITIALIZATION = async function() {
          ${initialization}
        };
        window.TRADE_OPTIONS = async function() {
          ${submarket}
          ${tradeOptions}
        };
      `;
    };

    (javascriptGenerator as any).forBlock['trade_definition_market'] = function(block: Blockly.Block) {
      const market = block.getFieldValue('MARKET_LIST');
      const submarket = block.getFieldValue('SUBMARKET_LIST');
      const symbol = block.getFieldValue('SYMBOL_LIST');
      return `Bot.setMarket('${market}');\nBot.setSubmarket('${submarket}');\nBot.setSymbol('${symbol}');\n`;
    };

    (javascriptGenerator as any).forBlock['trade_definition_tradetype'] = function(block: Blockly.Block) {
      const category = block.getFieldValue('TRADETYPECAT_LIST');
      const type = block.getFieldValue('TRADETYPE_LIST');
      return `Bot.setTradeTypeCategory('${category}');\nBot.setTradeType('${type}');\n`;
    };

    (javascriptGenerator as any).forBlock['trade_definition_contracttype'] = function(block: Blockly.Block) {
      const type = block.getFieldValue('TYPE_LIST');
      return `Bot.setContractType('${type}');\n`;
    };

    (javascriptGenerator as any).forBlock['trade_definition_candleinterval'] = function(block: Blockly.Block) {
      const interval = block.getFieldValue('CANDLEINTERVAL_LIST');
      return `Bot.setCandleInterval('${interval}');\n`;
    };

    (javascriptGenerator as any).forBlock['trade_definition_restartonerror'] = function(block: Blockly.Block) {
      const restart = block.getFieldValue('RESTARTONERROR') === 'TRUE';
      return `Bot.setRestartOnError(${restart});\n`;
    };

    (javascriptGenerator as any).forBlock['math_number_positive'] = function(block: any) {
      return [block.getFieldValue('NUM'), (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['lists_create_with'] = function(block: any) {
      const variable = (javascriptGenerator as any).nameDB_.getName(block.getFieldValue('VARIABLE'), (Blockly as any).VARIABLE_CATEGORY_NAME);
      const stack = (javascriptGenerator as any).statementToCode(block, 'STACK');
      return `${variable} = [${stack.split(',\n').filter((s: string) => s.trim()).join(', ')}];\n`;
    };

    (javascriptGenerator as any).forBlock['lists_statement'] = function(block: any) {
      const value = (javascriptGenerator as any).valueToCode(block, 'VALUE', (javascriptGenerator as any).ORDER_NONE) || 'null';
      return value + ',\n';
    };

    (javascriptGenerator as any).forBlock['notify'] = function(block: any) {
      const type = block.getFieldValue('NOTIFICATION_TYPE');
      const sound = block.getFieldValue('NOTIFICATION_SOUND');
      const message = (javascriptGenerator as any).valueToCode(block, 'MESSAGE', (javascriptGenerator as any).ORDER_NONE) || '""';
      return `Bot.notify({ type: "${type}", sound: "${sound}", message: ${message} });\n`;
    };

    (javascriptGenerator as any).forBlock['purchase'] = function(block: any) {
      const purchaseType = block.getFieldValue('PURCHASE_LIST');
      return `Bot.purchase("${purchaseType}");\n`;
    };


    (javascriptGenerator as any).forBlock['trade_again'] = function(block: any) {
      return `Bot.tradeAgain();\n`;
    };

    (javascriptGenerator as any).forBlock['tick_analysis'] = function(block: any) {
      const stack = (javascriptGenerator as any).statementToCode(block, 'TICKANALYSIS_STACK');
      return `Bot.onTick(async (ticks) => {\n${stack}});\n`;
    };

    (javascriptGenerator as any).forBlock['ticks'] = function(block: any) {
      return [`ticks`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['lists_getIndex'] = function(block: any) {
      const list = (javascriptGenerator as any).valueToCode(block, 'VALUE', (javascriptGenerator as any).ORDER_MEMBER) || '[]';
      const at = (javascriptGenerator as any).valueToCode(block, 'AT', (javascriptGenerator as any).ORDER_NONE) || '1';
      const where = block.getFieldValue('WHERE');
      let code;
      if (where === 'FROM_START') {
        code = `${list}[${at} - 1]`;
      } else {
        code = `${list}[${list}.length - ${at}]`;
      }
      return [code, (javascriptGenerator as any).ORDER_MEMBER];
    };

    (javascriptGenerator as any).forBlock['math_random_int'] = function(block: any) {
      const from = (javascriptGenerator as any).valueToCode(block, 'FROM', (javascriptGenerator as any).ORDER_NONE) || '0';
      const to = (javascriptGenerator as any).valueToCode(block, 'TO', (javascriptGenerator as any).ORDER_NONE) || '0';
      return [`Math.floor(Math.random() * (${to} - ${from} + 1) + ${from})`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['text_statement'] = function(block: any) {
      const text = (javascriptGenerator as any).valueToCode(block, 'TEXT', (javascriptGenerator as any).ORDER_NONE) || '""';
      return text + ',\n';
    };

    (javascriptGenerator as any).forBlock['text_print'] = function(block: any) {
      const text = (javascriptGenerator as any).valueToCode(block, 'TEXT', (javascriptGenerator as any).ORDER_NONE) || '""';
      return `console.log(${text});\n`;
    };

    (javascriptGenerator as any).forBlock['text_join'] = function(block: any) {
      const variable = (javascriptGenerator as any).nameDB_.getName(block.getFieldValue('VARIABLE'), (Blockly as any).VARIABLE_CATEGORY_NAME);
      const stack = (javascriptGenerator as any).statementToCode(block, 'STACK');
      return `${variable} = [${stack.split(',\n').filter((s: string) => s.trim()).join(', ')}].join("");\n`;
    };

    (javascriptGenerator as any).forBlock['trade_definition_tradeoptions'] = function(block: Blockly.Block) {
      const durationType = block.getFieldValue('DURATIONTYPE_LIST');
      const duration = (javascriptGenerator as any).valueToCode(block, 'DURATION', (javascriptGenerator as any).ORDER_ATOMIC) || '0';
      const amount = (javascriptGenerator as any).valueToCode(block, 'AMOUNT', (javascriptGenerator as any).ORDER_ATOMIC) || '0';
      
      const predictionInput = block.getInput('PREDICTION');
      let prediction = 'undefined';
      if (predictionInput && predictionInput.isVisible()) {
        prediction = (javascriptGenerator as any).valueToCode(block, 'PREDICTION', (javascriptGenerator as any).ORDER_ATOMIC) || '0';
      }
      
      return `Bot.setTradeOptions({ durationType: '${durationType}', duration: ${duration}, amount: ${amount}, prediction: ${prediction} });\n`;
    };

    (javascriptGenerator as any).forBlock['trade_definition_accumulator'] = function(block: Blockly.Block) {
      const growthRate = block.getFieldValue('GROWTH_RATE') || '0.01';
      const amount = (javascriptGenerator as any).valueToCode(block, 'AMOUNT', (javascriptGenerator as any).ORDER_ATOMIC) || '0';
      const takeProfit = (javascriptGenerator as any).valueToCode(block, 'TAKE_PROFIT', (javascriptGenerator as any).ORDER_ATOMIC) || '0';
      return `
        Bot.setAccumulatorParams({ growthRate: ${growthRate}, amount: ${amount} });
        Bot.setAccumulatorTakeProfit(${takeProfit});
      \n`;
    };

    (javascriptGenerator as any).forBlock['accumulator_take_profit'] = function(block: Blockly.Block) {
      const amount = block.getFieldValue('AMOUNT') || '0';
      return `Bot.setAccumulatorTakeProfit(${amount});\n`;
    };

    (javascriptGenerator as any).forBlock['before_purchase'] = function(block: Blockly.Block) {
      const stack = (javascriptGenerator as any).statementToCode(block, 'BEFOREPURCHASE_STACK');
      return `
        window.BEFORE_PURCHASE = function() {
          ${stack}
        };
      `;
    };

    (javascriptGenerator as any).forBlock['purchase'] = function(block: Blockly.Block) {
      const type = block.getFieldValue('PURCHASE_LIST');
      return `Bot.purchase('${type}');\n`;
    };

    (javascriptGenerator as any).forBlock['during_purchase'] = function(block: Blockly.Block) {
      const stack = (javascriptGenerator as any).statementToCode(block, 'DURING_PURCHASE_STACK');
      return `
        window.DURING_PURCHASE = function() {
          ${stack}
        };
      `;
    };

    (javascriptGenerator as any).forBlock['after_purchase'] = function(block: Blockly.Block) {
      const stack = (javascriptGenerator as any).statementToCode(block, 'AFTERPURCHASE_STACK');
      return `
        window.AFTER_PURCHASE = function() {
          ${stack}
        };
      `;
    };

    (javascriptGenerator as any).forBlock['trade_again'] = function(block: Blockly.Block) {
      return `Bot.tradeAgain();\n`;
    };

    (javascriptGenerator as any).forBlock['notify'] = function(block: Blockly.Block) {
      const type = block.getFieldValue('NOTIFICATION_TYPE');
      const message = (javascriptGenerator as any).valueToCode(block, 'MESSAGE', (javascriptGenerator as any).ORDER_ATOMIC) || "''";
      return `Bot.notify('${type}', ${message});\n`;
    };

    (javascriptGenerator as any).forBlock['last_tick'] = function() {
      return [`Bot.getLastTick()`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['last_digit'] = function() {
      return [`Bot.getLastDigit()`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['least_digit'] = function() {
      return [`Bot.getLeastDigit()`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['total_profit'] = function() {
      return [`Bot.getTotalProfit()`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['total_runs'] = function() {
      return [`Bot.getTotalRuns()`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['total_win'] = function() {
      return [`Bot.getTotalWin()`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['total_loss'] = function() {
      return [`Bot.getTotalLoss()`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['contract_check_result'] = function(block: Blockly.Block) {
      const result = block.getFieldValue('CHECK_RESULT');
      return [`Bot.checkResult('${result}')`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['math_number_positive'] = function(block: Blockly.Block) {
      const num = block.getFieldValue('NUM');
      return [num, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['read_details'] = function(block: Blockly.Block) {
      const detail = block.getFieldValue('DETAIL_INDEX');
      return [`Bot.readDetail('${detail}')`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['balance'] = function(block: Blockly.Block) {
      const type = block.getFieldValue('BALANCE_TYPE');
      return [`Bot.getBalance('${type}')`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['trade_definition_restartbuysell'] = function(block: Blockly.Block) {
      const restart = block.getFieldValue('TIME_MACHINE_ENABLED') === 'TRUE';
      return `Bot.setRestartBuySell(${restart});\n`;
    };

    (javascriptGenerator as any).forBlock['trade_definition_restartonerror'] = function(block: Blockly.Block) {
      const restart = block.getFieldValue('RESTARTONERROR') === 'TRUE';
      return `Bot.setRestartOnError(${restart});\n`;
    };

    (javascriptGenerator as any).forBlock['check_sell'] = function() {
      return [`Bot.checkSell()`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['sell_at_market'] = function() {
      return `Bot.sellAtMarket();\n`;
    };

    (javascriptGenerator as any).forBlock['get_payout'] = function() {
      return [`Bot.getPayout()`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['ticks'] = function() {
      return [`Bot.getTicks()`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['ohlc'] = function() {
      return [`Bot.getOHLC()`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['main_account'] = function() {
      return [`Bot.getMainAccount()`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['is_candle_black'] = function(block: Blockly.Block) {
      const ohlc = (javascriptGenerator as any).valueToCode(block, 'OHLC', (javascriptGenerator as any).ORDER_ATOMIC) || 'null';
      return [`Bot.isCandleBlack(${ohlc})`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['read_ohlc'] = function(block: Blockly.Block) {
      const field = block.getFieldValue('OHLC_FIELD');
      const ohlc = (javascriptGenerator as any).valueToCode(block, 'OHLC', (javascriptGenerator as any).ORDER_ATOMIC) || 'null';
      return [`Bot.readOHLC(${ohlc}, '${field}')`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['get_ohlc'] = function(block: Blockly.Block) {
      const source = block.getFieldValue('SOURCE');
      const index = (javascriptGenerator as any).valueToCode(block, 'INDEX', (javascriptGenerator as any).ORDER_ATOMIC) || '0';
      return [`Bot.getOHLCFromSource('${source}', ${index})`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['check_direction'] = function(block: Blockly.Block) {
      const direction = block.getFieldValue('DIRECTION');
      return [`Bot.checkDirection('${direction}')`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['direction'] = function() {
      return [`Bot.getDirection()`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['tick_analysis'] = function(block: Blockly.Block) {
      const stack = (javascriptGenerator as any).statementToCode(block, 'TICKANALYSIS_STACK');
      return `
        window.TICK_ANALYSIS = function() {
          ${stack}
        };
      `;
    };

    (javascriptGenerator as any).forBlock['trade'] = function(block: Blockly.Block) {
      const market = block.getFieldValue('MARKET_LIST');
      const submarket = block.getFieldValue('SUBMARKET_LIST');
      const symbol = block.getFieldValue('SYMBOL_LIST');
      const category = block.getFieldValue('TRADETYPECAT_LIST');
      const type = block.getFieldValue('TRADETYPE_LIST');
      const contractType = block.getFieldValue('TYPE_LIST');
      const interval = block.getFieldValue('CANDLEINTERVAL_LIST');
      const restartBuySell = block.getFieldValue('TIME_MACHINE_ENABLED') === 'TRUE';
      const restartOnError = block.getFieldValue('RESTARTONERROR') === 'TRUE';
      const initialization = (javascriptGenerator as any).statementToCode(block, 'INITIALIZATION');
      
      return `
        Bot.setMarket('${market}', '${submarket}', '${symbol}');
        Bot.setTradeType('${category}', '${type}');
        Bot.setContractType('${contractType}');
        Bot.setCandleInterval('${interval}');
        Bot.setRestartBuySell(${restartBuySell});
        Bot.setRestartOnError(${restartOnError});
        window.INITIALIZATION = function() {
          ${initialization}
        };
        window.TRADE_OPTIONS = function() {
          // Default trade options for legacy trade block
        };
      `;
    };

    (javascriptGenerator as any).forBlock['rsi_statement'] = function(block: Blockly.Block) {
      const variable = (javascriptGenerator as any).getVariableName(block.getFieldValue('VARIABLE'));
      const input = (javascriptGenerator as any).valueToCode(block, 'STATEMENT', (javascriptGenerator as any).ORDER_ATOMIC) || '[]';
      const period = (javascriptGenerator as any).valueToCode(block, 'PERIOD', (javascriptGenerator as any).ORDER_ATOMIC) || '14';
      return `${variable} = Bot.rsi(${input}, ${period});\n`;
    };

    (javascriptGenerator as any).forBlock['input_list'] = function(block: Blockly.Block) {
      const list = (javascriptGenerator as any).valueToCode(block, 'INPUT_LIST', (javascriptGenerator as any).ORDER_ATOMIC) || '[]';
      return [`${list}`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['period'] = function(block: Blockly.Block) {
      const period = (javascriptGenerator as any).valueToCode(block, 'PERIOD', (javascriptGenerator as any).ORDER_ATOMIC) || '14';
      return [period, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['tick'] = function() {
      return [`Bot.getLastTick()`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['sma'] = function(block: Blockly.Block) {
      const input = (javascriptGenerator as any).valueToCode(block, 'INPUT', (javascriptGenerator as any).ORDER_ATOMIC) || '[]';
      const period = (javascriptGenerator as any).valueToCode(block, 'PERIOD', (javascriptGenerator as any).ORDER_ATOMIC) || '14';
      return [`Bot.sma(${input}, ${period})`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['ema'] = function(block: Blockly.Block) {
      const input = (javascriptGenerator as any).valueToCode(block, 'INPUT', (javascriptGenerator as any).ORDER_ATOMIC) || '[]';
      const period = (javascriptGenerator as any).valueToCode(block, 'PERIOD', (javascriptGenerator as any).ORDER_ATOMIC) || '14';
      return [`Bot.ema(${input}, ${period})`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['bb'] = function(block: Blockly.Block) {
      const input = (javascriptGenerator as any).valueToCode(block, 'INPUT', (javascriptGenerator as any).ORDER_ATOMIC) || '[]';
      const period = (javascriptGenerator as any).valueToCode(block, 'PERIOD', (javascriptGenerator as any).ORDER_ATOMIC) || '14';
      const stdDev = (javascriptGenerator as any).valueToCode(block, 'UPPER', (javascriptGenerator as any).ORDER_ATOMIC) || '2';
      const field = block.getFieldValue('BB_FIELD');
      return [`Bot.bb(${input}, ${period}, ${stdDev}, ${field})`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['timeout'] = function(block: Blockly.Block) {
      const seconds = (javascriptGenerator as any).valueToCode(block, 'SECONDS', (javascriptGenerator as any).ORDER_ATOMIC) || '0';
      const stack = (javascriptGenerator as any).statementToCode(block, 'STACK');
      return `setTimeout(function() { ${stack} }, ${seconds} * 1000);\n`;
    };

    (javascriptGenerator as any).forBlock['loader'] = function(block: Blockly.Block) {
      const url = block.getFieldValue('URL');
      return `Bot.loadStrategy('${url}');\n`;
    };

    (javascriptGenerator as any).forBlock['totp_code'] = function(block: Blockly.Block) {
      const secret = block.getFieldValue('SECRET');
      return [`Bot.getTOTPCode('${secret}')`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['is_replace_variable'] = function(block: Blockly.Block) {
      const var1 = (javascriptGenerator as any).getVariableName(block.getFieldValue('VAR'));
      const var2 = (javascriptGenerator as any).getVariableName(block.getFieldValue('VAR2'));
      return `${var1} = ${var2};\n`;
    };

    (javascriptGenerator as any).forBlock['controls_if'] = function(block: Blockly.Block) {
      let n = 0;
      let code = '';
      let conditionCode = (javascriptGenerator as any).valueToCode(block, 'IF' + n, (javascriptGenerator as any).ORDER_ATOMIC) || 'false';
      let branchCode = (javascriptGenerator as any).statementToCode(block, 'DO' + n);
      code += 'if (' + conditionCode + ') {\n' + branchCode + '}';
      for (n = 1; n <= (block as any).elseifCount_ || 0; n++) {
        conditionCode = (javascriptGenerator as any).valueToCode(block, 'IF' + n, (javascriptGenerator as any).ORDER_ATOMIC) || 'false';
        branchCode = (javascriptGenerator as any).statementToCode(block, 'DO' + n);
        code += ' else if (' + conditionCode + ') {\n' + branchCode + '}';
      }
      if ((block as any).elseCount_) {
        branchCode = (javascriptGenerator as any).statementToCode(block, 'ELSE');
        code += ' else {\n' + branchCode + '}';
      }
      return code + '\n';
    };

    (javascriptGenerator as any).forBlock['logic_compare'] = function(block: Blockly.Block) {
      const op = block.getFieldValue('OP');
      const a = (javascriptGenerator as any).valueToCode(block, 'A', (javascriptGenerator as any).ORDER_ATOMIC) || '0';
      const b = (javascriptGenerator as any).valueToCode(block, 'B', (javascriptGenerator as any).ORDER_ATOMIC) || '0';
      const opMap: any = { 'EQ': '==', 'NEQ': '!=', 'LT': '<', 'LTE': '<=', 'GT': '>', 'GTE': '>=' };
      return [`${a} ${opMap[op]} ${b}`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['math_on_list'] = function(block: Blockly.Block) {
      const op = block.getFieldValue('OP');
      const list = (javascriptGenerator as any).valueToCode(block, 'LIST', (javascriptGenerator as any).ORDER_ATOMIC) || '[]';
      let code = '';
      switch (op) {
        case 'SUM':
          code = `${list}.reduce((a, b) => a + b, 0)`;
          break;
        case 'MIN':
          code = `Math.min(...${list})`;
          break;
        case 'MAX':
          code = `Math.max(...${list})`;
          break;
        case 'AVERAGE':
          code = `(${list}.reduce((a, b) => a + b, 0) / ${list}.length)`;
          break;
        case 'MEDIAN':
          code = `(function(l){l.sort((a,b)=>a-b);const m=Math.floor(l.length/2);return l.length%2?l[m]:(l[m-1]+l[m])/2})([...${list}])`;
          break;
        case 'MODE':
          code = `(function(l){const c={};let m=0,v=[];l.forEach(x=>{c[x]=(c[x]||0)+1;if(c[x]>m){m=c[x];v=[x]}else if(c[x]===m)v.push(x)});return v[0]})(${list})`;
          break;
        case 'STD_DEV':
          code = `(function(l){const a=l.reduce((x,y)=>x+y,0)/l.length;return Math.sqrt(l.reduce((x,y)=>x+Math.pow(y-a,2),0)/l.length)})(${list})`;
          break;
        case 'RANDOM':
          code = `${list}[Math.floor(Math.random() * ${list}.length)]`;
          break;
      }
      return [code, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['math_arithmetic'] = function(block: Blockly.Block) {
      const op = block.getFieldValue('OP');
      const a = (javascriptGenerator as any).valueToCode(block, 'A', (javascriptGenerator as any).ORDER_ATOMIC) || '0';
      const b = (javascriptGenerator as any).valueToCode(block, 'B', (javascriptGenerator as any).ORDER_ATOMIC) || '0';
      const opMap: any = { 'ADD': '+', 'MINUS': '-', 'MULTIPLY': '*', 'DIVIDE': '/', 'POWER': '**' };
      return [`${a} ${opMap[op]} ${b}`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['logic_null'] = function() {
      return [`null`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['logic_negate'] = function(block: Blockly.Block) {
      const bool = (javascriptGenerator as any).valueToCode(block, 'BOOL', (javascriptGenerator as any).ORDER_ATOMIC) || 'false';
      return [`!${bool}`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['logic_operation'] = function(block: Blockly.Block) {
      const op = block.getFieldValue('OP');
      const a = (javascriptGenerator as any).valueToCode(block, 'A', (javascriptGenerator as any).ORDER_ATOMIC) || 'false';
      const b = (javascriptGenerator as any).valueToCode(block, 'B', (javascriptGenerator as any).ORDER_ATOMIC) || 'false';
      const opMap: any = { 'AND': '&&', 'OR': '||' };
      return [`${a} ${opMap[op]} ${b}`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['controls_whileUntil'] = function(block: Blockly.Block) {
      const mode = block.getFieldValue('MODE');
      const condition = (javascriptGenerator as any).valueToCode(block, 'BOOL', (javascriptGenerator as any).ORDER_ATOMIC) || 'false';
      const stack = (javascriptGenerator as any).statementToCode(block, 'DO');
      const loopCondition = mode === 'WHILE' ? condition : `!${condition}`;
      return `while (${loopCondition}) {\n${stack}}\n`;
    };

    (javascriptGenerator as any).forBlock['controls_for'] = function(block: Blockly.Block) {
      const variable = (javascriptGenerator as any).getVariableName(block.getFieldValue('VAR'));
      const from = (javascriptGenerator as any).valueToCode(block, 'FROM', (javascriptGenerator as any).ORDER_ATOMIC) || '0';
      const to = (javascriptGenerator as any).valueToCode(block, 'TO', (javascriptGenerator as any).ORDER_ATOMIC) || '0';
      const by = (javascriptGenerator as any).valueToCode(block, 'BY', (javascriptGenerator as any).ORDER_ATOMIC) || '1';
      const stack = (javascriptGenerator as any).statementToCode(block, 'DO');
      return `for (${variable} = ${from}; ${variable} <= ${to}; ${variable} += ${by}) {\n${stack}}\n`;
    };

    (javascriptGenerator as any).forBlock['controls_forEach'] = function(block: Blockly.Block) {
      const variable = (javascriptGenerator as any).getVariableName(block.getFieldValue('VAR'));
      const list = (javascriptGenerator as any).valueToCode(block, 'LIST', (javascriptGenerator as any).ORDER_ATOMIC) || '[]';
      const stack = (javascriptGenerator as any).statementToCode(block, 'DO');
      return `${list}.forEach(function(${variable}) {\n${stack}});\n`;
    };

    (javascriptGenerator as any).forBlock['controls_flow_statements'] = function(block: Blockly.Block) {
      const flow = block.getFieldValue('FLOW');
      return flow === 'BREAK' ? 'break;\n' : 'continue;\n';
    };

    (javascriptGenerator as any).forBlock['variables_set'] = function(block: Blockly.Block) {
      const variable = (javascriptGenerator as any).getVariableName(block.getFieldValue('VAR'));
      const value = (javascriptGenerator as any).valueToCode(block, 'VALUE', (javascriptGenerator as any).ORDER_ATOMIC) || 'null';
      return `${variable} = ${value};\n`;
    };

    (javascriptGenerator as any).forBlock['variables_get'] = function(block: Blockly.Block) {
      const variable = (javascriptGenerator as any).getVariableName(block.getFieldValue('VAR'));
      return [variable, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['procedures_defnoreturn'] = function(block: Blockly.Block) {
      const name = (javascriptGenerator as any).getVariableName(block.getFieldValue('NAME'));
      const stack = (javascriptGenerator as any).statementToCode(block, 'STACK');
      const args = (block as any).arguments || [];
      const argsCode = args.map((arg: string) => (javascriptGenerator as any).getVariableName(arg)).join(', ');
      return `function ${name}(${argsCode}) {\n${stack}}\n`;
    };

    (javascriptGenerator as any).forBlock['procedures_defreturn'] = function(block: Blockly.Block) {
      const name = (javascriptGenerator as any).getVariableName(block.getFieldValue('NAME'));
      const stack = (javascriptGenerator as any).statementToCode(block, 'STACK');
      const returnValue = (javascriptGenerator as any).valueToCode(block, 'RETURN', (javascriptGenerator as any).ORDER_ATOMIC) || '';
      const args = (block as any).arguments || [];
      const argsCode = args.map((arg: string) => (javascriptGenerator as any).getVariableName(arg)).join(', ');
      return `function ${name}(${argsCode}) {\n${stack}${returnValue ? `  return ${returnValue};\n` : ''}}\n`;
    };

    (javascriptGenerator as any).forBlock['procedures_callnoreturn'] = function(block: Blockly.Block) {
      const name = (javascriptGenerator as any).getVariableName(block.getFieldValue('NAME'));
      const args = [];
      const blockArgs = (block as any).arguments || [];
      for (let i = 0; i < blockArgs.length; i++) {
        args[i] = (javascriptGenerator as any).valueToCode(block, 'ARG' + i, (javascriptGenerator as any).ORDER_ATOMIC) || 'null';
      }
      return `${name}(${args.join(', ')});\n`;
    };

    (javascriptGenerator as any).forBlock['procedures_callreturn'] = function(block: Blockly.Block) {
      const name = (javascriptGenerator as any).getVariableName(block.getFieldValue('NAME'));
      const args = [];
      const blockArgs = (block as any).arguments || [];
      for (let i = 0; i < blockArgs.length; i++) {
        args[i] = (javascriptGenerator as any).valueToCode(block, 'ARG' + i, (javascriptGenerator as any).ORDER_ATOMIC) || 'null';
      }
      return [`${name}(${args.join(', ')})`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['procedures_ifreturn'] = function(block: Blockly.Block) {
      const condition = (javascriptGenerator as any).valueToCode(block, 'CONDITION', (javascriptGenerator as any).ORDER_ATOMIC) || 'false';
      let code = `if (${condition}) {\n`;
      if ((block as any).hasReturnValue) {
        const value = (javascriptGenerator as any).valueToCode(block, 'VALUE', (javascriptGenerator as any).ORDER_ATOMIC) || 'null';
        code += `  return ${value};\n`;
      } else {
        code += `  return;\n`;
      }
      code += '}\n';
      return code;
    };

    (javascriptGenerator as any).forBlock['lists_getIndex'] = function(block: Blockly.Block) {
      const mode = block.getFieldValue('MODE') || 'GET';
      const where = block.getFieldValue('WHERE') || 'FROM_START';
      const list = (javascriptGenerator as any).valueToCode(block, 'VALUE', (javascriptGenerator as any).ORDER_ATOMIC) || '[]';
      
      let code = '';
      if (mode === 'GET') {
        if (where === 'FROM_START') {
          const at = (javascriptGenerator as any).valueToCode(block, 'AT', (javascriptGenerator as any).ORDER_ATOMIC) || '1';
          code = `${list}[${at} - 1]`;
        } else if (where === 'FROM_END') {
          const at = (javascriptGenerator as any).valueToCode(block, 'AT', (javascriptGenerator as any).ORDER_ATOMIC) || '1';
          code = `${list}[${list}.length - ${at}]`;
        } else if (where === 'FIRST') {
          code = `${list}[0]`;
        } else if (where === 'LAST') {
          code = `${list}[${list}.length - 1]`;
        } else if (where === 'RANDOM') {
          code = `${list}[Math.floor(Math.random() * ${list}.length)]`;
        }
        return [code, (javascriptGenerator as any).ORDER_ATOMIC];
      } else if (mode === 'GET_REMOVE') {
        if (where === 'FROM_START') {
          const at = (javascriptGenerator as any).valueToCode(block, 'AT', (javascriptGenerator as any).ORDER_ATOMIC) || '1';
          code = `${list}.splice(${at} - 1, 1)[0]`;
        } else if (where === 'FROM_END') {
          const at = (javascriptGenerator as any).valueToCode(block, 'AT', (javascriptGenerator as any).ORDER_ATOMIC) || '1';
          code = `${list}.splice(${list}.length - ${at}, 1)[0]`;
        } else if (where === 'FIRST') {
          code = `${list}.shift()`;
        } else if (where === 'LAST') {
          code = `${list}.pop()`;
        } else if (where === 'RANDOM') {
          code = `(function(l){ const i = Math.floor(Math.random() * l.length); return l.splice(i, 1)[0]; })(${list})`;
        }
        return [code, (javascriptGenerator as any).ORDER_ATOMIC];
      } else if (mode === 'REMOVE') {
        if (where === 'FROM_START') {
          const at = (javascriptGenerator as any).valueToCode(block, 'AT', (javascriptGenerator as any).ORDER_ATOMIC) || '1';
          code = `${list}.splice(${at} - 1, 1);\n`;
        } else if (where === 'FROM_END') {
          const at = (javascriptGenerator as any).valueToCode(block, 'AT', (javascriptGenerator as any).ORDER_ATOMIC) || '1';
          code = `${list}.splice(${list}.length - ${at}, 1);\n`;
        } else if (where === 'FIRST') {
          code = `${list}.shift();\n`;
        } else if (where === 'LAST') {
          code = `${list}.pop();\n`;
        } else if (where === 'RANDOM') {
          code = `(function(l){ const i = Math.floor(Math.random() * l.length); l.splice(i, 1); })(${list});\n`;
        }
        return code;
      }
      return ['null', (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['lists_setIndex'] = function(block: Blockly.Block) {
      const list = (javascriptGenerator as any).valueToCode(block, 'LIST', (javascriptGenerator as any).ORDER_ATOMIC) || '[]';
      const mode = block.getFieldValue('MODE');
      const where = block.getFieldValue('WHERE');
      const value = (javascriptGenerator as any).valueToCode(block, 'TO', (javascriptGenerator as any).ORDER_ATOMIC) || 'null';
      
      let code = '';
      if (mode === 'SET') {
        if (where === 'FROM_START') {
          const at = (javascriptGenerator as any).valueToCode(block, 'AT', (javascriptGenerator as any).ORDER_ATOMIC) || '1';
          code = `${list}[${at} - 1] = ${value};\n`;
        } else if (where === 'FROM_END') {
          const at = (javascriptGenerator as any).valueToCode(block, 'AT', (javascriptGenerator as any).ORDER_ATOMIC) || '1';
          code = `${list}[${list}.length - ${at}] = ${value};\n`;
        } else if (where === 'FIRST') {
          code = `${list}[0] = ${value};\n`;
        } else if (where === 'LAST') {
          code = `${list}[${list}.length - 1] = ${value};\n`;
        } else if (where === 'RANDOM') {
          code = `${list}[Math.floor(Math.random() * ${list}.length)] = ${value};\n`;
        }
      } else if (mode === 'INSERT') {
        if (where === 'FROM_START') {
          const at = (javascriptGenerator as any).valueToCode(block, 'AT', (javascriptGenerator as any).ORDER_ATOMIC) || '1';
          code = `${list}.splice(${at} - 1, 0, ${value});\n`;
        } else if (where === 'FROM_END') {
          const at = (javascriptGenerator as any).valueToCode(block, 'AT', (javascriptGenerator as any).ORDER_ATOMIC) || '1';
          code = `${list}.splice(${list}.length - ${at}, 0, ${value});\n`;
        } else if (where === 'FIRST') {
          code = `${list}.unshift(${value});\n`;
        } else if (where === 'LAST') {
          code = `${list}.push(${value});\n`;
        } else if (where === 'RANDOM') {
          code = `${list}.splice(Math.floor(Math.random() * (${list}.length + 1)), 0, ${value});\n`;
        }
      }
      return code;
    };

    (javascriptGenerator as any).forBlock['lists_length'] = function(block: Blockly.Block) {
      const list = (javascriptGenerator as any).valueToCode(block, 'VALUE', (javascriptGenerator as any).ORDER_ATOMIC) || '[]';
      return [`${list}.length`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['lists_create_empty'] = function() {
      return ['[]', (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['math_constant'] = function(block: Blockly.Block) {
      const constant = block.getFieldValue('CONSTANT');
      const map: any = { 'PI': 'Math.PI', 'E': 'Math.E', 'GOLDEN_RATIO': '(1 + Math.sqrt(5)) / 2', 'SQRT2': 'Math.SQRT2', 'SQRT1_2': 'Math.SQRT1_2', 'INFINITY': 'Infinity' };
      return [map[constant], (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['math_random_float'] = function() {
      return ['Math.random()', (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['sma_statement'] = function(block: Blockly.Block) {
      const variable = (javascriptGenerator as any).getVariableName(block.getFieldValue('VARIABLE'));
      const input = (javascriptGenerator as any).valueToCode(block, 'INPUT', (javascriptGenerator as any).ORDER_ATOMIC) || '[]';
      const period = (javascriptGenerator as any).valueToCode(block, 'PERIOD', (javascriptGenerator as any).ORDER_ATOMIC) || '14';
      return `${variable} = Bot.sma(${input}, ${period});\n`;
    };

    (javascriptGenerator as any).forBlock['ema_statement'] = function(block: Blockly.Block) {
      const variable = (javascriptGenerator as any).getVariableName(block.getFieldValue('VARIABLE'));
      const input = (javascriptGenerator as any).valueToCode(block, 'INPUT', (javascriptGenerator as any).ORDER_ATOMIC) || '[]';
      const period = (javascriptGenerator as any).valueToCode(block, 'PERIOD', (javascriptGenerator as any).ORDER_ATOMIC) || '14';
      return `${variable} = Bot.ema(${input}, ${period});\n`;
    };

    (javascriptGenerator as any).forBlock['bb_statement'] = function(block: Blockly.Block) {
      const variable = (javascriptGenerator as any).getVariableName(block.getFieldValue('VARIABLE'));
      const input = (javascriptGenerator as any).valueToCode(block, 'INPUT', (javascriptGenerator as any).ORDER_ATOMIC) || '[]';
      const period = (javascriptGenerator as any).valueToCode(block, 'PERIOD', (javascriptGenerator as any).ORDER_ATOMIC) || '14';
      const stdDev = (javascriptGenerator as any).valueToCode(block, 'UPPER', (javascriptGenerator as any).ORDER_ATOMIC) || '2';
      const field = block.getFieldValue('BB_FIELD');
      return `${variable} = Bot.bb(${input}, ${period}, ${stdDev}, '${field}');\n`;
    };

    (javascriptGenerator as any).forBlock['math_number'] = function(block: Blockly.Block) {
      const num = block.getFieldValue('NUM');
      return [num, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['text'] = function(block: Blockly.Block) {
      const text = block.getFieldValue('TEXT');
      return [`'${text}'`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['logic_boolean'] = function(block: Blockly.Block) {
      const bool = block.getFieldValue('BOOL') === 'TRUE';
      return [bool.toString(), (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['math_change'] = function(block: Blockly.Block) {
      const variable = (javascriptGenerator as any).getVariableName(block.getFieldValue('VAR'));
      const delta = (javascriptGenerator as any).valueToCode(block, 'DELTA', (javascriptGenerator as any).ORDER_ATOMIC) || '0';
      return `${variable} += ${delta};\n`;
    };

    (javascriptGenerator as any).forBlock['logic_ternary'] = function(block: Blockly.Block) {
      const condition = (javascriptGenerator as any).valueToCode(block, 'IF', (javascriptGenerator as any).ORDER_ATOMIC) || 'false';
      const thenValue = (javascriptGenerator as any).valueToCode(block, 'THEN', (javascriptGenerator as any).ORDER_ATOMIC) || 'null';
      const elseValue = (javascriptGenerator as any).valueToCode(block, 'ELSE', (javascriptGenerator as any).ORDER_ATOMIC) || 'null';
      return [`${condition} ? ${thenValue} : ${elseValue}`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['math_random_int'] = function(block: Blockly.Block) {
      const from = (javascriptGenerator as any).valueToCode(block, 'FROM', (javascriptGenerator as any).ORDER_ATOMIC) || '0';
      const to = (javascriptGenerator as any).valueToCode(block, 'TO', (javascriptGenerator as any).ORDER_ATOMIC) || '0';
      return [`Math.floor(Math.random() * (${to} - ${from} + 1) + ${from})`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['math_round'] = function(block: Blockly.Block) {
      const op = block.getFieldValue('OP');
      const num = (javascriptGenerator as any).valueToCode(block, 'NUM', (javascriptGenerator as any).ORDER_ATOMIC) || '0';
      const opMap: any = { 'ROUND': 'Math.round', 'ROUNDUP': 'Math.ceil', 'ROUNDDOWN': 'Math.floor' };
      return [`${opMap[op]}(${num})`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['math_number_property'] = function(block: Blockly.Block) {
      const num = (javascriptGenerator as any).valueToCode(block, 'NUMBER_TO_CHECK', (javascriptGenerator as any).ORDER_ATOMIC) || '0';
      const prop = block.getFieldValue('PROPERTY');
      let code = '';
      if (prop === 'EVEN') code = `${num} % 2 == 0`;
      else if (prop === 'ODD') code = `${num} % 2 != 0`;
      else if (prop === 'POSITIVE') code = `${num} > 0`;
      else if (prop === 'NEGATIVE') code = `${num} < 0`;
      else if (prop === 'WHOLE') code = `${num} % 1 == 0`;
      else if (prop === 'DIVISIBLE_BY') {
        const divisor = (javascriptGenerator as any).valueToCode(block, 'DIVISOR', (javascriptGenerator as any).ORDER_ATOMIC) || '1';
        code = `${num} % ${divisor} == 0`;
      }
      return [code, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['math_single'] = function(block: Blockly.Block) {
      const op = block.getFieldValue('OP');
      const num = (javascriptGenerator as any).valueToCode(block, 'NUM', (javascriptGenerator as any).ORDER_ATOMIC) || '0';
      const opMap: any = { 'ROOT': 'Math.sqrt', 'ABS': 'Math.abs', 'NEG': '-', 'LN': 'Math.log', 'LOG10': 'Math.log10', 'EXP': 'Math.exp', 'POW10': 'Math.pow(10,' };
      let code = `${opMap[op]}(${num})`;
      if (op === 'NEG') code = `-${num}`;
      if (op === 'POW10') code = `Math.pow(10, ${num})`;
      return [code, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['lists_create_with'] = function(block: Blockly.Block) {
      const variable = (javascriptGenerator as any).getVariableName(block.getFieldValue('VARIABLE'));
      const stack = (javascriptGenerator as any).statementToCode(block, 'STACK');
      return `
        ${variable} = [];
        ${stack}
      `;
    };

    (javascriptGenerator as any).forBlock['text_join'] = function(block: Blockly.Block) {
      const variable = (javascriptGenerator as any).getVariableName(block.getFieldValue('VARIABLE'));
      const stack = (javascriptGenerator as any).statementToCode(block, 'STACK');
      return `
        ${variable} = '';
        ${stack}
      `;
    };

    (javascriptGenerator as any).forBlock['lists_statement'] = function(block: Blockly.Block) {
      const value = (javascriptGenerator as any).valueToCode(block, 'VALUE', (javascriptGenerator as any).ORDER_ATOMIC) || 'null';
      const parentBlock = block.getSurroundParent();
      if (parentBlock && parentBlock.type === 'lists_create_with') {
        const variable = (javascriptGenerator as any).getVariableName(parentBlock.getFieldValue('VARIABLE'));
        return `${variable}.push(${value});\n`;
      }
      return '';
    };

    (javascriptGenerator as any).forBlock['text_statement'] = function(block: Blockly.Block) {
      const text = (javascriptGenerator as any).valueToCode(block, 'TEXT', (javascriptGenerator as any).ORDER_ATOMIC) || "''";
      const parentBlock = block.getSurroundParent();
      if (parentBlock && parentBlock.type === 'text_join') {
        const variable = (javascriptGenerator as any).getVariableName(parentBlock.getFieldValue('VARIABLE'));
        return `${variable} += ${text};\n`;
      }
      return '';
    };

    (javascriptGenerator as any).forBlock['text_print'] = function(block: Blockly.Block) {
      const text = (javascriptGenerator as any).valueToCode(block, 'TEXT', (javascriptGenerator as any).ORDER_ATOMIC) || "''";
      return `Bot.notify('info', ${text});\n`;
    };

    (javascriptGenerator as any).forBlock['text_prompt_ext'] = function(block: Blockly.Block) {
      const text = (javascriptGenerator as any).valueToCode(block, 'TEXT', (javascriptGenerator as any).ORDER_ATOMIC) || "''";
      return [`prompt(${text})`, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['math_number_positive'] = function(block: Blockly.Block) {
      const num = block.getFieldValue('NUM');
      return [num, (javascriptGenerator as any).ORDER_ATOMIC];
    };

    (javascriptGenerator as any).forBlock['notify'] = function(block: Blockly.Block) {
      const type = block.getFieldValue('NOTIFICATION_TYPE');
      const message = (javascriptGenerator as any).valueToCode(block, 'MESSAGE', (javascriptGenerator as any).ORDER_ATOMIC) || "''";
      return `Bot.notify('${type}', ${message});\n`;
    };

    Blockly.Blocks['controls_if_if'] = {
      init: function() {
        this.appendDummyInput().appendField("if");
        this.appendStatementInput("STACK");
        this.setColour(210);
        this.contextMenu = false;
      }
    };

    Blockly.Blocks['controls_if_elseif'] = {
      init: function() {
        this.appendDummyInput().appendField("else if");
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(210);
        this.contextMenu = false;
      }
    };

    Blockly.Blocks['controls_if_else'] = {
      init: function() {
        this.appendDummyInput().appendField("else");
        this.setPreviousStatement(true);
        this.setColour(210);
        this.contextMenu = false;
      }
    };

    Blockly.Blocks['controls_if'] = {
      init: function() {
        this.appendValueInput('IF0').setCheck('Boolean').appendField('if');
        this.appendStatementInput('DO0').appendField('then');
        this.setNextStatement(true);
        this.setPreviousStatement(true);
        this.setStyle('logic_blocks');
        this.setMutator(new (Blockly as any).icons.MutatorIcon(['controls_if_elseif', 'controls_if_else'], this));
        this.elseifCount_ = 0;
        this.elseCount_ = 0;
      },
      mutationToDom: function() {
        if (!this.elseifCount_ && !this.elseCount_) {
          return null;
        }
        const container = Blockly.utils.xml.createElement('mutation');
        if (this.elseifCount_) {
          container.setAttribute('elseif', this.elseifCount_);
        }
        if (this.elseCount_) {
          container.setAttribute('else', "1");
        }
        return container;
      },
      domToMutation: function(xmlElement: Element) {
        this.elseifCount_ = parseInt(xmlElement.getAttribute('elseif') || '0', 10);
        this.elseCount_ = parseInt(xmlElement.getAttribute('else') || '0', 10);
        this.updateShape_();
      },
      decompose: function(workspace: Blockly.Workspace) {
        const containerBlock = workspace.newBlock('controls_if_if');
        if ((containerBlock as any).initSvg) (containerBlock as any).initSvg();
        let connection = containerBlock.getInput('STACK').connection;
        for (let i = 1; i <= this.elseifCount_; i++) {
          const elseifBlock = workspace.newBlock('controls_if_elseif');
          if ((elseifBlock as any).initSvg) (elseifBlock as any).initSvg();
          connection.connect(elseifBlock.previousConnection);
          connection = elseifBlock.nextConnection;
        }
        if (this.elseCount_) {
          const elseBlock = workspace.newBlock('controls_if_else');
          if ((elseBlock as any).initSvg) (elseBlock as any).initSvg();
          connection.connect(elseBlock.previousConnection);
        }
        return containerBlock;
      },
      compose: function(containerBlock: Blockly.Block) {
        let clauseBlock = containerBlock.getInputTargetBlock('STACK');
        this.elseifCount_ = 0;
        this.elseCount_ = 0;
        const valueConnections = [null];
        const statementConnections = [null];
        let elseStatementConnection = null;
        while (clauseBlock) {
          switch (clauseBlock.type) {
            case 'controls_if_elseif':
              this.elseifCount_++;
              valueConnections.push((clauseBlock as any).valueConnection_);
              statementConnections.push((clauseBlock as any).statementConnection_);
              break;
            case 'controls_if_else':
              this.elseCount_++;
              elseStatementConnection = (clauseBlock as any).statementConnection_;
              break;
            default:
              throw new Error('Unknown block type: ' + clauseBlock.type);
          }
          clauseBlock = clauseBlock.nextConnection && clauseBlock.nextConnection.targetBlock();
        }
        this.updateShape_();
        // Reconnect any child blocks.
        for (let i = 1; i <= this.elseifCount_; i++) {
          (Blockly as any).icons.MutatorIcon.reconnect(valueConnections[i], this, 'IF' + i);
          (Blockly as any).icons.MutatorIcon.reconnect(statementConnections[i], this, 'DO' + i);
        }
        (Blockly as any).icons.MutatorIcon.reconnect(elseStatementConnection, this, 'ELSE');
      },
      saveConnections: function(containerBlock: Blockly.Block) {
        let clauseBlock = containerBlock.getInputTargetBlock('STACK');
        let i = 1;
        while (clauseBlock) {
          switch (clauseBlock.type) {
            case 'controls_if_elseif': {
              const inputIf = this.getInput('IF' + i);
              const inputDo = this.getInput('DO' + i);
              (clauseBlock as any).valueConnection_ = inputIf && inputIf.connection.targetConnection;
              (clauseBlock as any).statementConnection_ = inputDo && inputDo.connection.targetConnection;
              i++;
              break;
            }
            case 'controls_if_else': {
              const inputElse = this.getInput('ELSE');
              (clauseBlock as any).statementConnection_ = inputElse && inputElse.connection.targetConnection;
              break;
            }
            default:
              throw new Error('Unknown block type: ' + clauseBlock.type);
          }
          clauseBlock = clauseBlock.nextConnection && clauseBlock.nextConnection.targetBlock();
        }
      },
      updateShape_: function() {
        // Delete everything.
        if (this.getInput('ELSE')) {
          this.removeInput('ELSE');
        }
        let i = 1;
        while (this.getInput('IF' + i)) {
          this.removeInput('IF' + i);
          this.removeInput('DO' + i);
          i++;
        }
        // Rebuild block.
        for (let i = 1; i <= this.elseifCount_; i++) {
          this.appendValueInput('IF' + i).setCheck('Boolean').appendField('else if');
          this.appendStatementInput('DO' + i).appendField('then');
        }
        if (this.elseCount_) {
          this.appendStatementInput('ELSE').appendField('else');
        }
      }
    };

    // Define Custom Theme
    const theme = (Blockly as any).Theme.defineTheme('zelos_renderer-theme', {
      base: (Blockly as any).Themes?.Classic,
      blockStyles: {
        'trade_parameters': { colourPrimary: '#065f86' },
        'purchase_conditions': { colourPrimary: '#065f86' },
        'sell_conditions': { colourPrimary: '#065f86' },
        'restart_trading': { colourPrimary: '#065f86' },
        'analysis_blocks': { colourPrimary: '#9c27b0' },
        'logic_blocks': { colourPrimary: '#ffffff', colourSecondary: '#ffffff', colourTertiary: '#ffffff' },
        'math_blocks': { colourPrimary: '#ffffff', colourSecondary: '#ffffff', colourTertiary: '#ffffff' },
        'text_blocks': { colourPrimary: '#ffffff', colourSecondary: '#ffffff', colourTertiary: '#ffffff' },
        'list_blocks': { colourPrimary: '#ffffff', colourSecondary: '#ffffff', colourTertiary: '#ffffff' },
        'variable_blocks': { colourPrimary: '#ffffff', colourSecondary: '#ffffff', colourTertiary: '#ffffff' },
        'procedure_blocks': { colourPrimary: '#ffffff', colourSecondary: '#ffffff', colourTertiary: '#ffffff' },
      },
      categoryStyles: {},
      componentStyles: {
        workspaceBackgroundColour: '#0e0e0e',
        toolboxBackgroundColour: '#151717',
        toolboxTextColour: '#aaaaaa',
        flyoutBackgroundColour: '#151717',
        flyoutTextColour: '#aaaaaa',
        scrollbarColour: '#2d2f2f',
        insertionMarkerColour: '#ffffff',
        insertionMarkerOpacity: 0.3,
        scrollbarOpacity: 0.4,
        cursorColour: '#ffffff',
        fieldBackgroundColour: '#000000',
        fieldTextColour: '#ffffff',
      },
    });

    // Initialize Workspace
    workspace.current = Blockly.inject(blocklyDiv.current, {
      renderer: 'zelos',
      theme: theme,
      toolbox: `
        <xml xmlns="https://developers.google.com/blockly/xml">
          <category name="Trade parameters" colour="#ffc107">
            <block type="trade_definition"></block>
            <block type="trade_definition_market"></block>
            <block type="trade_definition_tradetype"></block>
            <block type="trade_definition_contracttype"></block>
            <block type="trade_definition_candleinterval"></block>
            <block type="trade_definition_restartbuysell"></block>
            <block type="trade_definition_restartonerror"></block>
            <block type="trade_definition_tradeoptions">
              <value name="DURATION">
                <shadow type="math_number">
                  <field name="NUM">5</field>
                </shadow>
              </value>
              <value name="AMOUNT">
                <shadow type="math_number">
                  <field name="NUM">0.35</field>
                </shadow>
              </value>
              <value name="PREDICTION">
                <shadow type="math_number">
                  <field name="NUM">1</field>
                </shadow>
              </value>
            </block>
            <block type="trade_definition_accumulator">
              <value name="AMOUNT">
                <shadow type="math_number">
                  <field name="NUM">10</field>
                </shadow>
              </value>
              <value name="TAKE_PROFIT">
                <shadow type="math_number">
                  <field name="NUM">1</field>
                </shadow>
              </value>
            </block>
          </category>
          <category name="Purchase conditions" colour="#4caf50">
            <block type="before_purchase"></block>
            <block type="purchase"></block>
          </category>
          <category name="Sell conditions (optional)" colour="#f44336">
            <block type="during_purchase"></block>
            <block type="check_sell"></block>
            <block type="sell_at_market"></block>
          </category>
          <category name="Restart trading conditions" colour="#2196f3">
            <block type="after_purchase"></block>
            <block type="trade_again"></block>
            <block type="contract_check_result"></block>
            <block type="controls_if"></block>
            <block type="variables_set"></block>
            <block type="variables_get"></block>
            <block type="math_arithmetic"></block>
          </category>
          <category name="Analysis" colour="#9c27b0">
            <block type="tick_analysis"></block>
            <block type="last_digit"></block>
            <block type="least_digit"></block>
            <block type="last_tick"></block>
            <block type="tick"></block>
            <block type="ticks"></block>
            <block type="ohlc"></block>
            <block type="read_ohlc"></block>
            <block type="get_ohlc"></block>
            <block type="check_direction"></block>
            <block type="direction"></block>
          </category>
          <category name="Indicators" colour="#9c27b0">
            <block type="sma"></block>
            <block type="ema"></block>
            <block type="bb"></block>
            <block type="rsi_statement"></block>
          </category>
          <category name="Utility" colour="#4caf50">
            <block type="controls_if"></block>
            <block type="logic_compare"></block>
            <block type="logic_operation"></block>
          </category>
          <category name="Logic" colour="#4caf50">
            <block type="controls_if"></block>
            <block type="logic_compare"></block>
            <block type="logic_operation"></block>
            <block type="logic_negate"></block>
            <block type="logic_boolean"></block>
            <block type="logic_null"></block>
            <block type="logic_ternary"></block>
          </category>
          <category name="Math" colour="#4caf50">
            <block type="math_number"></block>
            <block type="math_number_positive"></block>
            <block type="math_arithmetic"></block>
            <block type="math_single"></block>
            <block type="math_round"></block>
            <block type="math_random_int"></block>
            <block type="math_number_property"></block>
            <block type="math_change"></block>
          </category>
          <category name="Text" colour="#4caf50">
            <block type="text"></block>
            <block type="text_join"></block>
            <block type="text_statement"></block>
            <block type="text_print"></block>
            <block type="text_prompt_ext"></block>
            <block type="notify"></block>
            <block type="totp_code"></block>
          </category>
          <category name="Lists" colour="#4caf50">
            <block type="lists_create_with"></block>
            <block type="lists_statement"></block>
          </category>
          <category name="Variables" colour="#4caf50" custom="VARIABLE">
            <block type="variables_set"></block>
            <block type="variables_get"></block>
            <block type="is_replace_variable"></block>
          </category>
          <category name="Loops" colour="#4caf50">
            <block type="controls_whileUntil"></block>
            <block type="controls_for"></block>
            <block type="controls_forEach"></block>
            <block type="controls_flow_statements"></block>
            <block type="timeout"></block>
          </category>
          <category name="Functions" colour="#4caf50" custom="PROCEDURE">
            <block type="procedures_defnoreturn"></block>
            <block type="procedures_defreturn"></block>
            <block type="procedures_callnoreturn"></block>
            <block type="procedures_callreturn"></block>
            <block type="procedures_ifreturn"></block>
            <block type="loader"></block>
          </category>
        </xml>
      `,
      trashcan: true,
      grid: { spacing: 20, length: 3, colour: '#2d2f2f', snap: true },
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 }
    });

    // Initial Strategy
    const initialXml = `
      <xml xmlns="https://developers.google.com/blockly/xml">
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
          <statement name="TRADE_OPTIONS">
            <block type="trade_definition_tradeoptions">
              <field name="DURATIONTYPE_LIST">t</field>
              <value name="DURATION">
                <shadow type="math_number">
                  <field name="NUM">1</field>
                </shadow>
              </value>
              <value name="AMOUNT">
                <shadow type="math_number">
                  <field name="NUM">0.35</field>
                </shadow>
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
            <block type="trade_again"></block>
          </statement>
        </block>
      </xml>
    `;
    const savedXml = localStorage.getItem('load_bot_xml');
    const finalInitialXml = savedXml || initialXml;
    console.log('[BotBuilder] Initializing workspace. Saved XML present:', !!savedXml);
    try {
      const xml = (Blockly as any).utils?.xml?.textToDom(finalInitialXml) || (Blockly as any).Xml?.textToDom(finalInitialXml);
      if (workspace.current) {
        workspace.current.clear();
        (Blockly as any).Xml?.domToWorkspace(xml, workspace.current);
        console.log('[BotBuilder] XML loaded into workspace');
      }
    } catch (e) {
      console.error('[BotBuilder] Error loading bot XML:', e);
    }
    
    if (savedXml) {
      localStorage.removeItem('load_bot_xml');
      localStorage.removeItem('load_bot_name');
    }

    setWorkspaceInstance(workspace.current);

    // Hide the default Blockly toolbox sidebar permanently
    const toolboxDiv = blocklyDiv.current?.querySelector('.blocklyToolboxDiv') as HTMLElement;
    if (toolboxDiv) {
      toolboxDiv.style.display = 'none';
    }

    Blockly.svgResize(workspace.current);

    // Add workspace change listener to resolve loader blocks dynamically
    workspace.current.addChangeListener((event: any) => {
      if (event.type === Blockly.Events.BLOCK_CREATE || event.type === Blockly.Events.BLOCK_CHANGE) {
        const block = workspace.current?.getBlockById(event.blockId);
        if (block && block.type === 'loader') {
          const url = block.getFieldValue('URL');
          if (url && url.startsWith('http')) {
            fetch(url).then(res => res.text()).then(text => {
              const parser = new DOMParser();
              const subXmlDoc = parser.parseFromString(text, "text/xml");
              const subXml = subXmlDoc.documentElement;
              if (workspace.current) {
                Blockly.Xml.appendDomToWorkspace(subXml, workspace.current);
              }
            }).catch(err => console.error("Failed to load strategy:", err));
          }
        }
      }
    });

    return () => {
      workspace.current?.dispose();
    };
  }, []);

  const handleCategoryClick = (categoryName: string, index: number, isSubcategory = false) => {
    if (!workspace.current) return;

    const toolbox = workspace.current.getToolbox();
    if (!toolbox) return;

    // Map our React sidebar indices to Blockly toolbox indices (flat list)
    let targetIndex = index;
    if (isSubcategory) {
      if (categoryName === 'Indicators') targetIndex = 5; 
      if (categoryName === 'Logic') targetIndex = 7; 
      if (categoryName === 'Math') targetIndex = 8;
      if (categoryName === 'Text') targetIndex = 9;
      if (categoryName === 'Lists') targetIndex = 10;
      if (categoryName === 'Variables') targetIndex = 11;
      if (categoryName === 'Loops') targetIndex = 12;
      if (categoryName === 'Functions') targetIndex = 13;
    } else {
      // Main categories
      if (categoryName === 'Trade parameters') targetIndex = 0;
      if (categoryName === 'Purchase conditions') targetIndex = 1;
      if (categoryName === 'Sell conditions (optional)') targetIndex = 2;
      if (categoryName === 'Restart trading conditions') targetIndex = 3;
      if (categoryName === 'Analysis') targetIndex = 4;
      if (categoryName === 'Utility') targetIndex = 6;
    }

    toolbox.selectItemByPosition(targetIndex);
    setActiveCategory(categoryName);
  };

  const toggleExpand = (label: string) => {
    setExpandedCategories(prev => 
      prev.includes(label) ? prev.filter(c => c !== label) : [...prev, label]
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#0e0e0e] text-white overflow-hidden font-sans">
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <AnimatePresence>
          {isToolboxVisible && (
            <motion.aside 
              initial={isMobile ? { x: -64 } : { width: 0 }}
              animate={isMobile ? { x: 0 } : { width: 256 }}
              exit={isMobile ? { x: -64 } : { width: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={cn(
                "border-r border-[#2d2f2f] bg-[#151717] flex flex-col shrink-0 z-[80] overflow-hidden shadow-2xl lg:shadow-none",
                "fixed inset-y-0 left-0 w-16 lg:w-64 lg:static lg:h-full"
              )}
            >
              <div className="p-2 lg:p-4 shrink-0">
                <div className="flex items-center justify-center mb-4 lg:hidden">
                  <button onClick={() => setIsToolboxVisible(false)} className="p-1 text-[#aaaaaa] hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <button className="w-full bg-[#ff444f] hover:bg-[#ff444f]/90 text-white font-bold py-2 lg:py-2.5 rounded transition-colors mb-4 flex items-center justify-center">
                  <Zap size={18} className="lg:mr-2" />
                  <span className="hidden lg:inline">Quick strategy</span>
                </button>
                
                <div className="hidden lg:flex items-center justify-between text-sm font-bold mb-2 px-1 text-[#aaaaaa]">
                  <span>Blocks menu</span>
                  <ChevronRight size={16} className="rotate-90" />
                </div>

                <div className="relative mb-4 hidden lg:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaaaaa]" size={16} />
                  <input 
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0e0e0e] border border-[#2d2f2f] rounded py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#ff444f] transition-colors"
                  />
                </div>
              </div>

            <nav className="flex-1 overflow-y-auto custom-scrollbar">
              {[
                { label: 'Trade parameters', index: 0, icon: Layout },
                { label: 'Purchase conditions', index: 1, icon: Play },
                { label: 'Sell conditions (optional)', index: 2, icon: Square },
                { label: 'Restart trading conditions', index: 3, icon: RotateCcw },
                { 
                  label: 'Analysis', 
                  index: 4,
                  icon: LineChart,
                  subcategories: [
                    { label: 'Indicators', index: 0 }
                  ]
                },
                { 
                  label: 'Utility', 
                  index: 6,
                  icon: Package,
                  subcategories: [
                    { label: 'Logic', index: 0 },
                    { label: 'Math', index: 1 },
                    { label: 'Text', index: 2 },
                    { label: 'Lists', index: 3 },
                    { label: 'Variables', index: 4 },
                    { label: 'Loops', index: 5 },
                    { label: 'Functions', index: 6 },
                  ]
                },
              ].filter(item => 
                item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.subcategories?.some(sub => sub.label.toLowerCase().includes(searchQuery.toLowerCase())))
              ).map((item, idx) => {
                const isExpanded = expandedCategories.includes(item.label);
                const hasSubcategories = !!item.subcategories;
                const Icon = item.icon;
                
                return (
                  <div key={idx} className="border-b border-[#2d2f2f]/50">
                    <button 
                      onClick={() => {
                        handleCategoryClick(item.label, item.index);
                        if (hasSubcategories) {
                          toggleExpand(item.label);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center justify-center lg:justify-between px-2 lg:px-4 py-3 text-sm transition-colors hover:bg-[#1a1c1c]",
                        activeCategory === item.label ? "text-white bg-[#1a1c1c]" : "text-[#aaaaaa] hover:text-white"
                      )}
                      title={item.label}
                    >
                      <div className="flex items-center">
                        <Icon size={18} className="lg:mr-3" />
                        <span className="hidden lg:inline truncate max-w-[140px]">{item.label}</span>
                      </div>
                      {hasSubcategories && (
                        <ChevronRight size={16} className={cn("hidden lg:block transition-transform", isExpanded && "rotate-90")} />
                      )}
                    </button>
                    
                    {hasSubcategories && isExpanded && (
                      <div className="bg-[#0e0e0e]/50 py-1 hidden lg:block">
                        {item.subcategories.map((sub, subIdx) => (
                          <button
                            key={subIdx}
                            onClick={() => handleCategoryClick(sub.label, subIdx, true)}
                            className={cn(
                              "w-full text-left px-10 py-2 text-xs transition-colors hover:text-white",
                              activeCategory === sub.label ? "text-white font-bold" : "text-[#888888]"
                            )}
                          >
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Blocks Sidebar Mobile Overlay */}
      <AnimatePresence>
        {isToolboxVisible && isMobile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[75] lg:hidden" 
            onClick={() => setIsToolboxVisible(false)}
          />
        )}
      </AnimatePresence>

        {/* Workspace Area */}
        <main className="flex-1 flex flex-col relative bg-[#0e0e0e] min-w-0">
          {/* Toolbar */}
          <div className="h-12 border-b border-[#2d2f2f] flex items-center px-2 lg:px-4 space-x-2 lg:space-x-4 bg-[#151717] shrink-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center space-x-2 border-r border-[#2d2f2f] pr-2 lg:pr-4">
              <button 
                onClick={() => setIsToolboxVisible(!isToolboxVisible)}
                className={cn(
                  "flex items-center space-x-2 px-2 lg:px-3 py-1.5 rounded text-sm font-bold transition-colors",
                  isToolboxVisible ? "bg-[#ff444f] text-white" : "text-[#aaaaaa] hover:text-white hover:bg-[#2d2f2f]"
                )}
              >
                <Layout size={18} />
                <span className="hidden lg:inline">Blocks</span>
              </button>
              <button 
                onClick={() => setIsRunPanelOpen(!isRunPanelOpen)}
                className={cn(
                  "flex items-center space-x-2 px-2 lg:px-3 py-1.5 rounded text-sm font-bold transition-colors",
                  isRunPanelOpen ? "bg-[#ff444f] text-white" : "text-[#aaaaaa] hover:text-white hover:bg-[#2d2f2f]"
                )}
              >
                <Activity size={18} />
                <span className="hidden lg:inline">Run Panel</span>
              </button>
            </div>

            <div className="flex items-center space-x-1 border-r border-[#2d2f2f] pr-2 lg:pr-4">
              <button 
                onClick={handleSaveWorkspace}
                className="p-2 text-[#aaaaaa] hover:text-white hover:bg-[#2d2f2f] rounded transition-colors" 
                title="Save"
              >
                <Save size={18} />
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-[#aaaaaa] hover:text-white hover:bg-[#2d2f2f] rounded transition-colors" 
                title="Import"
              >
                <FolderOpen size={18} />
              </button>
              <button 
                onClick={handleQuickStrategy}
                className="p-2 text-[#aaaaaa] hover:text-white hover:bg-[#2d2f2f] rounded transition-colors" 
                title="Quick Strategy"
              >
                <Zap size={18} />
              </button>
              <button 
                onClick={handleTutorial}
                className="p-2 text-[#aaaaaa] hover:text-white hover:bg-[#2d2f2f] rounded transition-colors hidden lg:block" 
                title="Tutorial"
              >
                <HelpCircle size={18} />
              </button>
            </div>

            <div className="flex items-center space-x-1">
              <button 
                onClick={handleZoomIn}
                className="p-2 text-[#aaaaaa] hover:text-white hover:bg-[#2d2f2f] rounded transition-colors" 
                title="Zoom In"
              >
                <Plus size={18} />
              </button>
              <button 
                onClick={handleZoomOut}
                className="p-2 text-[#aaaaaa] hover:text-white hover:bg-[#2d2f2f] rounded transition-colors" 
                title="Zoom Out"
              >
                <Minus size={18} />
              </button>
              <button 
                onClick={handleResetZoom}
                className="p-2 text-[#aaaaaa] hover:text-white hover:bg-[#2d2f2f] rounded transition-colors" 
                title="Reset Zoom"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>

          <div ref={blocklyDiv} className="flex-1 w-full theme--dark" />
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileImport} 
            accept=".xml" 
            className="hidden" 
          />

          {/* Mobile Run Panel Toggle */}
          <div className="lg:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
            <button
              onClick={() => setIsRunPanelOpen(true)}
              className="bg-[#ff444f] text-white px-8 py-3 rounded-full font-bold shadow-[0_8px_30px_rgb(255,68,79,0.4)] flex items-center space-x-3 active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Play size={18} fill="currentColor" />
              </div>
              <span className="text-sm tracking-wide uppercase">Run Panel</span>
            </button>
          </div>
        </main>

        {/* Right Sidebar (RunPanel) */}
        <AnimatePresence>
          {isRunPanelOpen && (
            <motion.aside 
              initial={isMobile ? { y: '100%' } : { width: 0 }}
              animate={isMobile ? { y: 0 } : { width: 320 }}
              exit={isMobile ? { y: '100%' } : { width: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={cn(
                "border-[#2d2f2f] bg-[#151717] flex flex-col shrink-0 relative overflow-hidden",
                "fixed inset-x-0 bottom-0 h-[85vh] z-[90] border-t rounded-t-2xl lg:rounded-none lg:static lg:h-full lg:border-l shadow-2xl lg:shadow-none"
              )}
            >
              {/* Mobile Drag Handle */}
              <div className="lg:hidden h-10 flex items-center justify-center cursor-pointer group" onClick={() => setIsRunPanelOpen(false)}>
                <div className="w-12 h-1.5 bg-[#2d2f2f] group-hover:bg-[#3d3f3f] rounded-full transition-colors" />
              </div>

              {/* RunPanelHeader */}
              <div className="flex items-center h-14 border-b border-[#2d2f2f] bg-[#0e0e0e] p-2 space-x-2">
                <button
                  onClick={handleRunBot}
                  className={cn(
                    "flex items-center justify-center px-4 h-10 rounded font-bold text-sm transition-colors min-w-[100px]",
                    isBotRunning ? "bg-[#ff444f] text-white" : "bg-[#00a79e] text-white"
                  )}
                >
                  {isBotRunning ? <Square size={16} fill="currentColor" className="mr-2" /> : <Play size={16} fill="currentColor" className="mr-2" />}
                  <span>{isBotRunning ? 'Stop' : 'Run'}</span>
                </button>
                <div className="flex-1 h-10 border border-[#2d2f2f] rounded bg-[#151717] flex flex-col items-center justify-center px-2 relative overflow-hidden">
                  <span className="text-[11px] text-white font-bold z-10 flex items-center">
                    {isBotRunning && (botStatus === 'Buying contract' || botStatus === 'Contract bought') && (
                      <Loader2 size={12} className="mr-1.5 animate-spin text-[#4CAF50]" />
                    )}
                    {botStatus}
                  </span>
                  <div className="absolute bottom-1 left-2 right-2 h-1 bg-[#2d2f2f] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${progress}%`,
                        backgroundColor: botStatus === 'Buying contract' ? '#ffc107' : '#4CAF50'
                      }}
                      transition={{ duration: 0.3 }}
                      className="h-full"
                    />
                  </div>
                </div>
                {/* Mobile Close Button */}
                <button 
                  onClick={() => setIsRunPanelOpen(false)}
                  className="lg:hidden p-2 text-[#aaaaaa] hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

          {/* RunPanel Tabs */}
          <div className="flex border-b border-[#2d2f2f] h-12 bg-[#151717]">
            {[
              { id: 'summary', label: 'Summary' },
              { id: 'transactions', label: 'Transactions' },
              { id: 'journal', label: 'Journal' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center text-sm font-bold transition-colors relative",
                  activeTab === tab.id 
                    ? "text-white" 
                    : "text-[#aaaaaa] hover:text-white"
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#ff444f]" />
                )}
              </button>
            ))}
          </div>

          {/* RunPanel Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#151717]">
            {activeTab === 'summary' && (
              <div className="p-4 space-y-4">
                <div className="bg-[#0e0e0e] p-4 rounded border border-[#2d2f2f]">
                  <h4 className="text-xs font-bold text-[#aaaaaa] mb-3 uppercase tracking-wider">Account Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-[#888888]">Total Runs</span>
                      <span className="text-xs font-bold text-white">{stats.totalRuns}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-[#888888]">Current Balance</span>
                      <span className="text-xs font-bold text-white">{stats.balance.toFixed(2)} USD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-[#888888]">Total Profit</span>
                      <span className={cn("text-xs font-bold", stats.totalProfit >= 0 ? "text-[#4CAF50]" : "text-[#ff444f]")}>
                        {stats.totalProfit.toFixed(2)} USD
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-[#888888]">Total Payout</span>
                      <span className="text-xs font-bold text-white">
                        {stats.totalPayout.toFixed(2)} USD
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-[#888888]">Win Rate</span>
                      <span className="text-xs font-bold text-white">
                        {stats.totalRuns > 0 ? ((stats.contractsWon / stats.totalRuns) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-[#0e0e0e] p-4 rounded border border-[#2d2f2f]">
                  <h4 className="text-xs font-bold text-[#aaaaaa] mb-3 uppercase tracking-wider">Last Contract</h4>
                  {transactions.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-[#888888]">Result</span>
                        <span className={cn("text-xs font-bold", transactions[0].result === 'win' ? "text-[#4CAF50]" : "text-[#ff444f]")}>
                          {transactions[0].result.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-[#888888]">Profit</span>
                        <span className={cn("text-xs font-bold", transactions[0].profit >= 0 ? "text-[#4CAF50]" : "text-[#ff444f]")}>
                          {transactions[0].profit.toFixed(2)} USD
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#555] italic">No contracts yet</p>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'transactions' && (
              <div className="flex flex-col h-full">
                <div className="p-4 flex space-x-2">
                  <button 
                    onClick={() => {
                      const data = JSON.stringify(transactions, null, 2);
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `transactions-${new Date().getTime()}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 border border-[#2d2f2f] rounded text-xs font-bold text-[#aaaaaa] hover:text-white hover:bg-[#2d2f2f] transition-colors"
                  >
                    <Download size={14} />
                    <span>Download</span>
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 border border-[#2d2f2f] rounded text-xs font-bold text-[#aaaaaa] hover:text-white hover:bg-[#2d2f2f] transition-colors">
                    <Eye size={14} />
                    <span>View Detail</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-3 px-4 py-2 text-[10px] uppercase tracking-wider font-bold text-[#aaaaaa] border-b border-[#2d2f2f]">
                  <span>Type</span>
                  <span>Entry/Exit spot</span>
                  <span>Buy price and P/L</span>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  <AnimatePresence initial={false}>
                    {transactions.length > 0 ? (
                      transactions.map((tx, idx) => (
                        <motion.div 
                          key={tx.id}
                          initial={{ x: 320, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: -320, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          className={cn(
                            "grid grid-cols-3 px-4 py-3 text-[11px] border-b border-[#2d2f2f]/50 hover:bg-[#1a1c1c] items-center relative overflow-hidden",
                            tx.result === 'pending' && "bg-[#1a1c1c]/50"
                          )}
                        >
                          {tx.result === 'pending' && (
                            <div className="animate-shimmer" />
                          )}
                          <div className="flex items-center space-x-2">
                            <div className={cn(
                              "w-8 h-8 flex items-center justify-center rounded transition-colors relative",
                              tx.result === 'pending' ? "bg-[#2d2f2f]" : (tx.profit >= 0 ? "bg-[#4CAF50]" : "bg-[#ff444f]")
                            )}>
                              {tx.result === 'pending' ? (
                                <>
                                  <Loader2 size={16} className="animate-spin text-[#aaaaaa]" />
                                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#ffc107] rounded-full border-2 border-[#151717] animate-pulse" />
                                </>
                              ) : (
                                CONTRACT_ICONS[tx.type.toUpperCase()] || (tx.profit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />)
                              )}
                            </div>
                            <span className="text-white font-bold">{tx.type}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className={cn("font-bold", tx.result === 'pending' ? "text-[#aaaaaa] italic" : "text-white")}>
                              {tx.entrySpot}
                            </span>
                            <span className="text-[#888888]">{tx.exitSpot}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white font-bold">{tx.buyPrice.toFixed(2)} USD</span>
                            {tx.result === 'pending' ? (
                              <span className="text-[#ffc107] font-bold flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#ffc107] mr-1.5 animate-pulse" />
                                Waiting...
                              </span>
                            ) : (
                              <span className={cn("font-bold", tx.profit >= 0 ? "text-[#4CAF50]" : "text-[#ff444f]")}>
                                {tx.profit >= 0 ? '+' : ''}{tx.profit.toFixed(2)} USD
                              </span>
                            )}
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center mt-10">
                        <Package size={64} className="text-[#2d2f2f] mb-4" />
                        <h3 className="text-sm font-bold text-[#aaaaaa] mb-2">There are no transactions to display</h3>
                        <p className="text-xs text-[#555]">Here are the possible reasons:</p>
                        <ul className="text-xs text-[#555] list-disc list-inside mt-2">
                          <li>The bot is not running</li>
                          <li>The stats are cleared</li>
                        </ul>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
            {activeTab === 'journal' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {journal.length > 0 ? (
                    journal.map((msg, idx) => (
                      <div key={idx} className="text-[11px] p-2 rounded bg-[#0e0e0e] border-l-2 border-[#2d2f2f]" style={{ borderLeftColor: msg.type === 'error' ? '#ff444f' : msg.type === 'success' ? '#4CAF50' : msg.type === 'warn' ? '#ffc107' : '#2196F3' }}>
                        <div className="flex justify-between mb-1">
                          <span className="text-[9px] text-[#555]">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                          <span className="text-[9px] uppercase font-bold opacity-70">{msg.type}</span>
                        </div>
                        <p className="text-white">{msg.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-[#aaaaaa] text-sm">
                      Journal is empty.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Stats Footer */}
          <div className="p-4 border-t border-[#2d2f2f] bg-[#0e0e0e]">
            <div className="flex justify-end mb-2">
              <button className="text-[10px] text-[#aaaaaa] hover:text-white underline decoration-dotted">What's this?</button>
            </div>
            <div className="grid grid-cols-3 gap-y-4 mb-6">
              <div className="text-center">
                <p className="text-[11px] text-[#aaaaaa] font-bold mb-1">Total stake</p>
                <p className="text-xs font-bold text-white">{stats.totalStake.toFixed(2)} USD</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-[#aaaaaa] font-bold mb-1">Total payout</p>
                <p className="text-xs font-bold text-white">{stats.totalPayout.toFixed(2)} USD</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-[#aaaaaa] font-bold mb-1">No. of runs</p>
                <p className="text-xs font-bold text-white">{stats.totalRuns}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-[#aaaaaa] font-bold mb-1">Contracts lost</p>
                <p className="text-xs font-bold text-white">{stats.contractsLost}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-[#aaaaaa] font-bold mb-1">Contracts won</p>
                <p className="text-xs font-bold text-white">{stats.contractsWon}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-[#aaaaaa] font-bold mb-1">Total profit/loss</p>
                <p className={cn("text-xs font-bold", stats.totalProfit >= 0 ? "text-[#4CAF50]" : "text-[#ff444f]")}>
                  {stats.totalProfit.toFixed(2)} USD
                </p>
              </div>
            </div>
            <button 
              onClick={() => {
                botEngine.resetStats();
              }}
              className="w-full border border-[#2d2f2f] hover:bg-[#2d2f2f] text-white font-bold py-2 rounded transition-colors text-sm"
            >
              Reset
            </button>
          </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isRunPanelOpen && isMobile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[85]" 
            onClick={() => setIsRunPanelOpen(false)}
          />
        )}
      </AnimatePresence>
      <AIAssistant 
        workspace={workspaceInstance} 
        isOpen={isAIAssistantOpen} 
        setIsOpen={setIsAIAssistantOpen} 
      />
    </div>
  );
}
