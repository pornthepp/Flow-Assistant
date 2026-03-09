// ==========================================
// CATEGORY MULTI-SLOT STORAGE
// ==========================================
const CATEGORY_NAMES = {
    product: 'image', // prefix for product is 'image' for backward compatibility
    face: 'face',
    clothes: 'clothes',
    location: 'loc'
};

async function loadCategorySlots(categoryId) {
    const key = `${categoryId}Slots`;
    return new Promise((resolve) => {
        chrome.storage.local.get(key, (data) => {
            // Support legacy slots migration internally if needed (imageSlots -> productSlots)
            if (categoryId === 'product' && !data[key]) {
                chrome.storage.local.get('imageSlots', (legacy) => {
                    resolve(legacy.imageSlots || []);
                });
            } else {
                resolve(data[key] || []);
            }
        });
    });
}

async function saveCategorySlots(categoryId, slots) {
    const key = `${categoryId}Slots`;
    return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: slots }, resolve);
    });
}

function getNextCategorySlotName(slots, categoryId) {
    let n = 1;
    const prefix = CATEGORY_NAMES[categoryId] || categoryId;
    const names = new Set(slots.map(s => s.id));
    while (names.has(`${prefix}_${n}`)) n++;
    return `${prefix}_${n}`;
}

// Active upload context: { categoryId: 'face', slotId: 'face_1' }
let activeUploadCtx = null;

function triggerCategoryUpload(categoryId, slotId) {
    activeUploadCtx = { categoryId, slotId };
    const input = document.getElementById('hiddenFileInput');
    if (input) {
        input.value = '';
        input.click();
    }
}

async function deleteCategorySlot(categoryId, slotId) {
    let slots = await loadCategorySlots(categoryId);
    slots = slots.filter(s => s.id !== slotId);
    await saveCategorySlots(categoryId, slots);
    renderCategorySlots(categoryId, slots);
}

async function addCategorySlot(categoryId) {
    triggerCategoryUpload(categoryId, 'NEW_SLOT');
}

function renderCategorySlots(categoryId, slots) {
    const listId = `${categoryId}SlotList`;
    const list = document.getElementById(listId);
    if (!list) return;

    list.innerHTML = '';

    if (slots.length === 0) {
        list.innerHTML = `<p style="font-size:0.75rem;color:#6b7280;margin:0;padding:4px 2px;">
            ยังไม่มีภาพในหมวดนี้ — กดปุ่มเพิ่มภาพด้านล่าง</p>`;
        return;
    }

    slots.forEach((slot) => {
        const card = document.createElement('div');
        card.className = 'slot-card';
        card.dataset.id = slot.id;

        // Preview area
        const preview = document.createElement('div');
        preview.className = 'slot-preview';
        if (slot.dataUrl) {
            const img = document.createElement('img');
            img.src = slot.dataUrl;
            preview.appendChild(img);
        } else {
            const ph = document.createElement('span');
            ph.className = 'slot-preview-placeholder';
            ph.textContent = '🖼️';
            preview.appendChild(ph);
        }

        // Info section
        const info = document.createElement('div');
        info.className = 'slot-info';

        // Editable Name
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = slot.id;
        nameInput.className = 'glass-input';
        nameInput.style.cssText = 'padding:2px 6px;font-size:0.8rem;width:100%;max-width:90px;font-weight:bold;color:#a5b4fc;background:rgba(165,180,252,0.1);border:1px solid transparent;border-radius:4px;';
        nameInput.addEventListener('change', async (e) => {
            const newName = e.target.value.trim() || slot.id;
            const currentSlots = await loadCategorySlots(categoryId);
            const idx = currentSlots.findIndex(s => s.id === slot.id);
            if (idx !== -1) {
                currentSlots[idx].id = newName;
                await saveCategorySlots(categoryId, currentSlots);
                renderCategorySlots(categoryId, currentSlots);
            }
        });

        const hint = document.createElement('div');
        hint.className = 'slot-hint';
        hint.textContent = slot.dataUrl ? 'มีภาพแล้ว ✓' : 'ยังไม่มีภาพ';

        info.appendChild(nameInput);
        info.appendChild(hint);

        // Buttons
        const actions = document.createElement('div');
        actions.className = 'slot-actions';

        const uploadBtn = document.createElement('button');
        uploadBtn.className = 'slot-upload-btn';
        uploadBtn.textContent = slot.dataUrl ? '🔄' : '📤';
        uploadBtn.title = 'เปลี่ยนภาพ/อัปโหลด';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'slot-delete-btn';
        deleteBtn.title = 'ลบ slot';
        deleteBtn.innerHTML = '❌';

        const toggleWrap = document.createElement('label');
        toggleWrap.style.cssText = 'display:flex; align-items:center; justify-content:center; cursor:pointer; margin-left:0; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 6px; width: 24px; height: 24px; transition: all 0.2s; flex-shrink: 0;';
        toggleWrap.title = 'เปิด/ปิดการใช้งานรูปนี้';

        const toggleBtn = document.createElement('input');
        toggleBtn.type = 'checkbox';
        toggleBtn.checked = slot.enabled !== false; // Default to true
        toggleBtn.style.accentColor = '#10b981';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.margin = '0';
        toggleBtn.style.width = '14px';
        toggleBtn.style.height = '14px';

        toggleBtn.addEventListener('change', async () => {
            const currentSlots = await loadCategorySlots(categoryId);
            const idx = currentSlots.findIndex(s => s.id === slot.id);
            if (idx !== -1) {
                currentSlots[idx].enabled = toggleBtn.checked;
                await saveCategorySlots(categoryId, currentSlots);
                renderCategorySlots(categoryId, currentSlots);
            }
        });

        toggleWrap.appendChild(toggleBtn);

        actions.appendChild(uploadBtn);
        actions.appendChild(deleteBtn);
        actions.appendChild(toggleWrap);

        if (slot.enabled === false) {
            card.style.opacity = '0.4';
            preview.style.filter = 'grayscale(100%)';
        }

        card.appendChild(preview);
        card.appendChild(info);
        card.appendChild(actions);

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;flex-direction:column;';
        wrapper.appendChild(card);



        list.appendChild(wrapper);

        // Events
        uploadBtn.addEventListener('click', () => triggerCategoryUpload(categoryId, slot.id));
        deleteBtn.addEventListener('click', () => deleteCategorySlot(categoryId, slot.id));
    });
}

