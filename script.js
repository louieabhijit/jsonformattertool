// Utility functions
// Add debounce utility function
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Function for JSON validation status updates
function updateValidationStatus(isValid, error = null) {
  const validationStatus = document.querySelector('.validation-status');
  const validationDetails = document.querySelector('.validation-details');
  
  if (!validationStatus || !validationDetails) return;
  
  if (isValid) {
    validationStatus.className = 'validation-status valid';
    validationStatus.innerHTML = `
      <div class="status-icon valid"></div>
      <div class="status-message">Valid JSON</div>
    `;
    validationDetails.classList.remove('show');
  } else {
    validationStatus.className = 'validation-status invalid';
    validationStatus.innerHTML = `
      <div class="status-icon invalid"></div>
      <div class="status-message">${error ? error.message : 'Invalid JSON'}</div>
    `;
    
    if (error && error.message.includes('position')) {
      try {
        const posMatch = error.message.match(/position (\d+)/);
        if (posMatch && posMatch[1]) {
          const position = parseInt(posMatch[1]);
          const input = document.getElementById("json-input").value;
          
          // Find line and column of the error
          let line = 1;
          let column = 1;
          for (let i = 0; i < position; i++) {
            if (input[i] === '\n') {
              line++;
              column = 1;
            } else {
              column++;
            }
          }
          
          // Get a snippet of the code around the error
          const lines = input.split('\n');
          const errorLine = lines[line - 1] || '';
          const startLine = Math.max(0, line - 3);
          const endLine = Math.min(lines.length, line + 2);
          let snippet = '';
          
          for (let i = startLine; i < endLine; i++) {
            if (i === line - 1) {
              // Highlight the error line
              snippet += `<div class="error-line-highlight">${i + 1}: ${escapeHTML(lines[i])}</div>`;
            } else {
              snippet += `${i + 1}: ${escapeHTML(lines[i])}\n`;
            }
          }
          
          validationDetails.innerHTML = `
            <div class="error-location">
              Error at <span class="error-line">line ${line}</span> <span class="error-column">column ${column}</span>
            </div>
            <div class="error-message">${error.message}</div>
            <pre class="error-preview">${snippet}</pre>
          `;
          validationDetails.classList.add('show');
        }
      } catch (e) {
        console.error('Error processing JSON validation details:', e);
      }
    }
  }
}

// HTML Escaping
function escapeHTML(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Add line numbers utility function
function updateLineNumbers(containerId, text) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const lines = text.split('\n');
  const lineCount = lines.length;
  
  let html = '';
  for (let i = 1; i <= lineCount; i++) {
    html += `<span class="line">${i}</span>`;
  }
  
  container.innerHTML = html;
}

// Validate JSON function
function validateJSON() {
  const input = document.getElementById("json-input").value.trim();
  const indicator = document.getElementById("validation-indicator");
  
  if (!input) {
    if (indicator) {
      indicator.className = "validation-indicator";
      indicator.classList.remove("visible");
    }
    return;
  }
  
  try {
    JSON.parse(input);
    if (indicator) {
      indicator.className = "validation-indicator valid visible";
    }
    
    // If validation is successful, also update the validation status
    if (typeof updateValidationStatus === 'function') {
      updateValidationStatus(true);
    }
  } catch (e) {
    if (indicator) {
      indicator.className = "validation-indicator invalid visible";
    }
    
    // If validation fails, update validation status with error
    if (typeof updateValidationStatus === 'function') {
      updateValidationStatus(false, e);
    }
  }
}

