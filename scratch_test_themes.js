import { chromium } from 'playwright';

async function captureThemesPreview() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

    await page.goto('http://[::1]:5174', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    if ((await page.locator('input[type="email"]').count()) > 0) {
        await page.fill('input[type="email"]', 'visual_test@aighto.network');
        await page.fill('input[type="password"]', 'Password123!');
        await page.click('button[type="submit"]');
    }

    await page.waitForSelector('aside', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const musicButton = page.locator('button[title*="Open Music Player"], button[title*="Music:"]').first();
    await musicButton.click();
    await page.waitForTimeout(500);

    const maximizeBtn = page.locator('button[title*="Open 2000s Retrowave Fullscreen Stage"]').first();
    await maximizeBtn.click();
    await page.waitForTimeout(1000);

    const themeBtn = page.locator('button[title*="Cycle Palette Theme"]').first();

    // 1. Neon default
    await page.screenshot({ path: 'C:/Users/ina19/.gemini/antigravity-ide/brain/51419774-8d91-46d8-84d2-f92696adb3a2/stage_theme_neon.png' });

    // 2. Click once -> Sunset
    await themeBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'C:/Users/ina19/.gemini/antigravity-ide/brain/51419774-8d91-46d8-84d2-f92696adb3a2/stage_theme_sunset.png' });

    // 3. Click twice -> Matrix
    await themeBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'C:/Users/ina19/.gemini/antigravity-ide/brain/51419774-8d91-46d8-84d2-f92696adb3a2/stage_theme_matrix.png' });

    console.log('Themes preview screenshots captured successfully.');
    await browser.close();
}

captureThemesPreview().catch(console.error);
