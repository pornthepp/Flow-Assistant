// content.js - Injected into the page for Element Border and Element Pick Setup

// State variables
let pickMode = false;
let currentPickerResolver = null;
let hoveredElement = null;

const PICK_OUTLINE = '3px solid #f59e0b';
const PICK_BG = 'rgba(245, 158, 11, 0.2)';

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'TOGGLE_BORDER') {
        const { enabled, color, opacity } = request.payload;
        updateGlobalBorder(enabled, color, opacity);
        sendResponse({ success: true });
    } else if (request.action === 'START_PICKING') {
        startPickMode()
            .then(selector => {
                sendResponse({ success: true, selector });
            })
            .catch(err => {
                sendResponse({ success: false, error: err.message });
            });
        return true; // Keep message channel open for async response
    } else if (request.action === 'TEST_SELECTOR') {
        const el = document.querySelector(request.selector);
        if (el) {
            const originalOutline = el.style.outline;
            const originalTransition = el.style.transition;
            el.style.transition = 'outline 0.2s';
            el.style.outline = '4px solid #10b981';
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            setTimeout(() => {
                el.style.outline = originalOutline;
                el.style.transition = originalTransition;
                try {
                    el.click();
                } catch(e) {}
            }, 600);

            sendResponse({ success: true });
        } else {
            sendResponse({ success: false });
        }
    }
});

function updateGlobalBorder(enabled, color, opacity) {
    let styleTag = document.getElementById('flow-assistant-border-style');
    if (!enabled) {
        if (styleTag) styleTag.remove();
        return;
    }

    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'flow-assistant-border-style';
        document.head.appendChild(styleTag);
    }

    // Convert hex color + opacity to rgba
    // If color is hex (e.g., #ff0000), parse it
    let r = 255, g = 0, b = 0;
    if (color && color.startsWith('#')) {
        const hex = color.replace('#', '');
        if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        }
    }
    
    // Applying border to common interactive elements or all text nodes, buttons, inputs etc.
    // To not break layout, use outline
    styleTag.textContent = `
        div, button, input, textarea, img, span, p, a {
            outline: 1px solid rgba(${r}, ${g}, ${b}, ${opacity}) !important;
            outline-offset: -1px !important;
        }
    `;
}

// === Element picker logic ===

function startPickMode() {
    return new Promise((resolve, reject) => {
        if (pickMode) {
            reject(new Error('Pick mode already active'));
            return;
        }
        pickMode = true;
        currentPickerResolver = resolve;

        document.addEventListener('mouseover', onMouseOver, { capture: true });
        document.addEventListener('mouseout', onMouseOut, { capture: true });
        document.addEventListener('click', onClick, { capture: true, once: true });
        document.addEventListener('keydown', onKeyDown, { capture: true });

        // Change cursor
        document.body.style.setProperty('cursor', 'crosshair', 'important');
    });
}

function stopPickMode() {
    pickMode = false;
    currentPickerResolver = null;
    if (hoveredElement) {
        hoveredElement.style.outline = hoveredElement.dataset.originalOutline || '';
        hoveredElement.style.backgroundColor = hoveredElement.dataset.originalBg || '';
        hoveredElement = null;
    }
    document.removeEventListener('mouseover', onMouseOver, { capture: true });
    document.removeEventListener('mouseout', onMouseOut, { capture: true });
    // Note: click listener is removed automatically because of {once: true} (except if cancelled by Esc)
    document.removeEventListener('click', onClick, { capture: true });
    document.removeEventListener('keydown', onKeyDown, { capture: true });
    document.body.style.removeProperty('cursor');
}

function onMouseOver(e) {
    if (!pickMode) return;
    const target = e.target;
    if (hoveredElement !== target) {
        if (hoveredElement) {
            hoveredElement.style.outline = hoveredElement.dataset.originalOutline || '';
            hoveredElement.style.backgroundColor = hoveredElement.dataset.originalBg || '';
        }
        hoveredElement = target;
        target.dataset.originalOutline = target.style.outline;
        target.dataset.originalBg = target.style.backgroundColor;
        target.style.outline = PICK_OUTLINE;
        target.style.backgroundColor = PICK_BG;
    }
}

function onMouseOut(e) {
    if (!pickMode) return;
    const target = e.target;
    if (hoveredElement === target) {
        target.style.outline = target.dataset.originalOutline || '';
        target.style.backgroundColor = target.dataset.originalBg || '';
        hoveredElement = null;
    }
}

function onClick(e) {
    if (!pickMode) return;
    e.preventDefault();
    e.stopPropagation();

    const target = e.target;
    const selector = generateSelector(target);

    // Call resolver and stop
    if (currentPickerResolver) {
        currentPickerResolver(selector);
    }
    stopPickMode();
}

function onKeyDown(e) {
    if (!pickMode) return;
    if (e.key === 'Escape') {
        if (currentPickerResolver) {
            currentPickerResolver(null); // Return null on cancel
        }
        stopPickMode();
    }
}

function generateSelector(el) {
    if (!el) return "";
    
    // Strategy: Try to find a reasonably robust selector.
    // 1. If has id, use it.
    if (el.id) {
        // Ensure id is unique and doesn't contain weird characters
        if (/^[a-zA-Z][a-zA-Z0-9_\-]*$/.test(el.id)) {
             return "#" + el.id;
        }
    }
    
    // 2. Specific custom attributes for the target app (e.g., data-slate-editor)
    if (el.hasAttribute('data-slate-editor')) {
        return '[data-slate-editor="true"][contenteditable="true"]';
    }
    
    // 3. Aria labels or specific tags
    const tag = el.tagName.toLowerCase();
    
    if (tag === 'img' && el.alt) {
        return `img[alt="${el.alt}"]`;
    }

    if ((tag === 'button' || el.role === 'button')) {
        // Try looking at children (like inside spans or icons)
        // If it has text content that makes sense
        const text = el.textContent.trim();
        if (text && text.length < 30 && !text.includes('\n')) {
             // For buttons, a selector containing text isn't ideal in CSS, but Chrome allows some structural picking.
             // We'll fallback to class structure
        }
    }

    // 4. Fallback to path
    let path = [];
    let current = el;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
        let selector = current.nodeName.toLowerCase();
        
        if (current.id && /^[a-zA-Z][a-zA-Z0-9_\-]*$/.test(current.id)) {
            selector += '#' + current.id;
            path.unshift(selector);
            break;
        } else {
            let sib = current, nth = 1;
            while (sib = sib.previousElementSibling) {
                if (sib.nodeName.toLowerCase() == selector) nth++;
            }
            if (nth != 1 || current.nextElementSibling) {
                selector += ":nth-of-type(" + nth + ")";
            }
            
            // Add classes if any, to make it somewhat readable
            if (current.className && typeof current.className === 'string') {
                const classes = current.className.trim().split(/\s+/).filter(c => c && !c.includes(':') && !c.includes('['));
                if (classes.length > 0) {
                     // Get first 2 stable looking classes
                     const goodClasses = classes.filter(c => !c.match(/[0-9]{3,}/)).slice(0, 2);
                     if (goodClasses.length > 0) {
                         selector += '.' + goodClasses.join('.');
                     }
                }
            }
        }
        path.unshift(selector);
        current = current.parentNode;
    }
    return path.join(" > ");
}
