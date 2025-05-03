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
    
    // Apply syntax highlighting to input if valid
    applyInputSyntaxHighlighting();
    
    return true; // Return true if valid
  } catch (e) {
    if (indicator) {
      indicator.className = "validation-indicator invalid visible";
    }
    
    // If validation fails, update validation status with error
    if (typeof updateValidationStatus === 'function') {
      updateValidationStatus(false, e);
    }
    
    return false; // Return false if invalid
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
            jsonPathValue.innerHTML = formatJSONWithHighlighting(JSON.stringify(value, null, 2));
          } else {
            jsonPathValue.innerHTML = formatValueWithHighlighting(value);
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

function formatJSONWithHighlighting(jsonString) {
  if (!jsonString) return '';
  
  return jsonString
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match) {
      let cls = 'number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'key';
          // Remove the colon from the key
          match = match.replace(/:$/, '');
          // Add the colon with punctuation class
          return '<span class="' + cls + '">' + match + '</span><span class="punctuation">:</span>';
        } else {
          cls = 'string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'boolean';
      } else if (/null/.test(match)) {
        cls = 'null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    })
    .replace(/\{|\}|\[|\]|,/g, function(match) {
      return '<span class="punctuation">' + match + '</span>';
    })
    .replace(/\n( +)/g, function(match, p1) {
      return '\n<span class="indent">' + p1 + '</span>';
    });
}

function formatValueWithHighlighting(value) {
  if (value === undefined) return '<span class="null">undefined</span>';
  
  if (value === null) return '<span class="null">null</span>';
  
  if (typeof value === 'string') {
    return '<span class="string">"' + value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '"</span>';
  }
  
  if (typeof value === 'number') {
    return '<span class="number">' + value + '</span>';
  }
  
  if (typeof value === 'boolean') {
    return '<span class="boolean">' + value + '</span>';
  }
  
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
    
    // Apply syntax highlighting to the formatted JSON
    const formatted = JSON.stringify(obj, null, 2);
    output.innerHTML = formatJSONWithHighlighting(formatted);
    output.className = "output success";
    animateOutput();
    
    // Update the validation indicator
    validateJSON();
    
    // Check if updateValidationStatus exists before calling
    if (typeof updateValidationStatus === 'function') {
    updateValidationStatus(true);
    }
    
    // Update line numbers for output
    updateLineNumbers('output-line-numbers', formatted);
    
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
    const minified = JSON.stringify(obj);
    output.innerHTML = formatJSONWithHighlighting(minified);
    output.className = "output info";
    animateOutput();
    
    // Update the validation indicator
    validateJSON();
    
    // Check if updateValidationStatus exists before calling
    if (typeof updateValidationStatus === 'function') {
    updateValidationStatus(true);
    }
    
    // Update line numbers for output
    updateLineNumbers('output-line-numbers', minified);
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
  const output = document.getElementById("json-output");
  
  if (!output || !output.textContent.trim() || output.textContent.includes("Invalid JSON")) {
    showToast("Nothing to copy");
    return;
  }
  
  // We need to get the plain text from the highlighted HTML content
  const plainText = output.textContent;
  
  navigator.clipboard.writeText(plainText).then(() => {
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
    return;
  }
  
  // Check if the file is a JSON file
  if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
    showToast('Please upload a JSON file');
    return;
  }
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const content = e.target.result;
      const jsonObj = JSON.parse(content);
      
      // Format the JSON with proper indentation
      const formattedJson = JSON.stringify(jsonObj, null, 2);
      
      // Update the input field with the formatted JSON
      const jsonInput = document.getElementById('json-input');
      jsonInput.value = formattedJson;
      
      // Update line numbers
      updateLineNumbers('input-line-numbers', formattedJson);
      
      // Update validation
      validateJSON();
      
      // Automatically format and display the output
      const output = document.getElementById('json-output');
      output.innerHTML = formatJSONWithHighlighting(formattedJson);
        output.className = "output success";
        
      // Update line numbers for output
      updateLineNumbers('output-line-numbers', formattedJson);
      
      // Update the JSON Path finder with the parsed object
      buildJsonPathTree(jsonObj);
      
      // Show success toast
      showToast('File uploaded and formatted successfully!');
    } catch (e) {
      showToast('Error parsing JSON file: ' + e.message);
    }
  };
  
  reader.onerror = function() {
    showToast('Error reading file');
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
  const sampleJSON = {
    "glossary": {
      "title": "example glossary",
      "GlossDiv": {
        "title": "S",
        "GlossList": {
          "GlossEntry": {
            "ID": "SGML",
            "SortAs": "SGML",
            "GlossTerm": "Standard Generalized Markup Language",
            "Acronym": "SGML",
            "Abbrev": "ISO 8879:1986",
            "GlossDef": {
              "para": "A meta-markup language, used to create markup languages such as DocBook.",
              "GlossSeeAlso": ["GML", "XML"]
            },
            "GlossSee": "markup"
          }
        }
      }
    },
    "numbers": [1, 2, 3, 42, 98.6, 100],
    "boolean_values": { "true": true, "false": false },
    "null_value": null,
    "current_date": new Date().toISOString()
  };
  
  const jsonInput = document.getElementById("json-input");
  const formattedJSON = JSON.stringify(sampleJSON, null, 2);
  
  if (jsonInput) {
    jsonInput.value = formattedJSON;
  
  // Update input line numbers
    updateLineNumbers('input-line-numbers', formattedJSON);
  
    // Call format function to update output
    formatJSON();
    
    // Apply syntax highlighting to input
    applyInputSyntaxHighlighting();
  }
}

