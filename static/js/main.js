// Global State
let currentMode = 'frog';
let x = 50, y = 75;

// DOM Elements
const game = document.getElementById('gameArea');
const codeInput = document.getElementById('codeInput');
const status = document.getElementById('status');
const tokens = document.getElementById('tokens');
const parseTree = document.getElementById('parseTree');
const semanticChecks = document.getElementById('semanticChecks');
const symbolTable = document.getElementById('symbolTable');
const irPanel = document.getElementById('irPanel');
const execLog = document.getElementById('execLog');
const optimizePanel = document.getElementById('optimizePanel');

// ========================================
// 1. CENTRAL COMPILER PIPELINE
// ========================================
async function compileAndRun(code, mode) {
  try {
    // Reset status
    updateStatus('Compiling...', 'running');
    
    // 1. Lexical Analysis
    const tokenData = lexicalAnalysis(code);
    updatePhaseIndicator('lexical', 'running');
    await sleep(300);
    updatePhaseIndicator('lexical', 'success');
    
    // 2. Syntax Analysis
    const ast = syntaxAnalysis(tokenData);
    updatePhaseIndicator('syntax', 'running');
    await sleep(300);
    updatePhaseIndicator('syntax', 'success');
    
    // 3. Semantic Analysis
    const semantic = semanticAnalysis(ast);
    updatePhaseIndicator('semantic', 'running');
    await sleep(300);
    updatePhaseIndicator('semantic', 'success');
    
    // 4. Symbol Table
    const symbolTableData = buildSymbolTable(ast);
    updatePhaseIndicator('symbol', 'running');
    await sleep(300);
    updatePhaseIndicator('symbol', 'success');
    
    // 5. IR Generation
    const ir = generateIR(ast);
    updatePhaseIndicator('ir', 'running');
    await sleep(300);
    updatePhaseIndicator('ir', 'success');
    
    // 6. Optimization
    const optimizedIR = optimizeIR(ir);
    updatePhaseIndicator('opt', 'running');
    await sleep(300);
    updatePhaseIndicator('opt', 'success');
    
    // Update all phases in UI
    updatePhases({
      tokens: tokenData,
      ast: ast,
      semantic: semantic,
      symbolTable: symbolTableData,
      ir: ir,
      optimizedIR: optimizedIR
    });
    
    // 7. Execution
    updatePhaseIndicator('exec', 'running');
    if (mode === "frog") {
      await executeFrog(optimizedIR);
    } else {
      executeC(code);
    }
    updatePhaseIndicator('exec', 'success');
    
    updateStatus('Success', 'success');
    
  } catch (error) {
    console.error('Compilation error:', error);
    updateStatus('Error: ' + error.message, 'error');
    updatePhaseIndicator('exec', 'error');
  }
}

// ========================================
// 2. LEXICAL ANALYSIS
// ========================================
function lexicalAnalysis(code) {
  const tokens = code.split(/(\s+|\(|\)|;)/).filter(t => t.trim() !== "");
  return tokens.map(t => ({
    type: isNaN(t) ? "IDENTIFIER" : "NUMBER",
    value: t
  }));
}

// ========================================
// 3. SYNTAX ANALYSIS (Simple AST)
// ========================================
function syntaxAnalysis(tokens) {
  return {
    type: "Program",
    body: tokens.map(t => ({
      type: "Expression",
      value: t.value
    }))
  };
}

// ========================================
// 4. SEMANTIC ANALYSIS
// ========================================
function semanticAnalysis(ast) {
  return ast.body.map(node => ({
    value: node.value,
    valid: true
  }));
}

// ========================================
// 5. SYMBOL TABLE
// ========================================
function buildSymbolTable(ast) {
  return ast.body.map((node, i) => ({
    name: node.value,
    type: "unknown",
    scope: "global",
    index: i
  }));
}

// ========================================
// 6. IR GENERATION
// ========================================
function generateIR(ast) {
  return ast.body.map(node => ({
    op: "EXEC",
    value: node.value
  }));
}

// ========================================
// 7. OPTIMIZATION
// ========================================
function optimizeIR(ir) {
  // Basic pass-through optimization
  return ir;
}

