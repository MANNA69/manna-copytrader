// Application state
const state = {
  masterToken: '',
  followerTokens: '',
  isConnected: false,
  isCopying: false,
  connectionStatus: 'disconnected',
  logs: [],
  history: [],
  error: null,
  copyRatio: 1,
  maxStake: 100,
  masterSocket: null,
  followerSockets: {},
  symbolFilters: {
      'EURUSD': true,
      'GBPUSD': true,
      'USDJPY': true,
      'AUDUSD': true
  },
  stats: {
      totalTrades: 0,
      successfulTrades: 0,
      totalProfit: 0
  }
};

// DOM elements - will be populated when DOM is loaded
let elements = {};

// Initialize the application
function init() {
  // Get DOM elements
  elements = {
      tabTriggers: document.querySelectorAll('.tab-trigger'),
      tabContents: document.querySelectorAll('.tab-content'),
      masterTokenInput: document.getElementById('master-token'),
      followerTokensInput: document.getElementById('follower-tokens'),
      copyRatioSlider: document.getElementById('copy-ratio'),
      copyRatioValue: document.getElementById('copy-ratio-value'),
      maxStakeSlider: document.getElementById('max-stake'),
      maxStakeValue: document.getElementById('max-stake-value'),
      toggleCopyingButton: document.getElementById('toggle-copying'),
      connectionStatus: document.getElementById('connection-status'),
      errorContainer: document.getElementById('error-container'),
      logsContainer: document.getElementById('logs-container'),
      historyTableBody: document.getElementById('history-table-body'),
      symbolFilters: document.querySelectorAll('.symbol-filter'),
      totalTradesElement: document.getElementById('total-trades'),
      successRateElement: document.getElementById('success-rate'),
      totalProfitElement: document.getElementById('total-profit')
  };

  // Set up event listeners
  setupEventListeners();
  
  // Update UI based on initial state
  updateUI();
}

// Set up event listeners
function setupEventListeners() {
  // Tab switching
  elements.tabTriggers.forEach(trigger => {
      trigger.addEventListener('click', () => {
          const tabId = trigger.dataset.tab;
          switchTab(tabId);
      });
  });

  // Input changes
  elements.masterTokenInput.addEventListener('input', (e) => {
      state.masterToken = e.target.value;
  });

  elements.followerTokensInput.addEventListener('input', (e) => {
      state.followerTokens = e.target.value;
  });

  // Slider changes
  elements.copyRatioSlider.addEventListener('input', (e) => {
      state.copyRatio = parseFloat(e.target.value);
      elements.copyRatioValue.textContent = state.copyRatio.toFixed(1);
      saveSettings();
  });

  elements.maxStakeSlider.addEventListener('input', (e) => {
      state.maxStake = parseInt(e.target.value);
      elements.maxStakeValue.textContent = state.maxStake;
      saveSettings();
  });

  // Symbol filter changes
  elements.symbolFilters.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
          state.symbolFilters[e.target.value] = e.target.checked;
          saveSettings();
      });
  });

  // Toggle copying button
  elements.toggleCopyingButton.addEventListener('click', () => {
      if (state.isCopying) {
          stopCopying();
      } else {
          startCopying();
      }
  });
}

// Switch between tabs
function switchTab(tabId) {
  elements.tabTriggers.forEach(trigger => {
      trigger.classList.toggle('active', trigger.dataset.tab === tabId);
  });

  elements.tabContents.forEach(content => {
      content.classList.toggle('active', content.id === tabId);
  });
}