function buildJsonPathTree(obj) {
  const treeContainer = document.querySelector('.jsonpath-tree');
  if (!treeContainer) return;
  
  treeContainer.innerHTML = '';
  
  if (!obj) {
    treeContainer.innerHTML = '<div class="tree-loader">No valid JSON data available</div>';
    return;
  }
  
  // Build tree recursively
  const rootNode = buildTreeNode('root', obj, '$');
  treeContainer.appendChild(rootNode);
  
  // Add click handlers to tree nodes
  const treeLabels = document.querySelectorAll('.tree-label');
  treeLabels.forEach(label => {
    label.addEventListener('click', function(e) {
      e.stopPropagation();
      
      // Toggle selected state
      document.querySelectorAll('.tree-label').forEach(l => l.classList.remove('selected'));
      this.classList.add('selected');
      
      // Get JSONPath from data attribute
      const jsonPath = this.getAttribute('data-path');
      
      // Update JSONPath expression display
      const jsonPathExpr = document.getElementById('jsonpath-expression');
      if (jsonPathExpr) jsonPathExpr.textContent = jsonPath;
      
      // Extract value at this path and display it
      try {
        const value = getValueAtPath(obj, jsonPath);
        const jsonPathValue = document.getElementById('jsonpath-value');
        if (jsonPathValue) {
          if (typeof value === 'object' && value !== null) {
            jsonPathValue.textContent = JSON.stringify(value, null, 2);
          } else {
            jsonPathValue.textContent = String(value);
          }
        }
      } catch (e) {
        console.error('Error getting value at path:', e);
      }
      
      // Toggle expand/collapse if has children
      const icon = this.querySelector('.tree-icon');
      if (icon) {
        const children = this.nextElementSibling;
        if (children && children.classList.contains('tree-children')) {
          if (icon.classList.contains('collapsed')) {
            icon.classList.remove('collapsed');
            icon.classList.add('expanded');
            children.style.display = 'block';
          } else {
            icon.classList.remove('expanded');
            icon.classList.add('collapsed');
            children.style.display = 'none';
          }
        }
      }
    });
  });
}

function buildTreeNode(key, value, path) {
  const node = document.createElement('div');
  node.className = 'tree-node';
  
  const label = document.createElement('div');
  label.className = 'tree-label';
  label.setAttribute('data-path', path);
  
  const icon = document.createElement('div');
  icon.className = 'tree-icon';
  
  const keySpan = document.createElement('span');
  keySpan.className = 'tree-key';
  keySpan.textContent = key;
  
  label.appendChild(icon);
  label.appendChild(keySpan);
  
  if (typeof value === 'object' && value !== null) {
    // It's an object or array
    const isArray = Array.isArray(value);
    
    icon.classList.add('collapsed');
    
    const typeSpan = document.createElement('span');
    typeSpan.className = `tree-type ${isArray ? 'array' : 'object'}`;
    typeSpan.textContent = isArray ? 'array' : 'object';
    
    const sizeSpan = document.createElement('span');
    sizeSpan.className = 'tree-size';
    const size = isArray ? value.length : Object.keys(value).length;
    sizeSpan.textContent = `(${size})`;
    
    label.appendChild(typeSpan);
    label.appendChild(sizeSpan);
    
    node.appendChild(label);
    
    // Create child nodes container
    const children = document.createElement('div');
    children.className = 'tree-children';
    children.style.display = 'none'; // Start collapsed
    
    // Add child nodes
    if (isArray) {
      value.forEach((item, index) => {
        const childPath = `${path}[${index}]`;
        const childNode = buildTreeNode(index, item, childPath);
        children.appendChild(childNode);
      });
    } else {
      Object.keys(value).forEach(k => {
        // Handle path formatting for keys with special characters
        const childPath = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k) ? 
          `${path}.${k}` : `${path}['${k}']`;
        const childNode = buildTreeNode(k, value[k], childPath);
        children.appendChild(childNode);
      });
    }
    
    node.appendChild(children);
  } else {
    // It's a primitive value
    const valueSpan = document.createElement('span');
    valueSpan.className = 'tree-value';
    
    const typeSpan = document.createElement('span');
    typeSpan.className = `tree-type ${typeof value}`;
    
    if (value === null) {
      valueSpan.textContent = 'null';
      typeSpan.className = 'tree-type null';
      typeSpan.textContent = 'null';
    } else {
      valueSpan.textContent = typeof value === 'string' ? `"${value}"` : String(value);
      typeSpan.textContent = typeof value;
    }
    
    label.appendChild(valueSpan);
    label.appendChild(typeSpan);
    node.appendChild(label);
  }
  
  return node;
}

