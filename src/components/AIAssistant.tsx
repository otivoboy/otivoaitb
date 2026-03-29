import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Loader2, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import * as Blockly from 'blockly';

interface AIAssistantProps {
  workspace: Blockly.WorkspaceSvg | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ workspace, isOpen, setIsOpen }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateStrategy = async () => {
    console.log("Generate strategy called. Prompt:", prompt, "Workspace:", !!workspace);
    if (!prompt.trim() || !workspace) {
      if (!workspace) console.warn("Workspace is not ready yet.");
      return;
    }

    const userMessage = prompt;
    const currentXml = workspace ? Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace)) : '';
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setPrompt('');
    setIsLoading(true);

    try {
      console.log("Initializing Gemini API...");
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process.env as any).GEMINI_API_KEY;
      
      if (!apiKey) {
        console.error("Gemini API Key is missing.");
        setMessages(prev => [...prev, { role: 'ai', content: "Error: Gemini API Key is missing. Please ensure it is set in the environment variables." }]);
        setIsLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";

      const history = messages.map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const systemInstruction = `
        You are an expert Binary/Deriv Bot developer for the Otivo AI project. Your task is to generate Blockly XML for a trading strategy based on the user's request.
        
        CURRENT WORKSPACE XML:
        ${currentXml}
        
        If the user asks to "update", "change", "add", or "modify" something, you MUST use the CURRENT WORKSPACE XML as a base and return the FULL updated XML.
        
        CRITICAL CONSTRAINTS:
        1. Number of Ticks: For "Rise/Fall" (callput) contracts, the DURATION must be between 5 and 10 ticks. Default to 5 if not specified.
        2. Prediction Barrier: The "PREDICTION" input in "trade_definition_tradeoptions" should ONLY be used for "Over/Under" (overunder) and "Matches/Differs" (matchdiff) contract types. For other types, do not include the PREDICTION value input.
        3. Block Arrangement: Ensure all blocks are correctly nested. The "trade_definition" is the root.
        
        AVAILABLE BLOCKS:
        - trade_definition: Root block. Inputs: INITIALIZATION (statement), TRADE_OPTIONS (statement), SUBMARKET (statement).
        - trade_definition_market: Fields "MARKET_LIST", "SUBMARKET_LIST", "SYMBOL_LIST".
        - trade_definition_tradetype: Fields "TRADETYPECAT_LIST", "TRADETYPE_LIST".
        - trade_definition_contracttype: Field "TYPE_LIST".
        - trade_definition_candleinterval: Field "CANDLEINTERVAL_LIST".
        - trade_definition_restartbuysell: Field "TIME_MACHINE_ENABLED" (TRUE/FALSE).
        - trade_definition_restartonerror: Field "RESTARTONERROR" (TRUE/FALSE).
        - trade_definition_tradeoptions: 
            - Field "DURATIONTYPE_LIST" (t, s, m, h, d). Use 't' for ticks.
            - Value input "DURATION": Number of ticks/seconds.
            - Value input "AMOUNT": Stake amount (can be a math_number or variables_get).
            - Value input "PREDICTION": Only for digits/overunder.
        - trade_definition_accumulator:
            - Field "GROWTH_RATE" (0.01, 0.02, 0.03, 0.04, 0.05).
            - Value input "AMOUNT": Stake amount.
            - Value input "TAKE_PROFIT": Take profit amount.
        - before_purchase: Root block for purchase logic. Input "BEFOREPURCHASE_STACK" (statement).
        - purchase: Field "PURCHASE_LIST" (RISE, FALL, DIGITMATCH, DIGITDIFF, DIGITOVER, DIGITUNDER, ACCU, DIGITEVEN, DIGITODD). Use "DIGITDIFF" for "differ" bots.
        - after_purchase: Root block for restart logic. Input "AFTERPURCHASE_STACK" (statement).
        - trade_again: Statement block to restart trading.
        - notify: Field "NOTIFICATION_TYPE" (success, warn, info, error). Field "NOTIFICATION_SOUND" (silent, announcement). Value input "MESSAGE".
        - text: Field "TEXT".
        - text_join: Statement input "STACK" (text_statement).
        - math_number: Field "NUM".
        - math_arithmetic: Fields "OP" (ADD, MINUS, MULTIPLY, DIVIDE). Inputs "A", "B".
        - logic_compare: Fields "OP" (EQ, NEQ, LT, LTE, GT, GTE). Inputs "A", "B".
        - controls_if: Statement input "IF0" (logic), "DO0" (statement). Use <mutation else="1"></mutation> inside the block to add an "ELSE" statement input "ELSE".
        - contract_check_result: Field "CHECK_RESULT" (win, loss). Output: Boolean.
        - variables_set: Field "VAR". Value input "VALUE".
        - variables_get: Field "VAR". Output: null.
        - last_digit: Returns the last digit of the current tick. Output: Number.
        - least_digit: Returns the least frequent digit from the last 100 ticks. Output: Number.
        - total_profit: Returns the total profit/loss. Output: Number.
        - total_runs: Returns the total number of runs. Output: Number.
        - total_win: Returns the total number of wins. Output: Number.
        - total_loss: Returns the total number of losses. Output: Number.
        - math_on_list: Field "OP" (SUM, MIN, MAX, AVERAGE, MEDIAN, MODE, STD_DEV, RANDOM). Value input "LIST". Output: Number.
        - math_single: Field "OP" (ROOT, ABS, NEG, LN, LOG10, EXP, POW10). Value input "NUM". Output: Number.
        - math_round: Field "OP" (ROUND, ROUNDUP, ROUNDDOWN). Value input "NUM". Output: Number.
        - timeout: Value input "SECONDS". Statement input "STACK" (then do).
        - procedures_defnoreturn: Root block for a function without return. Field "NAME". Input "STACK" (statement).
        - procedures_defreturn: Root block for a function with return. Field "NAME". Input "STACK" (statement). Input "RETURN" (value).
        - procedures_callnoreturn: Statement block to call a function. Field "NAME".
        - procedures_callreturn: Value block to call a function. Field "NAME". Output: null.
        - lists_create_with: Value block to create a list. Input "ADD0", "ADD1", etc. Output: Array.
        - lists_getIndex: Value block to get an item from a list. Field "MODE" (GET, GET_REMOVE, REMOVE). Field "WHERE" (FROM_START, FROM_END, FIRST, LAST, RANDOM). Input "VALUE" (list). Output: null.
        - lists_setIndex: Statement block to set an item in a list. Field "MODE" (SET, INSERT). Field "WHERE" (FROM_START, FROM_END, FIRST, LAST, RANDOM). Input "LIST" (list). Input "TO" (value).
        
        XML STRUCTURE RULES:
        - Use <xml xmlns="https://developers.google.com/blockly/xml"> as the root.
        - "trade_definition" should be at x="50", y="50".
        - Inside "SUBMARKET" statement of "trade_definition", chain: market -> tradetype -> contracttype -> candleinterval -> restartbuysell -> restartonerror.
        - Inside "TRADE_OPTIONS" statement of "trade_definition", use (tradeoptions OR trade_definition_accumulator).
        - For Martingale:
            1. Initialize a variable (e.g., "stake") in "INITIALIZATION" of "trade_definition".
            2. Use "variables_get" with the SAME variable name in "AMOUNT" of "trade_definition_tradeoptions" or "trade_definition_accumulator".
            3. In "after_purchase", use "controls_if" with "contract_check_result" to check for a loss.
            4. If loss, multiply the SAME "stake" variable. If win, reset it to initial value.
            5. ALWAYS use the same variable name (e.g., "stake") throughout the strategy.
        - For "least digit prediction":
            1. Use the "least_digit" block as the value input for "PREDICTION" in "trade_definition_tradeoptions".
        - For "Accumulator Percentage Strategy" (Professional Design):
            1. In "INITIALIZATION", set variables: "Take Profit", "Stop Loss", "Win Amount", "Initial Amount" (set to Win Amount), "Martingale Multiplier", "Accumulator Rate" (e.g., 5 for 5%), "Limit Order" (if mentioned).
            2. In "before_purchase", use "purchase" block with "ACCU" type.
            3. In "after_purchase", handle Result is Loss (using contract_check_result):
               - Multiply "Initial Amount" by "Martingale Multiplier".
               - If "Initial Amount" > "Stop Loss", reset to "Win Amount".
            4. In "after_purchase", handle Result is Win (using contract_check_result):
               - Reset "Initial Amount" to "Win Amount".
            5. Add Total Profit check: if (total_profit >= "Take Profit") then notify "Target Hit" and STOP.
            6. Add Stop Loss check: if (total_profit < 0 AND absolute(total_profit) >= "Stop Loss") then notify "Stoploss hit" and STOP.
            7. If the user mentions a delay (e.g., "after 7 sec"), wrap the "purchase" block in "before_purchase" with a "timeout" block.
        - For "Even/Odd Switcher Strategy" (Professional Design):
            1. In "INITIALIZATION", set variables: "Max Loss Amount", "Expected Profit", "Win Amount", "Initial Amount" (set to Win Amount), "Loss" (set to 0), "Loss tick" (create empty list), "Next Trade Condition" (set to "Even").
            2. In "before_purchase", use "controls_if" to check if "Next Trade Condition" is "Even" then purchase DIGITEVEN, else purchase DIGITODD.
            3. In "after_purchase", handle Result is Loss (using contract_check_result):
               - Toggle "Next Trade Condition": if "Even" then set to "Odd", else set to "Even".
               - Increment "Loss" by 1.
               - Notify "Your Trade Lost: " + absolute(read_details: profit).
               - Multiply "Initial Amount" by 2.5 (Martingale).
               - If "Initial Amount" > "Max Loss Amount", reset "Initial Amount" to "Win Amount".
            4. In "after_purchase", handle Result is Win (using contract_check_result):
               - Notify "Your Trade Won: " + read_details: profit.
               - Reset "Initial Amount" to "Win Amount".
               - Reset "Loss" to 0.
            5. In "after_purchase" (outside win/loss if), insert "last_tick" at LAST of "Loss tick" list using "lists_setIndex".
            6. Notify "YOUR TOTAL PROFIT $" + total_profit.
            7. Notify "Martingale Level >>" + max of list "Loss tick" using "math_on_list".
        - For "delayed purchase":
            1. In "before_purchase", wrap the "purchase" block inside a "timeout" block to wait for a specific number of seconds before buying.
        - ALWAYS include "trade_again" at the end of the "AFTERPURCHASE_STACK" in "after_purchase".
        - "before_purchase" should be at x="50", y="600".
        - "after_purchase" should be at x="550", y="250".
        
        EXAMPLE MARTINGALE XML (in after_purchase):
        <block type="after_purchase">
          <statement name="AFTERPURCHASE_STACK">
            <block type="controls_if">
              <value name="IF0">
                <block type="contract_check_result">
                  <field name="CHECK_RESULT">loss</field>
                </block>
              </value>
              <statement name="DO0">
                <block type="variables_set">
                  <field name="VAR">stake</field>
                  <value name="VALUE">
                    <block type="math_arithmetic">
                      <field name="OP">MULTIPLY</field>
                      <value name="A"><block type="variables_get"><field name="VAR">stake</field></block></value>
                      <value name="B"><block type="math_number"><field name="NUM">2</field></block></value>
                    </block>
                  </value>
                </block>
              </statement>
              <next>
                <block type="controls_if">
                  <value name="IF0">
                    <block type="contract_check_result">
                      <field name="CHECK_RESULT">win</field>
                    </block>
                  </value>
                  <statement name="DO0">
                    <block type="variables_set">
                      <field name="VAR">stake</field>
                      <value name="VALUE"><block type="math_number"><field name="NUM">1</field></block></value>
                    </block>
                  </statement>
                  <next>
                    <block type="trade_again"></block>
                  </next>
                </block>
              </next>
            </block>
          </statement>
        </block>
        
        EXAMPLE ACCUMULATOR XML:
        <block type="trade_definition_accumulator">
          <field name="GROWTH_RATE">0.05</field>
          <value name="AMOUNT"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
          <value name="TAKE_PROFIT"><shadow type="math_number"><field name="NUM">0.1</field></shadow></value>
        </block>
        
        OUTPUT ONLY THE XML. NO MARKDOWN. NO EXPLANATION.
      `;

      const response = await ai.models.generateContent({
        model: model,
        contents: [...history, { role: 'user', parts: [{ text: userMessage }] }],
        config: {
          systemInstruction: systemInstruction,
        },
      });

      console.log("Gemini response received:", response);
      const xmlText = response.text.trim().replace(/```xml/g, '').replace(/```/g, '');
      
      if (xmlText.includes('<xml')) {
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, "text/xml");
          
          // Clear workspace and load new XML
          workspace.clear();
          Blockly.Xml.domToWorkspace(xmlDoc.documentElement, workspace);
          
          // Arrange blocks
          if (typeof (workspace as any).cleanUp === 'function') {
            (workspace as any).cleanUp();
          }
          
          setMessages(prev => [...prev, { role: 'ai', content: "I've generated and loaded the strategy for you! You can now review it on the workspace." }]);
        } catch (err) {
          console.error("XML Parsing Error:", err);
          setMessages(prev => [...prev, { role: 'ai', content: "I generated a strategy, but there was an error loading it into the workspace. Please try again with a simpler prompt." }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: response.text }]);
      }

    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I encountered an error while generating your strategy. Please check your API key or try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#ff444f] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-[9999] group overflow-hidden"
        title="OTIVO AI Assistant"
      >
        <img src="/logo.png" alt="Logo" className="w-8 h-8 animate-rotate" referrerPolicy="no-referrer" />
        <span className="absolute right-16 bg-[#151717] text-white text-xs px-2 py-1 rounded border border-[#2d2f2f] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          OTIVO AI Assistant
        </span>
      </button>

      {/* Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-0 right-0 w-full h-full md:bottom-24 md:right-6 md:w-96 md:h-[500px] bg-[#151717] border-t md:border border-[#2d2f2f] md:rounded-xl shadow-2xl flex flex-col z-[9999] overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-[#2d2f2f] flex items-center justify-between bg-[#0e0e0e]">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-[#ff444f] rounded-lg flex items-center justify-center overflow-hidden">
                  <img src="/logo.png" alt="Logo" className="w-6 h-6 animate-rotate" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">OTIVO AI</h3>
                  <p className="text-[10px] text-[#aaaaaa]">Strategy Builder</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {messages.length > 0 && (
                  <button 
                    onClick={() => setMessages([])}
                    className="text-[10px] text-[#555] hover:text-[#ff444f] transition-colors"
                  >
                    Clear Chat
                  </button>
                )}
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-[#aaaaaa] hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                  <MessageSquare size={48} className="text-[#2d2f2f]" />
                  <p className="text-xs text-[#aaaaaa] max-w-[200px]">
                    Tell me what strategy you want to build, and I'll create the blocks for you!
                  </p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div 
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-3 rounded-lg text-xs ${
                    msg.role === 'user' 
                      ? 'bg-[#ff444f] text-white rounded-tr-none' 
                      : 'bg-[#0e0e0e] text-[#aaaaaa] border border-[#2d2f2f] rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#0e0e0e] border border-[#2d2f2f] p-3 rounded-lg rounded-tl-none">
                    <Loader2 size={16} className="text-[#ff444f] animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-[#2d2f2f] bg-[#0e0e0e]">
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      generateStrategy();
                    }
                  }}
                  placeholder="Describe your strategy..."
                  className="w-full bg-[#151717] border border-[#2d2f2f] rounded-lg py-3 pl-4 pr-12 text-xs text-white focus:outline-none focus:border-[#ff444f] transition-colors resize-none h-20"
                />
                <button
                  onClick={generateStrategy}
                  disabled={isLoading || !prompt.trim()}
                  className="absolute right-3 bottom-3 p-1.5 bg-[#ff444f] text-white rounded-md hover:bg-[#ff444f]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>
              <p className="text-[9px] text-[#555] mt-2 text-center">
                AI can make mistakes. Review the generated blocks carefully.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant;