// Handle file selection
document.getElementById('hiddenFileInput').addEventListener('change', async (e) => {
    if (!activeUploadCtx || !e.target.files[0]) return;
    const file = e.target.files[0];

    if (file.size > 1_000_000) {
        const status = document.getElementById('status');
        if (status) {
            status.textContent = `⚠️ ภาพขนาด ${(file.size / 1024 / 1024).toFixed(1)} MB อาจใช้พื้นที่ storage มาก`;
            status.className = 'info';
            status.style.display = 'block';
        }
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
        const img = new Image();
        img.onload = async () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1024;
            const MAX_HEIGHT = 1024;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Compress as JPEG with 85% quality to save space
            const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

            const { categoryId, slotId } = activeUploadCtx;
            const slots = await loadCategorySlots(categoryId);

            if (slotId === 'NEW_SLOT') {
                const newId = getNextCategorySlotName(slots, categoryId);
                slots.push({ id: newId, dataUrl: resizedDataUrl });
                await saveCategorySlots(categoryId, slots);
                renderCategorySlots(categoryId, slots);
            } else {
                const idx = slots.findIndex(s => s.id === slotId);
                if (idx !== -1) {
                    slots[idx].dataUrl = resizedDataUrl;
                    await saveCategorySlots(categoryId, slots);
                    renderCategorySlots(categoryId, slots);
                }
            }
            activeUploadCtx = null;
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
});

// ==========================================
// MAIN UI LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const runBtn = document.getElementById('runBotBtn');
    const statusDiv = document.getElementById('status');

    function updateStatus(message, type = 'info') {
        statusDiv.textContent = message;
        statusDiv.className = type;
        statusDiv.style.display = 'block';
    }

    // Load & render saved image slots on startup for all categories
    const categories = ['product', 'face', 'clothes', 'location'];
    for (const cat of categories) {
        const slots = await loadCategorySlots(cat);
        renderCategorySlots(cat, slots);

        // Bind add buttons dynamically
        const btnId = `add${cat.charAt(0).toUpperCase() + cat.slice(1)}SlotBtn`;
        const addBtn = document.getElementById(btnId);
        if (addBtn) {
            addBtn.addEventListener('click', () => addCategorySlot(cat));
        }
    }

    // Populate Pose Select Options if POSE_PRESETS exists
    const poseSelect = document.getElementById('selectPose');
    if (poseSelect && typeof POSE_PRESETS !== 'undefined') {
        POSE_PRESETS.forEach(pose => {
            const opt = document.createElement('option');
            opt.value = pose.value;
            opt.textContent = pose.label;
            poseSelect.appendChild(opt);
        });
    }

    // Mode & Use Model logic
    const mainModeSelect = document.getElementById('mainModeSelect');
    const productSection = document.getElementById('productSection');
    const useModelToggleContainer = document.getElementById('useModelToggleContainer');
    const useModelToggle = document.getElementById('useModelToggle');
    const modelPropertiesWrapper = document.getElementById('modelPropertiesWrapper');

    function updateModeUI() {
        const isCommercial = mainModeSelect && mainModeSelect.value === 'commercial';

        if (isCommercial) {
            productSection.style.display = 'block';
            useModelToggleContainer.style.display = 'flex';

            // Apply Model Properties display based on toggle
            if (!useModelToggle.checked) {
                modelPropertiesWrapper.style.display = 'none';
            } else {
                modelPropertiesWrapper.style.display = 'block';
                modelPropertiesWrapper.style.opacity = '1';
                modelPropertiesWrapper.style.pointerEvents = 'auto';
            }
        } else {
            // Standard Mode
            productSection.style.display = 'none';
            useModelToggleContainer.style.display = 'none';
            modelPropertiesWrapper.style.display = 'block';
            modelPropertiesWrapper.style.opacity = '1';
            modelPropertiesWrapper.style.pointerEvents = 'auto';
        }
    }

    if (mainModeSelect) mainModeSelect.addEventListener('change', updateModeUI);
    if (useModelToggle) useModelToggle.addEventListener('change', updateModeUI);
    // Init UI on load
    updateModeUI();
    // Tab button logic
    document.querySelectorAll('.tab-group').forEach(group => {
        const buttons = group.querySelectorAll('.tab-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    });

    // ==========================================
    // PROMPT BUILDER
    // ==========================================
    async function buildPromptString() {
        const faceElem = document.getElementById('inputSubject');
        const clothesElem = document.getElementById('inputClothes');
        const locationElem = document.getElementById('inputLocation');

        const faceSlots = await loadCategorySlots('face');
        const clothesSlots = await loadCategorySlots('clothes');
        const locationSlots = await loadCategorySlots('location');
        const productSlots = await loadCategorySlots('product');

        let subjectRefs = faceElem ? faceElem.value.trim() : '';
        let clothesRefs = clothesElem ? clothesElem.value.trim() : '';
        let makeup = document.getElementById('selectMakeup')?.value || '';
        let hairstyle = document.getElementById('selectHairstyle')?.value || '';
        let locRefs = locationElem ? locationElem.value.trim() : '';
        let pose = document.getElementById('selectPose')?.value || '';
        let cameraShotSize = document.getElementById('selectShotSize')?.value || '';
        let cameraAngle = document.getElementById('selectCameraAngle')?.value || '';
        let cameraType = document.getElementById('selectCameraType')?.value || '';
        let lens = document.getElementById('selectLens')?.value || '';
        let aperture = document.getElementById('selectAperture')?.value || '';

        // Add Category References (Only enabled)
        const faceRefStrs = faceSlots.filter(s => s.dataUrl && s.enabled !== false).map(s => `อ้างอิงใบหน้าจากภาพ "${s.id}"`).join(', ');
        if (faceRefStrs) subjectRefs = subjectRefs ? `${subjectRefs}, ${faceRefStrs}` : faceRefStrs;

        const clothesRefStrs = clothesSlots.filter(s => s.dataUrl && s.enabled !== false).map(s => `อ้างอิงชุดจากภาพ "${s.id}"`).join(', ');
        if (clothesRefStrs) clothesRefs = clothesRefs ? `${clothesRefs}, ${clothesRefStrs}` : clothesRefStrs;

        const locRefStrs = locationSlots.filter(s => s.dataUrl && s.enabled !== false).map(s => `อ้างอิงสถานที่จากภาพ "${s.id}"`).join(', ');
        if (locRefStrs) locRefs = locRefs ? `${locRefs}, ${locRefStrs}` : locRefStrs;

        const productRefStrs = productSlots.filter(s => s.dataUrl && s.enabled !== false).map(s => {
            const desc = s.desc ? ` (${s.desc})` : '';
            return `อ้างอิงสินค้าจากภาพ "${s.id}"${desc}`;
        }).join(', ');

        const modeVal = document.getElementById('mainModeSelect')?.value || 'standard';
        const isCommercial = modeVal === 'commercial';
        const isModelEnabled = !isCommercial || document.getElementById('useModelToggle')?.checked;
        const hasBodyModifier = document.getElementById('checkBodyModifier')?.checked || false;
        const hasNoText = document.getElementById('checkNoText')?.checked || false;
        const textGraphic = document.getElementById('inputTextGraphic')?.value.trim() || '';
        const productDesc = document.getElementById('inputProductDesc')?.value.trim() || '';
        const productCategory = document.getElementById('selectProductCategory')?.value || '';

        // If Model is disabled (unchecked in Commercial Mode), erase references
        if (!isModelEnabled) {
            subjectRefs = '';
            clothesRefs = '';
            locRefs = '';
            makeup = '';
            hairstyle = '';
        }

        // ใช้ generatePrompt จาก prompts.js
        if (typeof generatePrompt === 'function') {
            return generatePrompt({
                isCommercial,
                mode: modeVal,
                productCategory,
                productDesc,
                textGraphic,
                productRefs: productRefStrs,
                subjectRefs,
                clothesRefs,
                locRefs,
                makeup,
                hairstyle,
                isModelEnabled,
                hasBodyModifier,
                hasNoText,
                pose,
                cameraShotSize,
                cameraAngle,
                cameraType,
                lens,
                aperture
            });
        }

        return '';
    }

    // ==========================================
    // ACTION BUTTONS
    // ==========================================
    const previewBtn = document.getElementById('previewBtn');
    if (previewBtn) {
        previewBtn.addEventListener('click', async () => {
            const faceElem = document.getElementById('inputSubject') || document.getElementById('inputFace');
            if (!faceElem || !faceElem.value.trim()) {
                updateStatus('กรุณากรอกข้อมูล นางแบบ (Subject) ก่อนครับ', 'error');
                return;
            }

            const promptObj = await buildPromptString();
            if (!promptObj || (!promptObj.basePrompt && !promptObj.promptSuffix)) {
                updateStatus('Please enter at least one prompt detail before previewing.', 'error');
                return;
            }
            updateStatus(`[Preview]\n${promptObj.basePrompt}\n${promptObj.promptSuffix}`, 'success');
        });
    }

    const btnAiGenText = document.getElementById('btnAiGenText');
    const inputTextGraphic = document.getElementById('inputTextGraphic');
    if (btnAiGenText && inputTextGraphic) {
        btnAiGenText.addEventListener('click', async () => {
            const productDesc = document.getElementById('inputProductDesc')?.value.trim();
            if (!productDesc) {
                updateStatus('กรุณากรอก "📦 คำสั่งเพิ่มเติม" ก่อนให้ AI ช่วยคิดข้อความครับ', 'error');
                return;
            }

            // check api key
            let apiKey = '';
            const storageData = await new Promise(resolve => chrome.storage.local.get('geminiApiKey', resolve));
            apiKey = storageData.geminiApiKey || '';

            if (!apiKey) {
                apiKey = window.prompt("กรุณาใส่ Gemini API Key (ฟรี) ของคุณเพื่อใช้งานฟีเจอร์นี้:\nรับคีย์ได้ที่: https://aistudio.google.com/app/apikey", "");
                if (apiKey && apiKey.trim() !== '') {
                    await new Promise(resolve => chrome.storage.local.set({ geminiApiKey: apiKey.trim() }, resolve));
                } else {
                    updateStatus('ไม่มี API Key ยกเลิกการสร้างข้อความ', 'error');
                    return;
                }
            }

            const originalText = btnAiGenText.innerHTML;
            btnAiGenText.innerHTML = '⏳ กำลังคิด...';
            btnAiGenText.disabled = true;
            updateStatus('AI กำลังคิดคำโปรยโฆษณาให้คุณ...', 'info');

            try {
                const prompt = `You are an expert copywriter for commercial product advertisements. 
The user is selling a product with the following description/selling points: "${productDesc}"
Generate exactly ONE short, punchy, and highly appealing text phrase (max 3-5 words) that can be overlaid on the product image as a text graphic. 
Examples of good text graphics: "SUMMER SALE 50%", "NEW ARRIVAL", "GLOW INSTANTLY", "PURE ELEGANCE", "LIMITED EDITION".
Respond WITH ONLY THE PHRASE ITSELF. DO NOT include quotation marks, explanations, or any other text.`;

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 20
                        }
                    })
                });

                if (!response.ok) {
                    if (response.status === 400) throw new Error("API Key อาจจะไม่ถูกต้อง หรือ API Format มีปัญหา");
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                let generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                generatedText = generatedText.replace(/['"]+/g, '').trim();

                if (generatedText) {
                    inputTextGraphic.value = generatedText;
                    updateStatus('✅ AI สร้างข้อความสำเร็จ!', 'success');
                } else {
                    updateStatus('❌ AI ไม่ยอมตอบกลับเป็นข้อความ', 'error');
                }
            } catch (err) {
                if (err.message.includes('API Key')) {
                    // Clear faulty API key
                    chrome.storage.local.remove('geminiApiKey');
                }
                updateStatus(`เกิดข้อผิดพลาดในการเรียก AI: ${err.message}`, 'error');
            } finally {
                btnAiGenText.innerHTML = originalText;
                btnAiGenText.disabled = false;
            }
        });
    }

    let isBatchRunning = false;
    const btnStopBatch = document.getElementById('btnStopBatch');
    const inputBatchCount = document.getElementById('inputBatchCount');

    if (btnStopBatch) {
        btnStopBatch.addEventListener('click', () => {
            isBatchRunning = false;
            updateStatus('กำลังหยุดการสร้าง Batch...', 'info');
        });
    }

    runBtn.addEventListener('click', async () => {
        if (isBatchRunning) return;

        const batchCount = parseInt(inputBatchCount?.value) || 1;
        isBatchRunning = true;
        runBtn.disabled = true;
        if (btnStopBatch && batchCount > 1) btnStopBatch.style.display = 'block';

        updateStatus(`เริ่มรอบการสร้าง (Batch: ${batchCount} ครั้ง)`, 'info');

        const faceElem = document.getElementById('inputSubject') || document.getElementById('inputFace');
        if (!faceElem || !faceElem.value.trim()) {
            updateStatus('กรุณากรอกข้อมูล นางแบบ (Subject) ก่อนครับ', 'error');
            runBtn.disabled = false;
            isBatchRunning = false;
            if (btnStopBatch) btnStopBatch.style.display = 'none';
            return;
        }

        // Collect images based on Mode
        let imagesToPaste = [];
        let activeCategories = [];

        const modeVal = document.getElementById('mainModeSelect')?.value || 'standard';
        const isCommercial = modeVal === 'commercial';
        const isModelEnabled = !isCommercial || document.getElementById('useModelToggle')?.checked;

        if (isCommercial) {
            activeCategories.push('product');
        }

        if (isModelEnabled) {
            activeCategories.push('face', 'clothes', 'location');
        }

        for (const cat of activeCategories) {
            const slots = await loadCategorySlots(cat);
            slots.forEach(slot => {
                if (slot.dataUrl && slot.enabled !== false) {
                    imagesToPaste.push({ id: slot.id, dataUrl: slot.dataUrl });
                }
            });
        }

        const promptObj = await buildPromptString();

        if (!promptObj || (!promptObj.basePrompt && !promptObj.promptSuffix)) {
            updateStatus('Please enter at least one prompt detail before generating.', 'error');
            runBtn.disabled = false;
            return;
        }

        try {
            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                updateStatus('Cannot find active tab.', 'error');
                runBtn.disabled = false;
                isBatchRunning = false;
                if (btnStopBatch) btnStopBatch.style.display = 'none';
                return;
            }

            if (!tab.url.includes('labs.google/fx/') || !tab.url.includes('tools/flow')) {
                updateStatus('Please navigate to a labs.google Flow page first.', 'error');
                runBtn.disabled = false;
                isBatchRunning = false;
                if (btnStopBatch) btnStopBatch.style.display = 'none';
                return;
            }

            for (let i = 1; i <= batchCount; i++) {
                if (!isBatchRunning) {
                    updateStatus('⚠️ หยุดการทำงาน Batch แล้วตามคำสั่ง', 'info');
                    break;
                }

                updateStatus(`[Batch ${i}/${batchCount}] กำลังรันสคริปต์อัตโนมัติ...`, 'info');

                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: runAutomationInPage,
                    args: [promptObj, imagesToPaste]
                });

                if (results && results[0]) {
                    const { success, message, details } = results[0].result;
                    if (success) {
                        updateStatus(`✅ [Batch ${i}/${batchCount}] ${message}\n\n${details || ''}`, 'success');
                    } else {
                        updateStatus(`ℹ️ [Batch ${i}/${batchCount}] ${message}\n\n${details}`, 'info');
                        break; // Stop batch on failure
                    }
                }

                if (i < batchCount && isBatchRunning) {
                    updateStatus(`[Batch ${i}/${batchCount}] รอระบบสร้างภาพให้เสร็จก่อนเริ่มรอบต่อไป...`, 'info');
                    // Wait for generation status to clear from the page
                    const waitResult = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: waitForGenerationToFinish
                    });

                    if (waitResult && waitResult[0] && waitResult[0].result === false) {
                        updateStatus(`[Batch ${i}/${batchCount}] หมดเวลารอการประมวลผล (Timeout)! ข้ามไปรอบถัดไปช้าๆ...`, 'error');
                        await new Promise(r => setTimeout(r, 5000));
                    }
                }
            }

            if (isBatchRunning) {
                updateStatus(`🎉 สร้างครบ ${batchCount} รอบ สำเร็จเรียบร้อย!`, 'success');
            }

        } catch (error) {
            updateStatus(`Extension Error: ${error.message}`, 'error');
        } finally {
            runBtn.disabled = false;
            isBatchRunning = false;
            if (btnStopBatch) btnStopBatch.style.display = 'none';
        }
    });
});