function getValueAtPath(obj, path) {
  // Simple JSONPath evaluation implementation
  if (path === '$') return obj;
  
  // Convert path to a series of key accessors
  const parts = [];
  let current = '';
  let inBracket = false;
  let inQuote = false;
  
  for (let i = 1; i < path.length; i++) { // Start at 1 to skip the $
    const char = path[i];
    
    if (char === '.' && !inBracket && !inQuote) {
      if (current) parts.push(current);
      current = '';
    } else if (char === '[' && !inQuote) {
      if (current) parts.push(current);
      current = '';
      inBracket = true;
    } else if (char === ']' && inBracket && !inQuote) {
      parts.push(current);
      current = '';
      inBracket = false;
    } else if ((char === "'" || char === '"') && inBracket) {
      // Handle quotes in bracket notation
      if (inQuote && path[i-1] !== '\\') {
        inQuote = false;
      } else if (!inQuote) {
        inQuote = true;
      } else {
        current += char;
      }
    } else {
      current += char;
    }
  }
  
  if (current) parts.push(current);
  
  // Access the value following the path
  let result = obj;
  for (const part of parts) {
    // If numeric index or quoted string (for bracket notation)
    let key = part;
    if (key.startsWith("'") && key.endsWith("'")) {
      key = key.substring(1, key.length - 1);
    } else if (key.startsWith('"') && key.endsWith('"')) {
      key = key.substring(1, key.length - 1);
    }
    
    result = result[key];
    if (result === undefined) break;
  }
  
  return result;
}

