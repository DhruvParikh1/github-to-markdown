// Log when content script loads
console.log('Claude Paste Manager content script loaded');

// Detect which platform we're on and set appropriate selectors
function getPlatformConfig() {
  const hostname = window.location.hostname;

  if (hostname.includes('claude.ai')) {
    return {
      chatBoxSelector: '.ProseMirror',
      fileInputSelector: '#chat-input-file-upload-onpage',
      platform: 'claude'
    };
  } else if (hostname.includes('chatgpt.com')) {
    return {
      chatBoxSelector: '#prompt-textarea',
      fileInputSelector: 'form[data-type="unified-composer"] input[type="file"]:not(#upload-photos):not(#upload-camera)',
      platform: 'chatgpt'
    };
  } else if (hostname.includes('kimi.com') || hostname.includes('moonshot.cn')) {
    return {
      chatBoxSelector: '.chat-input-editor',
      fileInputSelector: 'input[type="file"].hidden-input',
      platform: 'kimi'
    };
  } else if (hostname.includes('deepseek.com')) {
    return {
      chatBoxSelector: 'textarea[placeholder="Message DeepSeek"]',
      fileInputSelector: 'input[type="file"]',
      platform: 'deepseek'
    };
  } else if (hostname.includes('grok.com')) {
    return {
      chatBoxSelector: '.tiptap.ProseMirror',
      fileInputSelector: 'input[type="file"][name="files"]',
      platform: 'grok'
    };
  } else if (hostname.includes('gemini.google.com')) {
    return {
      chatBoxSelector: '.ql-editor',
      fileInputSelector: null, // Not used for Gemini
      attachmentMethod: 'clipboard', // Use clipboard paste for file attachments
      platform: 'gemini'
    };
  }

  // Default to Claude selectors
  return {
    chatBoxSelector: '.ProseMirror',
    fileInputSelector: '#chat-input-file-upload-onpage',
    platform: 'claude'
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request.action);

    if (request.action === 'sendToChat') {
      const content = request.data;
      insertIntoChatBox(content);
      sendResponse({ status: 'success' });
    } else if (request.action === 'sendAsFile') {
      const { content, filename, fileType } = request.data;
      // Handle async attachAsFile properly
      attachAsFile(content, filename, fileType)
        .then(() => {
          sendResponse({ status: 'success' });
        })
        .catch((error) => {
          console.error('Error attaching file:', error);
          sendResponse({ status: 'error', message: error.message });
        });
      return true; // Keep the message channel open for async response
    }
  });

function insertIntoChatBox(text) {
  const config = getPlatformConfig();

  // Locate the chat box using the platform-specific selector
  const chatBox = document.querySelector(config.chatBoxSelector);

  if (!chatBox) {
    console.error(`Chat box not found. Tried selector: ${config.chatBoxSelector}`);
    return;
  }

  // Focus the chat box
  chatBox.focus();

  // Check if it's a textarea element (DeepSeek uses textarea)
  if (chatBox.tagName === 'TEXTAREA') {
    // For textarea elements, set value directly
    insertIntoTextarea(chatBox, text);
  } else if (config.platform === 'gemini') {
    // For Gemini, use special Quill editor insertion
    insertIntoQuillEditor(chatBox, text);
  } else {
    // For contenteditable elements (Claude, Kimi, ChatGPT, Grok), simulate paste event
    simulatePaste(text);
  }
}

function insertIntoTextarea(textarea, text) {
  // Normalize all types of line breaks to \n
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Set the value directly
  textarea.value = text;

  // Dispatch input and change events to trigger any listeners
  const inputEvent = new Event('input', { bubbles: true });
  const changeEvent = new Event('change', { bubbles: true });

  textarea.dispatchEvent(inputEvent);
  textarea.dispatchEvent(changeEvent);

  console.log(`Text inserted into textarea: ${text.substring(0, 50)}...`);
}