// Update UI based on current state
function updateUI() {
  // Update connection status badge
  let statusHTML = '';
  if (state.connectionStatus === 'connected') {
      statusHTML = '<span class="badge badge-success">Connected</span>';
  } else if (state.connectionStatus === 'connecting') {
      statusHTML = '<span class="badge badge-warning">Connecting...</span>';
  } else if (state.connectionStatus === 'error') {
      statusHTML = '<span class="badge badge-error">Connection Error</span>';
  }
  elements.connectionStatus.innerHTML = statusHTML;

  // Update error message
  if (state.error) {
      elements.errorContainer.innerHTML = `
          <div class="alert alert-destructive">
              <svg class="alert-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div>
                  <div class="alert-title">Error</div>
                  <div class="alert-description">${state.error}</div>
              </div>
          </div>
      `;
  } else {
      elements.errorContainer.innerHTML = '';
  }

  // Update button text
  elements.toggleCopyingButton.textContent = state.isCopying ? 'Stop Copying' : 'Start Copying';
  elements.toggleCopyingButton.className = state.isCopying ? 'button button-destructive' : 'button button-primary';

  // Disable inputs when copying
  elements.masterTokenInput.disabled = state.isCopying;
  elements.followerTokensInput.disabled = state.isCopying;
  elements.copyRatioSlider.disabled = state.isCopying;
  elements.maxStakeSlider.disabled = state.isCopying;
  elements.symbolFilters.forEach(checkbox => {
      checkbox.disabled = state.isCopying;
  });

  // Update logs
  updateLogs();

  // Update history
  updateHistory();

  // Update statistics
  updateStats();
}

// Update logs display
function updateLogs() {
  if (state.logs.length === 0) {
      elements.logsContainer.innerHTML = '<p>No logs yet. Start copy trading to see activity.</p>';
  } else {
      elements.logsContainer.innerHTML = state.logs.map(log => {
          return `
              <div class="log-entry">
                  <span class="log-timestamp">[${log.timestamp}]</span> ${log.message}
              </div>
          `;
      }).join('');
  }
}

// Update history display
function updateHistory() {
  if (state.history.length === 0) {
      elements.historyTableBody.innerHTML = `
          <tr>
              <td colspan="4" style="text-align: center;">No trade history yet</td>
          </tr>
      `;
  } else {
      elements.historyTableBody.innerHTML = state.history.map(entry => {
          return `
              <tr>
                  <td>${new Date(entry.time).toLocaleString()}</td>
                  <td><span class="badge badge-${entry.action === 'buy' ? 'buy' : 'sell'}">${entry.action}</span></td>
                  <td>${entry.symbol}</td>
                  <td>$${entry.amount}</td>
              </tr>
          `;
      }).join('');
  }
}

// Update statistics
function updateStats() {
  elements.totalTradesElement.textContent = state.stats.totalTrades;
  
  const successRate = state.stats.totalTrades > 0 
      ? Math.round((state.stats.successfulTrades / state.stats.totalTrades) * 100) 
      : 0;
  elements.successRateElement.textContent = `${successRate}%`;
  
  elements.totalProfitElement.textContent = `$${state.stats.totalProfit.toFixed(2)}`;
}

// Add a log entry
function addLog(message) {
  const timestamp = new Date().toLocaleTimeString();
  state.logs = [{ timestamp, message }, ...state.logs].slice(0, 100);
  updateLogs();
}

// Add a history entry
function addHistory(entry) {
  state.history = [entry, ...state.history].slice(0, 100);
  
  // Update statistics
  state.stats.totalTrades++;
  if (entry.profit > 0) {
      state.stats.successfulTrades++;
  }
  state.stats.totalProfit += entry.profit || 0;
  
  updateHistory();
  updateStats();
  saveHistory();
}

// Connect to Deriv API
function connectToDerivAPI(token) {
  return new Promise((resolve, reject) => {
      if (!validateToken(token)) {
          reject(new Error('Invalid token format'));
          return;
      }

      const socket = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');

      socket.onopen = () => {
          // Authorize with token
          socket.send(JSON.stringify({
              authorize: token
          }));
      };

      socket.onmessage = (msg) => {
          const data = JSON.parse(msg.data);

          // Handle authorization response
          if (data.msg_type === 'authorize') {
              if (data.error) {
                  addLog(`Authorization failed: ${data.error.message}`);
                  reject(new Error(data.error.message));
                  socket.close();
              } else {
                  addLog(`Successfully authorized account: ${data.authorize.email}`);
                  
                  // Check token permissions
                  checkTokenPermissions(socket, ['read', 'trade'])
                      .then(() => resolve(socket))
                      .catch(error => {
                          reject(error);
                          socket.close();
                      });
              }
          }
      };

      socket.onerror = (error) => {
          addLog(`WebSocket error: ${error}`);
          reject(error);
      };

      socket.onclose = () => {
          addLog('WebSocket connection closed');
      };
  });
}