function formatJSON() {
  const input = document.getElementById("json-input").value;
  const output = document.getElementById("json-output");
  
  if (!input.trim()) {
    showToast("Please enter some JSON to format");
    return;
  }
  
  try {
    const obj = JSON.parse(input);
    
    // Make sure the output container is visible
    const outputContainer = document.querySelector('.output-container');
    if (outputContainer) {
      outputContainer.style.display = 'block';
    }
    
    // Create the output
    output.textContent = JSON.stringify(obj, null, 2);
    output.className = "output success";
    animateOutput();
    
    // Update the validation indicator
    validateJSON();
    
    // Check if updateValidationStatus exists before calling
    if (typeof updateValidationStatus === 'function') {
      updateValidationStatus(true);
    }
    
    // Update line numbers for output
    updateLineNumbers('output-line-numbers', output.textContent);
    
    // Update the JSON Path finder with the parsed object
    buildJsonPathTree(obj);
    
    // Scroll to output container on mobile for better UX
    if (window.innerWidth <= 768) {
      const outputContainer = document.querySelector('.output-container');
      if (outputContainer) {
        outputContainer.scrollIntoView({ behavior: 'smooth' });
      }
    }
  } catch (e) {
    output.textContent = "Invalid JSON: " + e.message;
    output.className = "output error";
    animateOutput();
    
    // Update the validation indicator
    validateJSON();
    
    // Check if updateValidationStatus exists before calling
    if (typeof updateValidationStatus === 'function') {
      updateValidationStatus(false, e);
    }
    
    // Still make sure the output container is visible on error
    const outputContainer = document.querySelector('.output-container');
    if (outputContainer) {
      outputContainer.style.display = 'block';
      
      // Scroll to output container on mobile for better UX
      if (window.innerWidth <= 768) {
        outputContainer.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }
}

function minifyJSON() {
  const input = document.getElementById("json-input").value;
  const output = document.getElementById("json-output");
  
  if (!input.trim()) {
    showToast("Please enter some JSON to minify");
    return;
  }
  
  try {
    const obj = JSON.parse(input);
    output.textContent = JSON.stringify(obj);
    output.className = "output info";
    animateOutput();
    
    // Update the validation indicator
    validateJSON();
    
    // Check if updateValidationStatus exists before calling
    if (typeof updateValidationStatus === 'function') {
      updateValidationStatus(true);
    }
    
    // Update line numbers for output
    updateLineNumbers('output-line-numbers', output.textContent);
  } catch (e) {
    output.textContent = "Invalid JSON: " + e.message;
    output.className = "output error";
    animateOutput();
    
    // Update the validation indicator
    validateJSON();
    
    // Check if updateValidationStatus exists before calling
    if (typeof updateValidationStatus === 'function') {
      updateValidationStatus(false, e);
    }
  }
}

function copyJSON() {
  const output = document.getElementById("json-output").textContent;
  
  if (!output.trim() || output.includes("Invalid JSON")) {
    showToast("Nothing to copy");
    return;
  }
  
  navigator.clipboard.writeText(output).then(() => {
    showToast("JSON copied to clipboard!");
  });
}

function downloadJSON() {
  const output = document.getElementById("json-output").textContent;
  
  if (!output.trim() || output.includes("Invalid JSON")) {
    showToast("Nothing to download");
    return;
  }
  
  const blob = new Blob([output], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  a.href = url;
  a.download = 'formatted-json.json';
  a.click();
  
  URL.revokeObjectURL(url);
  showToast("JSON file downloaded!");
}

function jsonToCSV(jsonObj) {
  if (!jsonObj || typeof jsonObj !== 'object') {
    throw new Error("Invalid JSON object");
  }
  
  if (Array.isArray(jsonObj)) {
    if (jsonObj.length === 0) return '';
    
    const headers = Object.keys(jsonObj[0]);
    
    const csvRows = [
      headers.join(','),
      ...jsonObj.map(row => {
        return headers.map(fieldName => {
          let field = row[fieldName] === null ? '' : String(row[fieldName]);
          if (field.includes(',') || field.includes('\n') || field.includes('"')) {
            field = `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        }).join(',');
      })
    ];
    
    return csvRows.join('\n');
  } 
  else {
    const headers = Object.keys(jsonObj);
    const values = Object.values(jsonObj).map(val => {
      if (val === null) return '';
      let field = String(val);
      if (field.includes(',') || field.includes('\n') || field.includes('"')) {
        field = `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    });
    
    return headers.join(',') + '\n' + values.join(',');
  }
}

function downloadCSV() {
  const output = document.getElementById("json-output").textContent;
  
  if (!output.trim() || output.includes("Invalid JSON")) {
    showToast("Nothing to download");
    return;
  }
  
  try {
    const jsonObj = JSON.parse(output);
    const csvContent = jsonToCSV(jsonObj);
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = 'converted-data.csv';
    a.click();
    
    URL.revokeObjectURL(url);
    showToast("CSV file downloaded!");
  } catch (e) {
    showToast("Error converting to CSV: " + e.message);
  }
}

function jsonToXML(jsonObj, rootName = 'root') {
  if (!jsonObj) {
    throw new Error("Invalid JSON object");
  }
  
  let xml = `<?xml version="1.0" encoding="UTF-8" ?>\n<${rootName}>`;
  
  function convertToXML(obj, parent) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const tag = isNaN(parseInt(key)) ? key : `item`;
        
        if (value === null || value === undefined) {
          xml += `\n  <${tag} />`;
        }
        else if (Array.isArray(value)) {
          xml += `\n  <${tag}>`;
          value.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
              xml += `\n    <item>`;
              convertToXML(item, key);
              xml += `\n    </item>`;
            } else {
              xml += `\n    <item>${escapeXML(String(item))}</item>`;
            }
          });
          xml += `\n  </${tag}>`;
        }
        else if (typeof value === 'object') {
          xml += `\n  <${tag}>`;
          convertToXML(value, key);
          xml += `\n  </${tag}>`;
        }
        else {
          xml += `\n  <${tag}>${escapeXML(String(value))}</${tag}>`;
        }
      }
    }
  }
  
  function escapeXML(str) {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;');
  }
  
  convertToXML(jsonObj, rootName);
  xml += `\n</${rootName}>`;
  
  return xml;
}

function downloadXML() {
  const output = document.getElementById("json-output").textContent;
  
  if (!output.trim() || output.includes("Invalid JSON")) {
    showToast("Nothing to download");
    return;
  }
  
  try {
    const jsonObj = JSON.parse(output);
    const xmlContent = jsonToXML(jsonObj);
    
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = 'converted-data.xml';
    a.click();
    
    URL.revokeObjectURL(url);
    showToast("XML file downloaded!");
  } catch (e) {
    showToast("Error converting to XML: " + e.message);
  }
}

function jsonToYAML(jsonObj, indent = 0) {
  if (!jsonObj) {
    throw new Error("Invalid JSON object");
  }
  
  let yaml = '';
  const spaces = ' '.repeat(indent);
  
  if (Array.isArray(jsonObj)) {
    if (jsonObj.length === 0) return '[]';
    
    for (const item of jsonObj) {
      yaml += `${spaces}- `;
      if (typeof item === 'object' && item !== null) {
        yaml += '\n' + jsonToYAML(item, indent + 2);
      } else {
        yaml += formatYamlValue(item) + '\n';
      }
    }
  } else if (typeof jsonObj === 'object' && jsonObj !== null) {
    for (const key in jsonObj) {
      if (jsonObj.hasOwnProperty(key)) {
        const value = jsonObj[key];
        yaml += `${spaces}${key}: `;
        
        if (value === null) {
          yaml += 'null\n';
        } else if (typeof value === 'object') {
          yaml += '\n' + jsonToYAML(value, indent + 2);
        } else {
          yaml += formatYamlValue(value) + '\n';
        }
      }
    }
  }
  
  return yaml;
}

function formatYamlValue(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'null';
  if (typeof value === 'string') {
    if (
      value.includes(':') || 
      value.includes('#') || 
      value.includes(',') || 
      value.match(/^\d/) || 
      value.includes('\n') || 
      value === 'true' || 
      value === 'false' || 
      value === 'null' || 
      value === 'yes' || 
      value === 'no' ||
      value === ''
    ) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  return String(value);
}

function downloadYAML() {
  const output = document.getElementById("json-output").textContent;
  
  if (!output.trim() || output.includes("Invalid JSON")) {
    showToast("Nothing to download");
    return;
  }
  
  try {
    const jsonObj = JSON.parse(output);
    const yamlContent = jsonToYAML(jsonObj);
    
    const blob = new Blob([yamlContent], { type: 'application/yaml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = 'converted-data.yaml';
    a.click();
    
    URL.revokeObjectURL(url);
    showToast("YAML file downloaded!");
  } catch (e) {
    showToast("Error converting to YAML: " + e.message);
  }
}

function handleFileUpload(file) {
  if (!file) {
    showToast("No file selected");
    return;
  }
  
  // Check file size (limit to 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showToast("File too large. Please upload a file smaller than 5MB");
    return;
  }
  
  // Check file type
  const isJsonFile = file.type === 'application/json' || 
                     file.name.toLowerCase().endsWith('.json') ||
                     file.name.toLowerCase().endsWith('.jsonl');
                     
  if (!isJsonFile) {
    showToast("Please upload a valid JSON file (.json)");
    return;
  }
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const content = e.target.result;
      
      // Check if content is empty
      if (!content.trim()) {
        showToast("The file is empty");
        return;
      }
      
      const jsonObject = JSON.parse(content);
      
      const textarea = document.getElementById("json-input");
      if (textarea) textarea.value = content;
      
      // Update input line numbers
      updateLineNumbers('input-line-numbers', content);
      
      // Automatically format the JSON after loading the file
      const output = document.getElementById("json-output");
      if (output) {
        output.textContent = JSON.stringify(jsonObject, null, 2);
        output.className = "output success";
        animateOutput();
        
        // Check if updateValidationStatus exists before calling
        if (typeof updateValidationStatus === 'function') {
          updateValidationStatus(true);
        }
        
        // Update output line numbers
        updateLineNumbers('output-line-numbers', output.textContent);
      }
      
      // Update the JSON Path finder with the parsed object
      buildJsonPathTree(jsonObject);
      
      showToast("JSON file loaded successfully!");
    } catch (error) {
      showToast("Error parsing JSON: " + error.message);
      
      const textarea = document.getElementById("json-input");
      if (textarea) textarea.value = e.target.result;
      
      // Update input line numbers even for invalid JSON
      updateLineNumbers('input-line-numbers', e.target.result);
      
      // Check if updateValidationStatus exists before calling
      if (typeof updateValidationStatus === 'function') {
        updateValidationStatus(false, error);
      }
    }
  };
  
  reader.onerror = function() {
    showToast("Error reading the file. Please try again.");
  };
  
  reader.readAsText(file);
}

function showToast(message) {
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function animateOutput() {
  const output = document.getElementById("json-output");
  output.style.transform = 'scale(0.98)';
  output.style.opacity = '0.8';
  
  setTimeout(() => {
    output.style.transform = 'scale(1)';
    output.style.opacity = '1';
  }, 150);
}

function addSampleJSON() {
  const jsonInput = document.getElementById("json-input");
  
  // Example JSON data with various types
  const sampleJSON = {
    "name": "JSON Formatter Tool",
    "version": 1.0,
    "isActive": true,
    "features": [
      "Format JSON with proper indentation",
      "Validate JSON syntax",
      "Convert to different formats",
      "Download formatted JSON"
    ],
    "settings": {
      "theme": "auto",
      "indentSize": 2,
      "maxOutputSize": 5000
    },
    "stats": {
      "users": 1000,
      "rating": 4.8,
      "lastUpdated": "2023-09-15"
    },
    "nested": {
      "level1": {
        "level2": {
          "level3": {
            "message": "Deep nesting is handled properly"
          }
        }
      }
    },
    "nullExample": null,
    "arrayWithObjects": [
      { "id": 1, "name": "First item" },
      { "id": 2, "name": "Second item" },
      { "id": 3, "name": "Third item" }
    ]
  };
  
  jsonInput.value = JSON.stringify(sampleJSON, null, 2);
  
  // Trigger validation and formatting
  validateJSON();
  formatJSON();
  
  // Update line numbers
  updateLineNumbers('input-line-numbers', jsonInput.value);
  
  const indicator = document.getElementById("validation-indicator");
  if (indicator) {
    indicator.className = "validation-indicator valid visible";
  }
  
  // Check if updateValidationStatus exists before calling
  if (typeof updateValidationStatus === 'function') {
    updateValidationStatus(true);
  }
}

// Mobile menu functionality is now directly in the DOMContentLoaded event

function toggleTheme() {
  const body = document.body;
  const themeButton = document.getElementById("toggle-theme");
  
  if (body.classList.contains("dark-mode")) {
    body.classList.remove("dark-mode");
    localStorage.setItem("theme", "light");
  } else {
    body.classList.add("dark-mode");
    localStorage.setItem("theme", "dark");
  }
  
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  themeButton.appendChild(ripple);
  
  setTimeout(() => ripple.remove(), 600);
}

// Immediately apply theme from local storage at the start (no delay)
(function applyTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
  }
})();