// ========================================
// 8. FROG EXECUTION ENGINE
// ========================================
async function executeFrog(ir) {
  for (let cmd of ir) {
    await runCommand(cmd);
  }
}

function runCommand(cmd) {
  return new Promise(resolve => {
    const frog = document.getElementById("frog");
    if (!frog) {
      resolve();
      return;
    }

    switch (cmd.value) {
      case "moveRight":
        x += 50;
        frog.style.left = x + "px";
        break;
      case "moveLeft":
        x -= 50;
        frog.style.left = x + "px";
        break;
      case "jump":
        frog.style.transition = "transform 0.3s ease";
        frog.style.transform = "translateY(-50px)";
        setTimeout(() => {
          frog.style.transform = "translateY(0px)";
        }, 300);
        break;
      case "glow":
        frog.style.boxShadow = "0 0 20px yellow";
        setTimeout(() => {
          frog.style.boxShadow = "none";
        }, 300);
        break;
      case "wait":
        // Wait is handled by the timeout below
        break;
    }

    setTimeout(resolve, 500);
  });
}

// ========================================
// 9. C EXECUTION
// ========================================
function executeC(code) {
  const output = document.getElementById("execLog");
  if (code.includes("printf")) {
    // Extract string from printf
    const match = code.match(/printf\s*\(\s*"([^"]*)"\s*\)/);
    if (match) {
      output.innerText = match[1];
    } else {
      output.innerText = "hello";
    }
  } else {
    output.innerText = "Program executed successfully";
  }
}

// ========================================
// 10. UPDATE UI PHASES
// ========================================
function updatePhases(data) {
  setLexical(data.tokens);
  setSyntax(data.ast);
  setSemantic(data.semantic);
  setSymbolTable(data.symbolTable);
  setIR(data.ir);
  setOptimized(data.optimizedIR);
}

function setLexical(tokens) {
  tokens.textContent = JSON.stringify(tokens, null, 2);
}

function setSyntax(ast) {
  parseTree.textContent = JSON.stringify(ast, null, 2);
}