// Start copying trades
async function startCopying() {
  try {
      state.error = null;

      // Validate inputs
      if (!state.masterToken.trim()) {
          throw new Error('Master token is required');
      }

      const followerTokensList = state.followerTokens
          .split(',')
          .map(token => token.trim())
          .filter(token => token.length > 0);

      if (followerTokensList.length === 0) {
          throw new Error('At least one follower token is required');
      }

      state.connectionStatus = 'connecting';
      addLog('Connecting to Deriv API...');
      updateUI();

      // Connect master account
      state.masterSocket = await connectToDerivAPI(state.masterToken);

      // Connect follower accounts
      for (const token of followerTokensList) {
          try {
              state.followerSockets[token] = await connectToDerivAPI(token);
          } catch (error) {
              addLog(`Failed to connect follower account with token ${token.substring(0, 5)}...`);
          }
      }

      // Subscribe to transactions on master account
      if (state.masterSocket) {
          state.masterSocket.send(JSON.stringify({
              transaction: 1,
              subscribe: 1
          }));

          state.masterSocket.onmessage = (msg) => {
              const data = JSON.parse(msg.data);

              // Handle transaction updates
              if (data.msg_type === 'transaction') {
                  handleMasterTransaction(data.transaction);
              }
          };
      }

      state.connectionStatus = 'connected';
      state.isConnected = true;
      state.isCopying = true;
      addLog('Copy trading started successfully');
      updateUI();
  } catch (error) {
      state.error = error.message;
      state.connectionStatus = 'error';
      addLog(`Error: ${error.message}`);

      // Clean up connections on error
      if (state.masterSocket) {
          state.masterSocket.close();
          state.masterSocket = null;
      }

      Object.values(state.followerSockets).forEach(socket => socket.close());
      state.followerSockets = {};

      updateUI();
  }
}

// Handle transaction from master account
function handleMasterTransaction(transaction) {
  // Log the transaction
  addLog(`Master transaction: ${transaction.action} ${transaction.amount} on ${transaction.symbol}`);

  // Check if symbol is in the filter list
  if (!state.symbolFilters[transaction.symbol]) {
      addLog(`Skipping transaction for ${transaction.symbol} (filtered out)`);
      return;
  }

  // Only copy buy/sell transactions
  if (transaction.action === 'buy' || transaction.action === 'sell') {
      // Add to history with a random profit/loss for demo purposes
      // In a real implementation, this would come from the actual trade result
      const profit = (Math.random() > 0.5) ? 
          parseFloat((transaction.amount * (Math.random() * 0.2)).toFixed(2)) : 
          parseFloat((-transaction.amount * (Math.random() * 0.1)).toFixed(2));
          
      addHistory({
          time: new Date().toISOString(),
          action: transaction.action,
          symbol: transaction.symbol,
          amount: transaction.amount,
          profit: profit
      });

      // Copy to all follower accounts
      Object.values(state.followerSockets).forEach(socket => {
          // Calculate adjusted stake based on copy ratio and max stake
          let adjustedAmount = transaction.amount * state.copyRatio;
          if (adjustedAmount > state.maxStake) {
              adjustedAmount = state.maxStake;
          }

          // Create equivalent trade on follower account
          socket.send(JSON.stringify({
              buy: 1,
              price: adjustedAmount,
              parameters: {
                  contract_type: transaction.contract_type,
                  symbol: transaction.symbol,
                  duration: transaction.duration,
                  duration_unit: transaction.duration_unit,
                  basis: 'stake'
              }
          }));

          addLog(`Copied trade to follower: ${adjustedAmount} on ${transaction.symbol}`);
      });
  }
}

// Stop copying trades
function stopCopying() {
  // Close all WebSocket connections
  if (state.masterSocket) {
      state.masterSocket.close();
      state.masterSocket = null;
  }

  Object.values(state.followerSockets).forEach(socket => socket.close());
  state.followerSockets = {};

  state.isConnected = false;
  state.isCopying = false;
  state.connectionStatus = 'disconnected';
  addLog('Copy trading stopped');
  updateUI();
}

