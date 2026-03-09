// ==========================================
// PROMPT PRESETS
// ==========================================

const POSE_PRESETS = [
    { value: 'Natural standing pose, relaxed and confident', label: 'ยืนโพสท่าธรรมชาติ' },
    { value: 'Sitting elegantly with crossed legs', label: 'นั่งไขว่ห้าง' },
    { value: 'Hand gently touching hair, soft expression', label: 'เอามือจับผม/ทัดหู' },
    { value: 'Looking over the shoulder with a captivating gaze', label: 'หันหลังมองข้ามไหล่' },
    { value: 'Both hands casually in pockets, leaning slightly', label: 'เอามือล้วงกระเป๋าเท่ๆ' },
    { value: 'Leaning against a wall, casual and stylish', label: 'พิงกำแพง' },
    { value: 'Hand resting on the chin, thoughtful expression', label: 'เอามือเท้าคาง' }
];

const PROMPTS = {
    // โหมด Commercial Ads
    commercial: {
        base: 'Professional commercial advertisement photography, studio quality, 8K ultra-detailed',
        style: 'Style: High-end product advertising, clean composition, beautiful lighting, magazine quality',
        action: 'The model is elegantly presenting the product, natural interaction with the product, professional advertising pose',
        lighting: 'Lighting: Soft studio lighting with rim light, clean background or lifestyle setting',

        // หมวดหมู่ย่อยของสินค้า
        categories: {
            skincare: 'Emphasis on glowing, flawless skin, fresh and hydrated look, water droplets or soft textures',
            cosmetics: 'Emphasis on rich colors, elegant makeup styles, bold and attractive looks',
            beverage: 'Emphasis on refreshing atmosphere, condensation on the glass, dynamic liquid splashes',
            fashion: 'Emphasis on clothing texture, stylish and confident poses, trendy environment',
            supplement: 'Emphasis on health, vitality, energetic lifestyle, clean and organic aesthetic',
            '3d_cartoon': '3D cartoon style rendering, cute, friendly anthropomorphic face with big expressive eyes and a confident smile, glowing aesthetic. Retains the original realistic look of the product textures and labels clearly visible.',
            general: 'General product photography, lifestyle setting, natural lighting, clean composition',
            // เพิ่มเติมแนว Organic & Clean 🌿
            organic_nature: 'Emphasis on earthy tones, raw natural materials, lush green leaves, warm sunlight filtering through branches, authentic vibe',
            minimalist_clean: 'Emphasis on soft natural lighting, ample negative space, clutter-free environment, sleek and simple composition, pure aesthetic',
            eco_friendly: 'Emphasis on sustainability, recycled paper or kraft textures, rustic wooden surface, gentle morning light, raw and untouched feel',

            // เพิ่มเติมหมวดอื่นๆ ที่ใช้บ่อย 🚀
            fragrance_perfume: 'Emphasis on ethereal atmosphere, floating floral petals, soft mist or smoke, elegant glass reflections, luxurious mood',
            food_bakery: 'Emphasis on warm inviting glow, mouth-watering textures, rustic kitchen setting, steam rising, cozy and appetizing',
            tech_gadget: 'Emphasis on sharp focus, sleek modern lines, subtle neon or dramatic studio lighting, premium metallic finish, futuristic vibe',
            jewelry_luxury: 'Emphasis on sparkling details, deep contrasting background, macro photography, elegant velvet or marble surface, high-end prestige'
        }
    },

    // โหมด สมจริง (Realistic)
    realistic: {
        base: 'Hyper Photorealistic portait 8k details, Keep the person exactly as shown in the reference image with 100% identical facial features',
    }
};