// Mobile menu functionality is now directly in the DOMContentLoaded event

function toggleTheme() {
  const body = document.body;
  const isDarkMode = body.classList.contains('dark-mode');
  
  if (isDarkMode) {
    body.classList.remove('dark-mode');
    localStorage.setItem('theme', 'light');
  } else {
    body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
  }
  
  // Update the validation status to adjust styles if function exists
  if (typeof validateJSON === 'function' && document.getElementById('validation-indicator')) {
    validateJSON();
  }
}

// Apply theme function
function applyTheme() {
  const savedTheme = localStorage.getItem('theme');
  // Default to dark mode unless explicitly set to light
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-mode');
  } else {
    // Always set dark mode as default
    document.body.classList.add('dark-mode');
    // If no theme is saved yet, save dark as the default
    if (!savedTheme) {
      localStorage.setItem('theme', 'dark');
    }
  }
  
  // Update validation indicator based on the applied theme if it exists
  if (typeof validateJSON === 'function' && document.getElementById('validation-indicator')) {
    validateJSON();
  }
}

// Theme will be applied in DOMContentLoaded

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

// Function to handle paste from clipboard
function pasteFromClipboard() {
  // Add ripple effect to button
  const pasteButton = document.getElementById('paste-button');
  if (pasteButton) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    pasteButton.appendChild(ripple);
  
    // Remove ripple after animation completes
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  navigator.clipboard.readText()
    .then(text => {
      const jsonInput = document.getElementById("json-input");
      if (jsonInput) {
        jsonInput.value = text;
        
        // Update line numbers
        updateLineNumbers('input-line-numbers', text);

        // Validate and potentially format the pasted JSON
        validateJSON();
        
        // Try to format the JSON if it's valid
        try {
          const obj = JSON.parse(text);
          
          // Make sure the output container is visible
          const outputContainer = document.querySelector('.output-container');
          if (outputContainer) {
            outputContainer.style.display = 'block';
          }
          
          // Update output
          const output = document.getElementById("json-output");
          output.textContent = JSON.stringify(obj, null, 2);
          output.className = "output success";
          animateOutput();
          
          // Update output line numbers
          updateLineNumbers('output-line-numbers', output.textContent);
          
          // Update JSON path finder
          buildJsonPathTree(obj);
          
          showToast("JSON pasted and formatted!");
        } catch (e) {
          // If it's not valid JSON, just paste the text
          showToast("Text pasted from clipboard");
        }
      }
    })
    .catch(err => {
      showToast("Failed to read clipboard: " + err.message);
    });
}