function setSemantic(semantic) {
  semanticChecks.innerHTML = '';
  semantic.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.value}: ${item.valid ? 'VALID' : 'INVALID'}`;
    li.className = item.valid ? 'status-PASS' : 'status-FAIL';
    semanticChecks.appendChild(li);
  });
}

function setSymbolTable(symbolTableData) {
  const tbody = symbolTable.querySelector('tbody');
  tbody.innerHTML = '';
  symbolTableData.forEach(item => {
    const row = tbody.insertRow();
    row.insertCell(0).textContent = item.name;
    row.insertCell(1).textContent = item.type;
    row.insertCell(2).textContent = '';
    row.insertCell(3).textContent = item.scope;
  });
}

function setIR(ir) {
  irPanel.textContent = JSON.stringify(ir, null, 2);
}

function setOptimized(optimizedIR) {
  optimizePanel.innerHTML = `
    <div><strong>Optimized IR:</strong></div>
    <pre>${JSON.stringify(optimizedIR, null, 2)}</pre>
  `;
}

// ========================================
// 11. RUN BUTTON FIX
// ========================================
function handleRun() {
  const code = getEditorCode();
  const mode = getCurrentMode();
  compileAndRun(code, mode);
}

function getEditorCode() {
  return codeInput.value || '';
}

function getCurrentMode() {
  return currentMode;
}

// ========================================
// 12. MODE SWITCH FIX
// ========================================
function switchMode(newMode) {
  setMode(newMode);
  resetAll();

  if (newMode === "frog") {
    showFrog();
    loadFrogCommands();
  } else {
    hideFrog();
    clearCommandPalette();
  }
}

function setMode(mode) {
  currentMode = mode;
  
  // Update button states
  const frogModeBtn = document.getElementById('frogMode');
  const cModeBtn = document.getElementById('cMode');
  
  if (frogModeBtn && cModeBtn) {
    frogModeBtn.classList.toggle('active', mode === 'frog');
    cModeBtn.classList.toggle('active', mode === 'c');
  }
}

function showFrog() {
  const frogSection = document.getElementById('frogSection');
  if (frogSection) {
    frogSection.style.display = 'block';
  }
  codeInput.placeholder = 'Enter frog commands like moveRight(3); jump(); glow();';
}

function hideFrog() {
  const frogSection = document.getElementById('frogSection');
  if (frogSection) {
    frogSection.style.display = 'none';
  }
  codeInput.placeholder = 'Enter C code like #include <stdio.h>\\nint main() {\\n    printf("Hello World");\\n    return 0;\\n}';
}

function loadFrogCommands() {
  const frogCommands = document.getElementById('frogCommands');
  const cCommands = document.getElementById('cCommands');
  
  if (frogCommands) frogCommands.style.display = 'block';
  if (cCommands) cCommands.style.display = 'none';
}

function clearCommandPalette() {
  const frogCommands = document.getElementById('frogCommands');
  const cCommands = document.getElementById('cCommands');
  
  if (frogCommands) frogCommands.style.display = 'none';
  if (cCommands) cCommands.style.display = 'block';
}

// ========================================
// 13. RESET FUNCTION
// ========================================
function resetAll() {
  clearEditor();
  clearOutput();
  clearPhases();
  resetFrogPosition();
}

function clearEditor() {
  codeInput.value = '';
}

function clearOutput() {
  execLog.textContent = '';
}

function clearPhases() {
  tokens.textContent = '';
  parseTree.textContent = '';
  semanticChecks.innerHTML = '';
  symbolTable.querySelector('tbody').innerHTML = '';
  irPanel.textContent = '';
  optimizePanel.innerHTML = '';
  
  // Reset phase indicators
  const phases = ['lexical', 'syntax', 'semantic', 'symbol', 'ir', 'opt', 'exec'];
  phases.forEach(phase => {
    updatePhaseIndicator(phase, 'amber');
  });
}

function resetFrogPosition() {
  x = 50;
  y = 75;
  updateFrogPosition();
}

// ========================================
// 14. HELPER FUNCTIONS
// ========================================
function updatePhaseIndicator(phase, status) {
  const pill = document.getElementById(`pill-${phase}`);
  if (pill) {
    pill.className = `pill pill-${status}`;
  }
}

function updateStatus(message, type) {
  if (status) {
    status.textContent = message;
    status.className = `status ${type}`;
  }
}

function updateFrogPosition() {
  const frog = document.getElementById('frog');
  if (frog) {
    frog.style.left = x + 'px';
    frog.style.top = y + 'px';
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================
// 15. LEGACY FUNCTIONS (for compatibility)
// ========================================
function addCommand(cmd) {
  codeInput.value += cmd + '\n';
}

function undoLastCommand() {
  const lines = codeInput.value.trim().split('\n');
  lines.pop();
  codeInput.value = lines.join('\n') + '\n';
}

function clearCode() {
  clearEditor();
}

function resetWorkspace() {
  resetAll();
}

async function runCode() {
  handleRun();
}

// ========================================
// 16. MOBILE & TOUCH OPTIMIZATIONS
// ========================================
function setupMobileOptimizations() {
  // Detect mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
  
  if (isMobile) {
    // Add touch-friendly class to body
    document.body.classList.add('mobile-device');
    
    // Optimize frog game area for touch
    const gameArea = document.getElementById('gameArea');
    if (gameArea) {
      gameArea.addEventListener('touchstart', handleTouchStart, { passive: true });
      gameArea.addEventListener('touchmove', handleTouchMove, { passive: true });
      gameArea.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
    
    // Make buttons larger for touch
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      button.classList.add('touch-friendly');
    });
    
    // Add swipe gestures for mode switching
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', function(e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    document.addEventListener('touchend', function(e) {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipeGesture();
    }, { passive: true });
    
    function handleSwipeGesture() {
      const swipeThreshold = 50;
      const diff = touchStartX - touchEndX;
      
      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          // Swipe left - switch to C mode
          if (currentMode === 'frog') {
            switchMode('c');
          }
        } else {
          // Swipe right - switch to Frog mode
          if (currentMode === 'c') {
            switchMode('frog');
          }
        }
      }
    }
    
    // Add keyboard shortcuts for mobile
    document.addEventListener('keydown', function(e) {
      // Ctrl/Cmd + Enter to run code
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
      
      // Ctrl/Cmd + R to reset
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        resetAll();
      }
      
      // Escape to clear
      if (e.key === 'Escape') {
        clearCode();
      }
    });
    
    // Optimize scrolling for mobile
    const panels = document.querySelectorAll('.left-panel, .right-panel');
    panels.forEach(panel => {
      panel.style.scrollBehavior = 'smooth';
      panel.style.webkitOverflowScrolling = 'touch';
    });
    
    // Add viewport meta tag if not present
    if (!document.querySelector('meta[name="viewport"]')) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(meta);
    }
  }
}

function handleTouchStart(e) {
  // Handle touch start for frog game
  const touch = e.touches[0];
  const frog = document.getElementById('frog');
  if (frog) {
    frog.style.transition = 'none';
  }
}

function handleTouchMove(e) {
  // Handle touch move for frog game
  e.preventDefault();
  const touch = e.touches[0];
  const gameArea = document.getElementById('gameArea');
  const frog = document.getElementById('frog');
  
  if (gameArea && frog) {
    const rect = gameArea.getBoundingClientRect();
    const x = touch.clientX - rect.left - (frog.offsetWidth / 2);
    const y = touch.clientY - rect.top - (frog.offsetHeight / 2);
    
    // Keep frog within bounds
    const maxX = rect.width - frog.offsetWidth;
    const maxY = rect.height - frog.offsetHeight;
    
    frog.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
    frog.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
  }
}

function handleTouchEnd(e) {
  // Handle touch end for frog game
  const frog = document.getElementById('frog');
  if (frog) {
    frog.style.transition = 'left 0.4s ease';
  }
}

// ========================================
// 17. DEVICE DETECTION & ADAPTATION
// ========================================
function detectDevice() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isPortrait = height > width;
  
  // Update CSS variables based on device
  const root = document.documentElement;
  
  if (width <= 320) {
    root.style.setProperty('--device-type', 'extra-small');
  } else if (width <= 480) {
    root.style.setProperty('--device-type', 'small');
  } else if (width <= 768) {
    root.style.setProperty('--device-type', 'mobile');
  } else if (width <= 992) {
    root.style.setProperty('--device-type', 'tablet');
  } else {
    root.style.setProperty('--device-type', 'desktop');
  }
  
  // Adjust frog game area size based on device
  const gameArea = document.getElementById('gameArea');
  if (gameArea) {
    if (width <= 480) {
      gameArea.style.height = Math.min(150, height * 0.25) + 'px';
    } else if (width <= 768) {
      gameArea.style.height = Math.min(200, height * 0.3) + 'px';
    } else {
      gameArea.style.height = Math.min(300, height * 0.35) + 'px';
    }
  }
  
  // Adjust font sizes for better readability
  if (width <= 480) {
    document.body.style.fontSize = '12px';
  } else if (width <= 768) {
    document.body.style.fontSize = '14px';
  } else {
    document.body.style.fontSize = '16px';
  }
}

// ========================================
// 18. PERFORMANCE OPTIMIZATIONS
// ========================================
function setupPerformanceOptimizations() {
  // Reduce animations on low-end devices
  const isLowEnd = navigator.hardwareConcurrency <= 2 || navigator.deviceMemory <= 2;
  
  if (isLowEnd) {
    document.body.classList.add('low-end-device');
    
    // Reduce animation duration
    const style = document.createElement('style');
    style.textContent = `
      .low-end-device * {
        animation-duration: 0.1s !important;
        transition-duration: 0.1s !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Optimize frog animations for mobile
  if (window.innerWidth <= 768) {
    const frog = document.getElementById('frog');
    if (frog) {
      frog.style.transition = 'left 0.2s ease';
    }
  }
}

// ========================================
// 19. INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the app
  resetAll();
  switchMode('frog');
  
  // Setup mobile optimizations
  setupMobileOptimizations();
  
  // Setup device detection
  detectDevice();
  
  // Setup performance optimizations
  setupPerformanceOptimizations();
  
  // Handle window resize
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      detectDevice();
    }, 250);
  });
  
  // Handle orientation change
  window.addEventListener('orientationchange', function() {
    setTimeout(function() {
      detectDevice();
    }, 100);
  });
});