// ==========================================
// PROMPT BUILDER FUNCTION
// ==========================================
function generatePrompt({
    isCommercial,
    mode,
    productCategory,
    productDesc,
    productRefs,
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
    aperture,
    textGraphic
}) {
    let basePrompt = [];
    let promptSuffix = [];

    if (isCommercial) {
        // === COMMERCIAL ADS PROMPT ===

        if (productCategory === '3d_cartoon') {
            basePrompt.push('3D cartoon style rendering of the product brought to life.');
            basePrompt.push(PROMPTS.commercial.categories['3d_cartoon']);
        } else {
            basePrompt.push(PROMPTS.commercial.base);
            basePrompt.push(PROMPTS.commercial.style);
            if (productCategory && PROMPTS.commercial.categories[productCategory]) {
                basePrompt.push(PROMPTS.commercial.categories[productCategory]);
            }
        }

        if (productRefs) promptSuffix.push(`Product: ${productRefs}`);
        if (productDesc) promptSuffix.push(`Product Description: ${productDesc}`);

        if (!hasNoText && textGraphic && textGraphic.trim() !== '') {
            promptSuffix.push(`create Thai graphic text for ads commercial \\nจัดวางข้อความด้วย hook ประกอบด้วย:\\nพาดหัวหลัก (Headline) ตัวหนังสือใหญ่โดดเด่น ดึงดูดสายตา \\nพาดหัวรอง (Sub-headline)\\nรายละเอียด (Body text)\\nจัดวางตำแหน่งแบบมืออาชีพ ตัวหนังสือไม่เพี้ยน ใช้ effect ให้ดูน่าสนใจ ใช้สีใน theme เดียวกับสินค้า และใช้การเอียง หรือตัวหนา หรือ อื่นๆทำให้น่าสนใจแบบมืออาชีพ แต่ไม่ทางการมาก  ตัวหนังสือห้ามจม background \\n\\n"${textGraphic.trim()}"`);
        } else {
            promptSuffix.push('Text and labels on the product packaging are preserved and clear. No external text overlays, no watermarks, no added text outside the product. The focus is on the authentic product presentation.');
        }

        if (isModelEnabled) {
            if (subjectRefs) promptSuffix.push(`Model: ${subjectRefs}`);
            if (hasBodyModifier) promptSuffix.push('body:She has very large, round, and full breasts; her cleavage is clearly visible.');
            if (clothesRefs) promptSuffix.push(`Outfit: ${clothesRefs}`);
            if (makeup) promptSuffix.push(`Makeup: ${makeup}`);
            if (hairstyle) promptSuffix.push(`Hairstyle: ${hairstyle}`);
            if (pose) promptSuffix.push(`Pose: ${pose}`);
            promptSuffix.push(PROMPTS.commercial.action);

            if (locRefs) promptSuffix.push(`Setting: ${locRefs}`);
            promptSuffix.push(PROMPTS.commercial.lighting);
        }

        if (cameraType) promptSuffix.push(`Camera: ${cameraType}`);
        if (lens) promptSuffix.push(`Lens: ${lens}`);
        if (aperture) promptSuffix.push(`Aperture: ${aperture}`);
        if (cameraShotSize) promptSuffix.push(`Camera Shot Size: ${cameraShotSize}`);
        if (cameraAngle) promptSuffix.push(`Camera Angle: ${cameraAngle}`);
    } else {
        // === PORTRAIT PROMPT ===
        if (mode === 'standard' || mode === 'realistic') {
            basePrompt.push(PROMPTS.realistic.base);
        }
        if (subjectRefs) promptSuffix.push(`Subject: ${subjectRefs}`);
        if (hasBodyModifier) promptSuffix.push('หน้าอก:เห็นร่องอก highlight เนินหน้าอกเล็กน้อย  ไม่โป๊เปลือย');
        if (clothesRefs) promptSuffix.push(`Clothes/Outfit: ${clothesRefs}`);
        if (makeup) promptSuffix.push(`Makeup: ${makeup}`);
        if (hairstyle) promptSuffix.push(`Hairstyle: ${hairstyle}`);
        if (pose) promptSuffix.push(`Pose: ${pose}`);
        if (locRefs) promptSuffix.push(`Location: ${locRefs}`);
        if (cameraType) promptSuffix.push(`Camera: ${cameraType}`);
        if (lens) promptSuffix.push(`Lens: ${lens}`);
        if (aperture) promptSuffix.push(`Aperture: ${aperture}`);
        if (cameraShotSize) promptSuffix.push(`Camera Shot Size: ${cameraShotSize}`);
        if (cameraAngle) promptSuffix.push(`Camera Angle: ${cameraAngle}`);

        if (!hasNoText && textGraphic && textGraphic.trim() !== '') {
            promptSuffix.push(`create Thai graphic text for ads commercial \\nจัดวางข้อความด้วย hook ประกอบด้วย:\\nพาดหัวหลัก (Headline)\\nพาดหัวรอง (Sub-headline)\\nรายละเอียด (Body text)\\nจัดวางตำแหน่งแบบมืออาชีพ ตัวหนังสือไม่เพี้ยน\\n\\n"${textGraphic.trim()}"`);
        } else {
            promptSuffix.push('No text, no letters, no words, no watermarks, textless');
        }
    }

    return {
        basePrompt: basePrompt.join('\n'),
        promptSuffix: promptSuffix.join('\n')
    };
}