// Add function to create paste button in the input container
function addPasteButton() {
  const inputContainer = document.querySelector('.input-container');
  
  if (inputContainer) {
    // Check if button already exists
    if (!document.getElementById('paste-button')) {
      // Create paste button
      const pasteButton = document.createElement('button');
      pasteButton.id = 'paste-button';
      pasteButton.className = 'paste-button';
      pasteButton.setAttribute('title', 'Paste');
      pasteButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>
      `;
      
      // Add click event listener
      pasteButton.addEventListener('click', pasteFromClipboard);
      
      // Append to input container
      inputContainer.appendChild(pasteButton);
    }
  }
}

// Set up keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    // Check for Ctrl+V or Cmd+V (paste) when focus is not in the textarea
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      const activeElement = document.activeElement;
      const jsonInput = document.getElementById('json-input');
      
      // Only handle the shortcut if we're not already in the input field
      if (activeElement !== jsonInput && 
          activeElement.tagName !== 'INPUT' && 
          activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        pasteFromClipboard();
      }
    }
  });
  }
  
document.addEventListener('DOMContentLoaded', function() {
  // Apply theme first to prevent flash of unstyled content
  applyTheme();
  
  // Initialize the hamburger menu
  const hamburgerMenu = document.getElementById('hamburger-menu');
  const navActions = document.querySelector('.nav-actions');
  
  if (hamburgerMenu) {
    const hamburgerCheckbox = hamburgerMenu.querySelector('input[type="checkbox"]');
    
    // Handle hamburger menu toggle
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
  
  // Set up theme toggle
  const themeToggleBtn = document.getElementById("toggle-theme");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", function() {
      toggleTheme();
      
      // Add ripple animation effect
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      this.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
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
    
    // Find the JSON input's 'input' event listener and update it:
    jsonInput.addEventListener('input', debounce(function() {
      // Apply real-time syntax highlighting to input
      applyInputSyntaxHighlighting();
      
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
          
          const formatted = JSON.stringify(obj, null, 2);
          output.innerHTML = formatJSONWithHighlighting(formatted);
          output.className = "output success";
          animateOutput();
          
          // Update output line numbers
          updateLineNumbers('output-line-numbers', formatted);
          
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
    window.addEventListener('resize', function() {
      addMobileFormatButton();
      addPasteButton(); // Ensure paste button is added after resize
    });
    
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
  
  // Setup input formatting on blur
  setupInputFormatting();
  
  // Ensure the output container is properly initialized
  const outputContainer = document.querySelector('.output-container');
  if (outputContainer) {
    // Make sure the output container is visible by default, especially on mobile
    if (window.innerWidth <= 768) {
      outputContainer.style.display = 'block';
    }
  }
  
  // Mobile menu is already initialized in the document ready handler
  
  // Add paste button to input container
  addPasteButton();
  
  // Setup keyboard shortcuts
  setupKeyboardShortcuts();
  
  // Add copy button for JSONPath value
  const copyJsonPathValueBtn = document.getElementById('copy-jsonpath-value');
  if (copyJsonPathValueBtn) {
    copyJsonPathValueBtn.addEventListener('click', function() {
      const jsonPathValue = document.getElementById('jsonpath-value');
      if (jsonPathValue) {
        // Create a temporary textarea to hold the plain text (without HTML formatting)
        const textarea = document.createElement('textarea');
        // Get text content (without HTML tags)
        textarea.value = jsonPathValue.textContent;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        // Add ripple effect
        addRippleEffect(this);
        
        // Show toast
        showToast('Value copied to clipboard');
      }
    });
  }
  
  // Initial setup
  validateJSON();
  setupInputFormatting();
  
  // Apply syntax highlighting to any initial input
  applyInputSyntaxHighlighting();
  
  // Check for initial content and format it
  const initialInput = jsonInput.value.trim();
  if (initialInput) {
    try {
      const obj = JSON.parse(initialInput);
      const formatted = JSON.stringify(obj, null, 2);
      jsonInput.value = formatted;
      updateLineNumbers('input-line-numbers', formatted);
      
      // Update output with highlighted content
      const output = document.getElementById("json-output");
      output.innerHTML = formatJSONWithHighlighting(formatted);
      output.className = "output success";
      
      // Update the JSON Path finder with the parsed object
      buildJsonPathTree(obj);
    } catch (e) {
      // Invalid initial JSON, just update line numbers
      updateLineNumbers('input-line-numbers', initialInput);
    }
  }
});

// Add this after formatJSONWithHighlighting function
function highlightInputJson() {
  const input = document.getElementById('json-input');
  if (!input) return;
  
  try {
    // Only highlight if we have valid JSON
    const jsonText = input.value.trim();
    if (!jsonText) return;
    
    JSON.parse(jsonText); // Just to validate, we don't use the result
    
    // If valid, we can safely format for next time the user focuses away
    // We don't format directly to avoid changing user's editing position
    input.dataset.validJson = 'true';
  } catch (e) {
    // If invalid JSON, remove the valid flag
    delete input.dataset.validJson;
    return; // Don't try to highlight invalid JSON
  }
}

// Add an event to format the input when the user blurs the textarea
function setupInputFormatting() {
  const input = document.getElementById('json-input');
  if (!input) return;
  
  input.addEventListener('blur', function() {
    // Only format if the JSON was valid on last check
    if (input.dataset.validJson === 'true') {
      try {
        const jsonText = input.value.trim();
        if (!jsonText) return;
        
        const parsed = JSON.parse(jsonText);
        input.value = JSON.stringify(parsed, null, 2);
        
        // Update line numbers for the new formatted text
        updateLineNumbers('input-line-numbers', input.value);
      } catch (e) {
        // If somehow it's now invalid, remove the flag
        delete input.dataset.validJson;
      }
    }
  });
}

// Add this after highlightInputJson function
function applyInputSyntaxHighlighting() {
  const jsonInput = document.getElementById('json-input');
  if (!jsonInput) return;
  
  // Create a syntax highlight overlay if it doesn't exist
  let syntaxOverlay = document.getElementById('syntax-highlight-overlay');
  if (!syntaxOverlay) {
    syntaxOverlay = document.createElement('div');
    syntaxOverlay.id = 'syntax-highlight-overlay';
    syntaxOverlay.className = 'syntax-highlight-overlay';
    jsonInput.parentNode.insertBefore(syntaxOverlay, jsonInput);
    
    // Match scroll positions between overlay and textarea
    jsonInput.addEventListener('scroll', function() {
      syntaxOverlay.scrollTop = jsonInput.scrollTop;
      syntaxOverlay.scrollLeft = jsonInput.scrollLeft;
    });
  }
  
  const jsonText = jsonInput.value;
  try {
    // Only apply highlighting if JSON is valid
    if (jsonText.trim()) {
      // First try to parse it to verify it's valid JSON
      JSON.parse(jsonText);
      
      // Apply highlighting
      syntaxOverlay.innerHTML = formatJSONWithHighlighting(jsonText);
      syntaxOverlay.style.display = 'block';
      
      // Add highlighting class to the input
      jsonInput.classList.add('has-highlighting');
    } else {
      syntaxOverlay.innerHTML = '';
      syntaxOverlay.style.display = 'none';
      jsonInput.classList.remove('has-highlighting');
    }
  } catch (e) {
    // For invalid JSON, hide the overlay
    syntaxOverlay.innerHTML = '';
    syntaxOverlay.style.display = 'none';
    jsonInput.classList.remove('has-highlighting');
  }
} 