function setupDragAndDrop() {
  const dropArea = document.getElementById('drop-area');
  const fileInput = document.getElementById('file-upload');
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
  });
  
  dropArea.addEventListener('drop', handleDrop, false);
  
  fileInput.addEventListener('change', function() {
    handleFileUpload(this.files[0]);
  });
  
  dropArea.addEventListener('click', function() {
    fileInput.click();
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  function highlight() {
    dropArea.classList.add('active');
    dropArea.classList.add('pulse');
  }
  
  function unhighlight() {
    dropArea.classList.remove('active');
    dropArea.classList.remove('pulse');
  }
  
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    handleFileUpload(file);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the hamburger menu
  const hamburgerMenu = document.getElementById('hamburger-menu');
  
  if (hamburgerMenu) {
    const hamburgerCheckbox = hamburgerMenu.querySelector('input[type="checkbox"]');
    const navActions = document.querySelector('.nav-actions');
    
    hamburgerCheckbox.addEventListener('change', function() {
      if (this.checked) {
        navActions.classList.add('mobile-open');
      } else {
        navActions.classList.remove('mobile-open');
      }
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
      if (!hamburgerMenu.contains(e.target) && !navActions.contains(e.target)) {
        navActions.classList.remove('mobile-open');
        hamburgerCheckbox.checked = false;
      }
    });
    
    // Close mobile menu when a link is clicked
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        if (navActions.classList.contains('mobile-open')) {
          navActions.classList.remove('mobile-open');
          hamburgerCheckbox.checked = false;
        }
      });
    });
  }
  
  // Set current year in the footer
  const currentYearSpan = document.getElementById('current-year');
  if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
  }
  
  // Toggle dark mode functionality
  const toggleTheme = document.getElementById('toggle-theme');
  const body = document.body;

  // Check for saved theme preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    body.classList.add('dark-mode');
  }

  // Toggle dark mode when button is clicked
  if (toggleTheme) {
  toggleTheme.addEventListener('click', function(e) {
    body.classList.toggle('dark-mode');
    
    // Create ripple effect
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    toggleTheme.appendChild(ripple);
    
    const rect = toggleTheme.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size/2}px`;
    ripple.style.top = `${e.clientY - rect.top - size/2}px`;
    
    ripple.addEventListener('animationend', function() {
      ripple.remove();
    });
    
    // Save theme preference
    if (body.classList.contains('dark-mode')) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
  });
  }
  
  // Handle dropdowns for mobile view
  const dropdownBtns = document.querySelectorAll('.dropdown-btn');
  
  dropdownBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      // Only handle special dropdown logic in mobile view
      if (window.innerWidth <= 768) {
        e.preventDefault();
        const dropdownContent = this.nextElementSibling;
        
        // Close all other dropdowns
        document.querySelectorAll('.dropdown-content').forEach(content => {
          if (content !== dropdownContent) {
            content.classList.remove('show-mobile');
          }
        });
        
        // Toggle this dropdown
        dropdownContent.classList.toggle('show-mobile');
        e.stopPropagation();
      }
    });
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', function(e) {
    if (window.innerWidth <= 768 && !e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown-content').forEach(content => {
        content.classList.remove('show-mobile');
      });
    }
  });
  
  // Add proper error handling for missing elements
  const downloadJsonBtn = document.getElementById("download-json");
  if (downloadJsonBtn) downloadJsonBtn.addEventListener("click", downloadJSON);
  
  const downloadCsvBtn = document.getElementById("download-csv");
  if (downloadCsvBtn) downloadCsvBtn.addEventListener("click", downloadCSV);
  
  const downloadXmlBtn = document.getElementById("download-xml");
  if (downloadXmlBtn) downloadXmlBtn.addEventListener("click", downloadXML);
  
  const downloadYamlBtn = document.getElementById("download-yaml");
  if (downloadYamlBtn) downloadYamlBtn.addEventListener("click", downloadYAML);

  // Add missing event listeners
  const formatButton = document.querySelector('[onclick="formatJSON()"]');
  if (formatButton) {
    formatButton.removeAttribute('onclick');
    formatButton.addEventListener("click", formatJSON);
  }

  const minifyButton = document.querySelector('[onclick="minifyJSON()"]');
  if (minifyButton) {
    minifyButton.removeAttribute('onclick');
    minifyButton.addEventListener("click", minifyJSON);
  }

  const sampleButton = document.querySelector('[onclick="addSampleJSON()"]');
  if (sampleButton) {
    sampleButton.removeAttribute('onclick');
    sampleButton.addEventListener("click", addSampleJSON);
  }
  
  // Copy output button functionality
  const copyOutputBtn = document.getElementById("copy-output");
  if (copyOutputBtn) copyOutputBtn.addEventListener("click", copyJSON);
  
  const copyJsonPathBtn = document.getElementById("copy-jsonpath");
  if (copyJsonPathBtn) {
    copyJsonPathBtn.addEventListener("click", function() {
      const jsonPathExpression = document.getElementById('jsonpath-expression');
      if (jsonPathExpression) {
        navigator.clipboard.writeText(jsonPathExpression.textContent)
      .then(() => showToast('JSONPath copied to clipboard!'));
      }
  });
  }
  
  setupDragAndDrop();
  
  const jsonInput = document.getElementById("json-input");
  if (jsonInput) {
    // Add paste event listener to automatically format JSON when pasted
    jsonInput.addEventListener('paste', function(e) {
      // Use setTimeout to wait for the paste to complete
      setTimeout(() => formatJSON(), 0);
    });
    
    // Keep the existing input event for real-time validation
    jsonInput.addEventListener('input', debounce(function() {
      // Explicitly call validateJSON to update the indicator
      validateJSON();
      
      updateLineNumbers('input-line-numbers', jsonInput.value);
      
      // Try to format JSON automatically when input changes
      try {
        const input = jsonInput.value.trim();
        if (input) {
          const obj = JSON.parse(input);
          const output = document.getElementById("json-output");
          
          // Make sure the output container is visible, especially on mobile
          const outputContainer = document.querySelector('.output-container');
          if (outputContainer) {
            outputContainer.style.display = 'block';
          }
          
          output.textContent = JSON.stringify(obj, null, 2);
          output.className = "output success";
          animateOutput();
          
          // Update output line numbers
          updateLineNumbers('output-line-numbers', output.textContent);
          
          // Update the JSON Path finder with the parsed object
          buildJsonPathTree(obj);
        }
      } catch (e) {
        // Silently fail if not valid JSON yet - validation will show the error via validateJSON() call
      }
    }, 300));
    
    // Add special handling for mobile devices
    function addMobileFormatButton() {
      // Remove any existing mobile format button
      const existingButton = document.getElementById('mobile-format-button');
      if (existingButton) {
        existingButton.remove();
      }
      
      // Only add the button on mobile
      if (window.innerWidth <= 768) {
        // Create a mobile format button for better UX on mobile
        const mobileFormatBtn = document.createElement('button');
        mobileFormatBtn.id = 'mobile-format-button';
        mobileFormatBtn.className = 'btn-primary';
        mobileFormatBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10H3M21 6H3M21 14H3M21 18H3"></path>
          </svg>
          Format JSON
        `;
        mobileFormatBtn.addEventListener('click', formatJSON);
        
        // Insert button after input container
        const inputContainer = document.querySelector('.input-container');
        if (inputContainer && inputContainer.parentNode) {
          inputContainer.parentNode.insertBefore(mobileFormatBtn, inputContainer.nextSibling);
        }
      }
    }
    
    // Add the button on page load
    addMobileFormatButton();
    
    // Update the button when window is resized
    window.addEventListener('resize', addMobileFormatButton);
    
    // Sync scrolling between textarea and line numbers
    jsonInput.addEventListener('scroll', function() {
      const lineNumbers = document.getElementById('input-line-numbers');
      if (lineNumbers) {
        lineNumbers.scrollTop = this.scrollTop;
      }
      
      // Hide textarea info when scrolled down, show when back at top
      const textareaInfo = document.querySelector('.textarea-info');
      if (textareaInfo) {
        if (this.scrollTop > 10) {
          textareaInfo.classList.add('textarea-info-hidden');
          // Make validation indicator more visible when scrolled
          const validationIndicator = document.getElementById('validation-indicator');
          if (validationIndicator && (validationIndicator.classList.contains('valid') || 
             validationIndicator.classList.contains('invalid'))) {
            validationIndicator.style.opacity = '1';
          }
        } else {
          textareaInfo.classList.remove('textarea-info-hidden');
          // Restore normal opacity
          const validationIndicator = document.getElementById('validation-indicator');
          if (validationIndicator) {
            validationIndicator.style.opacity = '0.7';
          }
        }
      }
    });
    
    // Listen for manual resize events on the textarea
    jsonInput.addEventListener('mouseup', function() {
      // Update line numbers on manual resize
      updateLineNumbers('input-line-numbers', jsonInput.value);
    });
    
    // Add periodic check for textarea size changes (for browsers that don't support ResizeObserver)
    let lastHeight = jsonInput.clientHeight;
    let sizeCheckInterval = null;
    
    // Fallback for browsers without ResizeObserver
    function setupSizeCheck() {
      if (!window.ResizeObserver) {
        console.log("ResizeObserver not supported, using fallback");
        sizeCheckInterval = setInterval(() => {
          if (jsonInput.clientHeight !== lastHeight) {
            lastHeight = jsonInput.clientHeight;
            updateLineNumbers('input-line-numbers', jsonInput.value);
            
            // Also update the line numbers container height to match textarea
            const lineNumbers = document.getElementById('input-line-numbers');
            if (lineNumbers) {
              lineNumbers.style.height = `${jsonInput.clientHeight}px`;
            }
          }
        }, 250);
      }
    }
    
    // Clean up the interval when the page unloads
    window.addEventListener('beforeunload', () => {
      if (sizeCheckInterval) {
        clearInterval(sizeCheckInterval);
      }
    });
    
    // Set up a resize observer to watch for textarea resizing
    if (window.ResizeObserver) {
      try {
        const resizeObserver = new ResizeObserver(entries => {
          for (let entry of entries) {
            if (entry.target === jsonInput) {
              updateLineNumbers('input-line-numbers', jsonInput.value);
              // Also update the line numbers container height to match textarea
              const lineNumbers = document.getElementById('input-line-numbers');
              if (lineNumbers) {
                lineNumbers.style.height = `${entry.contentRect.height}px`;
              }
            }
          }
        });
        
        // Start observing the textarea for resize events
        resizeObserver.observe(jsonInput);
      } catch (e) {
        console.error("Error setting up ResizeObserver:", e);
        setupSizeCheck(); // Fall back to interval checking
      }
    } else {
      setupSizeCheck(); // Fall back to interval checking
    }
    
    // Set up output scroll synchronization
    const jsonOutput = document.getElementById('json-output');
    if (jsonOutput) {
      jsonOutput.addEventListener('scroll', function() {
        const lineNumbers = document.getElementById('output-line-numbers');
        if (lineNumbers) {
          lineNumbers.scrollTop = this.scrollTop;
        }
      });
    }
    
    // Initialize line numbers if elements exist
    const inputLineNumbers = document.getElementById('input-line-numbers');
    const outputLineNumbers = document.getElementById('output-line-numbers');
    
    if (jsonInput && inputLineNumbers) {
      updateLineNumbers('input-line-numbers', jsonInput.value);
    }
    
    if (jsonOutput && outputLineNumbers) {
      updateLineNumbers('output-line-numbers', jsonOutput.textContent);
    }
  }
  
  // Initial validation
  validateJSON();
  
  // Ensure the output container is properly initialized
  const outputContainer = document.querySelector('.output-container');
  if (outputContainer) {
    // Make sure the output container is visible by default, especially on mobile
    if (window.innerWidth <= 768) {
      outputContainer.style.display = 'block';
    }
  }
  
  // Mobile menu is already initialized in the document ready handler
}); 