async function waitForGenerationToFinish() {
    return new Promise(resolve => {
        let attempts = 0;
        const maxAttempts = 120; // 120 * 1 วินาที = 2 นาที Timeout

        const checkStatus = setInterval(() => {
            attempts++;

            // ตรวจหาปุ่มที่มีคำว่า Cancel (แสดงว่ากำลังสร้างอยู่) หรือไอคอน stop
            const isGenerating = Array.from(document.querySelectorAll('button')).some(b => {
                const text = b.textContent.trim().toLowerCase();
                return text === 'cancel' || text.includes('ยกเลิก') || b.querySelector('i.google-symbols')?.textContent.trim() === 'stop';
            });

            // รอจนกว่าจะไม่เหลือปุ่ม Cancel (แปลว่าสร้างเสร็จแล้วหรือหน้ากลับมาปกติ)
            if (!isGenerating && attempts > 3) { // รอให้สถานะ cancel ปรากฎหลอกๆ ผ่านไปก่อน
                clearInterval(checkStatus);
                resolve(true);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkStatus);
                resolve(false); // Timeout
            }
        }, 1000);
    });
}

// ==========================================
// THIS FUNCTION RUNS INSIDE THE WEB PAGE Context (Slate.js keyboard simulation)
// ==========================================
async function runAutomationInPage(promptObj, imagesToPaste = []) {
    let logMessages = [];
    const log = (msg) => {
        logMessages.push(msg);
    };

    const basePrompt = promptObj.basePrompt || '';
    const promptSuffix = promptObj.promptSuffix || '';

    log(`Started in-page automation. Base Prompt length: ${basePrompt.length}, Suffix length: ${promptSuffix.length}`);
    if (imagesToPaste.length > 0) {
        log(`พบภาพอ้างอิงจำนวน ${imagesToPaste.length} ภาพสำหรับการส่ง...`);
    }

    // นับรูปที่มีอยู่บนหน้าจอก่อนจะเริ่มอัปโหลด (รวม history) เพื่อหาค่า Baseline
    const initialImagesCount = document.querySelectorAll('img[alt="สื่อที่คุณสร้างหรืออัปโหลดไว้ ซึ่งอยู่ในคอลเล็กชัน"]').length;

    // --- Helper: จำลองการกดแป้นพิมพ์ 1 ตัวอักษร แบบที่ Slate.js รับรู้ได้ ---
    function simulateKey(element, char) {
        const keyCode = char.charCodeAt(0);

        element.dispatchEvent(new KeyboardEvent('keydown', {
            key: char, code: `Key${char.toUpperCase()}`,
            keyCode, which: keyCode,
            bubbles: true, cancelable: true, composed: true
        }));

        element.dispatchEvent(new InputEvent('beforeinput', {
            inputType: 'insertText',
            data: char,
            bubbles: true, cancelable: true, composed: true
        }));

        element.dispatchEvent(new InputEvent('input', {
            inputType: 'insertText',
            data: char,
            bubbles: true, cancelable: true, composed: true
        }));

        element.dispatchEvent(new KeyboardEvent('keyup', {
            key: char, code: `Key${char.toUpperCase()}`,
            keyCode, which: keyCode,
            bubbles: true, cancelable: true, composed: true
        }));
    }

    async function typeText(element, text, delayMs = 30) {
        for (const char of text) {
            simulateKey(element, char);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    // Helper: Convert base64 data URL to a File object
    function dataURLtoFile(dataurl, filename) {
        var arr = dataurl.split(','),
            mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[arr.length - 1]),
            n = bstr.length,
            u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    }

    try {
        const inputBox = document.querySelector('[data-slate-editor="true"][contenteditable="true"]');

        if (!inputBox) {
            return { success: false, message: 'หาช่องพิมพ์ข้อความ (Prompt Box) ไม่เจอครับ', details: logMessages.join('\n') };
        }

        log('เจอช่องพิมพ์ข้อความแล้ว กำลังล้างของเดิมและเริ่มพิมพ์ใหม่...');

        // วางภาพที่แนบมาลงในช่อง Prompt
        if (imagesToPaste && imagesToPaste.length > 0) {
            log(`กำลังประมวลผลการดึงรูปภาพ ${imagesToPaste.length} รูป...`);

            for (let imgIdx = 0; imgIdx < imagesToPaste.length; imgIdx++) {
                const img = imagesToPaste[imgIdx];
                const extension = img.dataUrl.substring(img.dataUrl.indexOf('/') + 1, img.dataUrl.indexOf(';base64'));
                const filename = `${img.id}.${extension}`;
                let foundInLibrary = false;

                log(`\n📷 ภาพ ${imgIdx + 1}/${imagesToPaste.length}: "${filename}"`);

                // ขั้นตอน 1: กดปุ่ม + เพื่อเปิดคลังรูปภาพ (กดทุกครั้งสำหรับทุกภาพ)
                log('  ขั้นตอน 1: กดปุ่ม + เพื่อเปิดคลังรูปภาพ...');
                let addBtn = document.querySelector('div.sc-21faa80e-2 > button');
                if (!addBtn) addBtn = document.querySelector('button span')?.closest('button');

                if (addBtn) {
                    addBtn.click();
                    log('  คลิกปุ่ม + แล้ว กำลังรอ popup...');
                    await new Promise(resolve => setTimeout(resolve, 1200));
                } else {
                    log('  ❌ หาปุ่ม + ไม่เจอ! จะข้ามไปใช้วิธี Paste แทน');
                }

                // ขั้นตอน 2: ค้นหาภาพ
                log(`  ขั้นตอน 2: ค้นหาภาพ "${filename}" ในคลัง...`);
                let matchedImg = null;
                let libraryAttempts = 0;

                while (libraryAttempts < 20 && !matchedImg) {
                    matchedImg = document.querySelector(`img[alt="${filename}"]`);
                    if (!matchedImg) {
                        if (libraryAttempts % 5 === 0) {
                            log(`    รอ popup โหลดรายการ... (${libraryAttempts}/20)`);
                        }
                        await new Promise(resolve => setTimeout(resolve, 300));
                        libraryAttempts++;
                    }
                }

                if (matchedImg) {
                    log(`  ✅ เจอภาพ "${filename}" ในคลัง!`);

                    // วาดกรอบสีแดงรอบ container
                    const mediaContainer = document.querySelector('div.sc-dbfb6b4a-2');
                    if (mediaContainer) {
                        mediaContainer.style.outline = '3px dashed red';
                        mediaContainer.style.outlineOffset = '-3px';
                    }
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // วาดกรอบเขียวรอบ div ที่ห่อรูปและชื่อไฟล์
                    const innerDiv = matchedImg.parentElement;
                    innerDiv.style.outline = '3px solid lime';
                    innerDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // คลิก
                    log('  กำลังคลิกเลือกภาพ...');
                    innerDiv.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
                    foundInLibrary = true;

                    // ลบกรอบออก
                    innerDiv.style.outline = '';
                    if (mediaContainer) mediaContainer.style.outline = '';

                    await new Promise(resolve => setTimeout(resolve, 800));
                    log(`  ✅ เลือกภาพ "${filename}" เรียบร้อย`);
                } else {
                    log(`  ❌ ไม่พบภาพ "${filename}" ใน popup`);
                }

                // 3. Fallback: ถ้าหาภาพในคลังไม่เจอ ใช้วิธี Paste วางเหมือนเดิม
                if (!foundInLibrary) {
                    log(`ไม่พบภาพ "${filename}" ในคลัง (หรือโหลดไม่ขึ้น), ใช้วิธีแนบ Paste จากคอมพิวเตอร์...`);

                    const file = dataURLtoFile(img.dataUrl, filename);
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);

                    const pasteEvent = new ClipboardEvent('paste', {
                        clipboardData: dataTransfer,
                        bubbles: true,
                        cancelable: true,
                        composed: true
                    });

                    // ต้องให้โฟกัสรอดจากกล่อง popup ก่อนเพื่อพิมพ์ Paste ได้ถูกที่
                    inputBox.focus();
                    inputBox.dispatchEvent(pasteEvent);
                    await new Promise(resolve => setTimeout(resolve, 1500)); // wait after pasting
                }
            }

            // 4. ปิดหน้าต่าง Popup หากมันยังเปิดค้างอยู่
            log('กดยกเลิก/ปิดหน้าต่างสถานะ Media Library...');
            document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true, composed: true }));
            await new Promise(resolve => setTimeout(resolve, 500));

            log('รวมภาพเข้าช่องคำสั่งเสร็จสิ้น กำลังรอให้รูประบบอัปโหลดประมวลผลให้สมบูรณ์...');

            // รอภาพทุกอย่างอัปโหลดเต็มที่
            let attempts = 0;
            const maxAttempts = 60; // 60 * 500ms = 30 วิ (เพิ่มเวลารอ)
            let allImagesLoaded = false;

            while (attempts < maxAttempts && !allImagesLoaded) {
                await new Promise(resolve => setTimeout(resolve, 500));

                // นับจำนวนภาพใหม่ที่เพิ่มเข้ามา หักลบจากรูปใน history
                const currentImagesCount = document.querySelectorAll('img[alt="สื่อที่คุณสร้างหรืออัปโหลดไว้ ซึ่งอยู่ในคอลเล็กชัน"]').length;
                const newAddedImages = currentImagesCount - initialImagesCount;

                if (newAddedImages >= imagesToPaste.length) {
                    allImagesLoaded = true;
                    log(`✅ ตรวจพบรูปถูกแนบครบทุกรูปแล้ว (${newAddedImages}/${imagesToPaste.length}) การประมวลผลรูปลงระบบเสร็จสมบูรณ์`);
                } else {
                    log(`⏳ กำลังรอรูประบบโหลดให้เสร็จ... โผล่มาแล้ว ${Math.max(0, newAddedImages)}/${imagesToPaste.length} รูป (ครั้งที่ ${attempts + 1}/${maxAttempts})`);
                }
                attempts++;
            }

            if (!allImagesLoaded) {
                log('⚠️ คำเตือน: อัปโหลดภาพอาจจะไม่ครบตามจำนวนระบบ หรือหน้าเว็บโหลดช้า แต่จะไปต่อเพื่อพยายาม Generate');
            }
            await new Promise(resolve => setTimeout(resolve, 1500)); // buffer เผื่อ UI กระตุก
        }

        inputBox.focus();
        await new Promise(resolve => setTimeout(resolve, 200));

        // ล้างข้อความเดิม
        inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true, composed: true }));
        await new Promise(resolve => setTimeout(resolve, 100));
        inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', code: 'Delete', bubbles: true, cancelable: true, composed: true }));
        inputBox.dispatchEvent(new InputEvent('beforeinput', { inputType: 'deleteContentBackward', bubbles: true, cancelable: true, composed: true }));
        inputBox.dispatchEvent(new InputEvent('input', { inputType: 'deleteContentBackward', bubbles: true, cancelable: true, composed: true }));
        await new Promise(resolve => setTimeout(resolve, 300));

        const fullPrompt = basePrompt + (promptSuffix ? '\n' + promptSuffix : '');

        if (fullPrompt.trim() !== '') {
            log(`กำลังพิมพ์ข้อความทั้งหมดด้วยระบบจำลองการพิมพ์: "${fullPrompt}" ...`);
            await typeText(inputBox, fullPrompt, 5);
            log('พิมพ์ข้อความเสร็จแล้ว!');
        }

        await new Promise(resolve => setTimeout(resolve, 800));

        // หาปุ่ม Generate
        let generateBtn = null;

        const icons = Array.from(document.querySelectorAll('i.google-symbols'));
        const targetIcon = icons.find(icon => icon.textContent.trim() === 'arrow_forward');

        if (targetIcon) {
            generateBtn = targetIcon.closest('button');
            log('ระบุปุ่มได้จากการมองหาไอคอน arrow_forward');
        } else {
            const allButtons = Array.from(document.querySelectorAll('button'));
            generateBtn = allButtons.find(b => {
                const text = b.textContent.trim();
                return text === 'สร้าง' || text === 'Create' || text === 'Generate' || text.includes('สร้าง');
            });
            if (generateBtn) log('ระบุปุ่มด้วยการหาจากข้อความอักษร Fallback');
        }

        if (generateBtn) {
            log('เจอปุ่ม Generate แล้ว กำลังตีกรอบสีฟ้าให้ดู...');

            const originalBorder = generateBtn.style.border;
            generateBtn.style.border = '4px solid #3b82f6';
            await new Promise(resolve => setTimeout(resolve, 1500));
            generateBtn.style.border = originalBorder;

            generateBtn.click();
            log('คลิกปุ่ม Generate ไปเรียบร้อย!');

            return { success: true, message: `ทำการส่งคำสั่งสำเร็จ!` };
        } else {
            return { success: false, message: 'หาปุ่ม Generate (กดส่งคำสั่ง) ไม่เจอครับ', details: logMessages.join('\n') };
        }

    } catch (error) {
        log(`Error: ${error.message}`);
        return { success: false, message: 'เกิดข้อผิดพลาดในการรันสคริปต์บนหน้าเว็บ', details: logMessages.join('\n') };
    }
}