function insertIntoQuillEditor(editor, text) {
  // Normalize all types of line breaks to \n
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  console.log('[Gemini] Inserting text using execCommand');

  // Focus the editor
  editor.focus();

  // Ensure we have a valid selection
  const selection = window.getSelection();
  
  if (!selection.rangeCount) {
    console.log('[Gemini] No selection, creating one at end');
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  // Wait a tiny bit for focus to settle
  setTimeout(() => {
    // Split by lines and insert each line
    const lines = text.split('\n');
    
    lines.forEach((line, index) => {
      // Insert the text using execCommand (works in many contenteditable scenarios)
      document.execCommand('insertText', false, line);
      
      // After each line (except last), insert a line break
      if (index < lines.length - 1) {
        // Insert paragraph break (Enter key)
        document.execCommand('insertParagraph', false, null);
      }
    });
    
    console.log('[Gemini] Text inserted via execCommand');
  }, 10);
}

function simulatePaste(text) {
  const config = getPlatformConfig();

  // Normalize all types of line breaks to \n
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Create a new ClipboardEvent with the desired text
  const clipboardData = new DataTransfer();
  clipboardData.setData('text/plain', text);

  const pasteEvent = new ClipboardEvent('paste', {
    clipboardData: clipboardData,
    bubbles: true,
    cancelable: true
  });

  // Dispatch the paste event on the chat box
  const chatBox = document.querySelector(config.chatBoxSelector);
  if (chatBox) {
    chatBox.dispatchEvent(pasteEvent);
  } else {
    console.error(`Chat box not found for paste event. Tried selector: ${config.chatBoxSelector}`);
  }
}

async function attachAsFile(content, filename, fileType) {
  try {
    const config = getPlatformConfig();

    // Get the MIME type based on file extension
    const mimeTypes = {
      'txt': 'text/plain',
      'md': 'text/markdown',
      'py': 'text/x-python',
      'js': 'text/javascript',
      'json': 'application/json',
      'html': 'text/html',
      'css': 'text/css'
    };

    const mimeType = mimeTypes[fileType] || 'text/plain';
    const fullFilename = `${filename}.${fileType}`;

    // Create a File object
    const file = new File([content], fullFilename, { type: mimeType });

    // Special handling for Gemini (clipboard paste method)
    if (config.attachmentMethod === 'clipboard') {
      attachAsFileClipboard(file, config);
      console.log(`File attached successfully on ${config.platform}: ${fullFilename}`);
      return;
    }

    // Get the file input element using platform-specific selector
    const fileInput = document.querySelector(config.fileInputSelector);

    if (!fileInput) {
      throw new Error(`File input not found. Tried selector: ${config.fileInputSelector}. Please make sure you are on the ${config.platform} chat page.`);
    }

    // Create a DataTransfer object to hold the file
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    // Set the files property of the input
    fileInput.files = dataTransfer.files;

    // Trigger change event
    const changeEvent = new Event('change', { bubbles: true });
    fileInput.dispatchEvent(changeEvent);

    // Also trigger input event
    const inputEvent = new Event('input', { bubbles: true });
    fileInput.dispatchEvent(inputEvent);

    console.log(`File attached successfully on ${config.platform}: ${fullFilename}`);
  } catch (error) {
    console.error('Error in attachAsFile:', error);
    throw error;
  }
}

function attachAsFileClipboard(file, config) {
  try {
    console.log('[Gemini] Attaching file via clipboard paste:', file.name);

    // Find the target element (Quill editor)
    const targetElement = document.querySelector(config.chatBoxSelector);

    if (!targetElement) {
      throw new Error(`Chat box not found. Tried selector: ${config.chatBoxSelector}`);
    }

    // Focus the element
    targetElement.focus();

    // Create a DataTransfer object and add the file
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    // Create a ClipboardEvent with the file in clipboardData
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: dataTransfer,
      bubbles: true,
      cancelable: true
    });

    // Dispatch the paste event on the target element
    const eventDispatched = targetElement.dispatchEvent(pasteEvent);

    console.log('[Gemini] Clipboard paste event dispatched:', eventDispatched);
    console.log('[Gemini] File should now appear in Gemini interface');

  } catch (error) {
    console.error('[Gemini] Error in attachAsFileClipboard:', error);
    throw error;
  }
}