// Save settings to local storage
function saveSettings() {
  const settings = {
      copyRatio: state.copyRatio,
      maxStake: state.maxStake,
      symbolFilters: state.symbolFilters
  };
  localStorage.setItem('manna-copytrader-settings', JSON.stringify(settings));
}

// Load settings from local storage
function loadSettings() {
  const savedSettings = localStorage.getItem('manna-copytrader-settings');
  if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      state.copyRatio = settings.copyRatio || 1;
      state.maxStake = settings.maxStake || 100;
      
      // Load symbol filters if they exist
      if (settings.symbolFilters) {
          state.symbolFilters = settings.symbolFilters;
          
          // Update checkboxes
          elements.symbolFilters.forEach(checkbox => {
              checkbox.checked = state.symbolFilters[checkbox.value] || false;
          });
      }
      
      // Update UI elements
      if (elements.copyRatioSlider) {
          elements.copyRatioSlider.value = state.copyRatio;
          elements.copyRatioValue.textContent = state.copyRatio.toFixed(1);
      }
      
      if (elements.maxStakeSlider) {
          elements.maxStakeSlider.value = state.maxStake;
          elements.maxStakeValue.textContent = state.maxStake;
      }
  }
}

// Save history to local storage
function saveHistory() {
  localStorage.setItem('manna-copytrader-history', JSON.stringify({
      history: state.history,
      stats: state.stats
  }));
}

// Load history from local storage
function loadHistory() {
  const savedHistory = localStorage.getItem('manna-copytrader-history');
  if (savedHistory) {
      const data = JSON.parse(savedHistory);
      state.history = data.history || [];
      state.stats = data.stats || {
          totalTrades: 0,
          successfulTrades: 0,
          totalProfit: 0
      };
      
      updateHistory();
      updateStats();
  }
}

// Validate token format
function validateToken(token) {
  // Basic validation - tokens are typically alphanumeric and may include hyphens
  const tokenRegex = /^[a-zA-Z0-9_-]{10,}$/;
  return tokenRegex.test(token);
}

// Check if token has required permissions
function checkTokenPermissions(socket, requiredPermissions = ['read', 'trade']) {
  return new Promise((resolve, reject) => {
      socket.send(JSON.stringify({
          get_account_status: 1
      }));
      
      const messageHandler = (msg) => {
          const data = JSON.parse(msg.data);
          
          if (data.msg_type === 'get_account_status') {
              socket.removeEventListener('message', messageHandler);
              
              if (data.error) {
                  reject(new Error(data.error.message));
                  return;
              }
              
              // Check if token has required permissions
              const hasPermissions = requiredPermissions.every(permission => 
                  data.get_account_status.authentication.scopes.includes(permission)
              );
              
              if (hasPermissions) {
                  resolve(true);
              } else {
                  reject(new Error('Token does not have required permissions'));
              }
          }
      };
      
      socket.addEventListener('message', messageHandler);
  });
}

// Handle network status changes
function handleNetworkStatus() {
  window.addEventListener('online', () => {
      addLog('Network connection restored');
      if (state.isCopying) {
          addLog('Attempting to reconnect...');
          // Implement reconnection logic here
          startCopying();
      }
  });
  
  window.addEventListener('offline', () => {
      addLog('Network connection lost');
      state.connectionStatus = 'error';
      updateUI();
  });
}

// Enhanced error handling
function handleError(error, context = '') {
  console.error(`Error in ${context}:`, error);
  const errorMessage = error.message || 'An unknown error occurred';
  addLog(`Error in ${context}: ${errorMessage}`);
  state.error = `${context ? context + ': ' : ''}${errorMessage}`;
  updateUI();
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
      init();
      loadSettings();
      loadHistory();
      handleNetworkStatus();
  } catch (error) {
      handleError(error, 'initialization');
  }
});

// Save settings when page is unloaded
window.addEventListener('beforeunload', () => {
  saveSettings();
  saveHistory();
});