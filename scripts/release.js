import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Supabase project URL and service role key
const SUPABASE_URL = 'https://wszyjsirtuwoxfqsrbiq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzenlqc2lydHV3b3hmcXNyYmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk5OTMyMSwiZXhwIjoyMTAyNTc1MzIxfQ.iJ-wtSLR80LuHFohZVxMwnziVB23mf9pZTqD3TZOp6o';
const BUCKET = 'app-updates';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 0. Automatic Version Resolution & Synchronization across package.json, tauri.conf.json, and Cargo.toml
const pkgPath = 'package.json';
const tauriConfPath = 'src-tauri/tauri.conf.json';
const cargoTomlPath = 'src-tauri/Cargo.toml';

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
let targetVersion = pkg.version;

// Check if a version bump or target version argument was passed (e.g., node scripts/release.js patch / 0.3.0)
const arg = process.argv[2];
if (arg) {
    if (['patch', 'minor', 'major'].includes(arg)) {
        const parts = targetVersion.split('.').map(Number);
        if (arg === 'patch') parts[2] = (parts[2] || 0) + 1;
        if (arg === 'minor') { parts[1] = (parts[1] || 0) + 1; parts[2] = 0; }
        if (arg === 'major') { parts[0] = (parts[0] || 0) + 1; parts[1] = 0; parts[2] = 0; }
        targetVersion = parts.join('.');
    } else if (/^\d+\.\d+\.\d+/.test(arg)) {
        targetVersion = arg;
    }
}

// 1. Sync package.json
pkg.version = targetVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// 2. Sync src-tauri/tauri.conf.json
if (fs.existsSync(tauriConfPath)) {
    const tauriConfig = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
    tauriConfig.version = targetVersion;
    fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConfig, null, 2) + '\n');
}

// 3. Sync src-tauri/Cargo.toml
if (fs.existsSync(cargoTomlPath)) {
    let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
    cargoToml = cargoToml.replace(/^version\s*=\s*"[^"]+"/m, `version = "${targetVersion}"`);
    fs.writeFileSync(cargoTomlPath, cargoToml);
}

console.log(`🚀 Preparing release for version v${targetVersion}... (Synced across package.json, tauri.conf.json, Cargo.toml)`);

// Load private key directly from file
const keyFilePath = path.resolve('src-tauri/tauri.key');
if (!fs.existsSync(keyFilePath)) {
    console.error(`Error: Could not find private key at ${keyFilePath}`);
    process.exit(1);
}
const privateKey = fs.readFileSync(keyFilePath, 'utf8').trim();

const nsisDir = path.join('src-tauri', 'target', 'release', 'bundle', 'nsis');

// 4. Build the Tauri desktop app with signing key injected
console.log(`📦 Building version ${targetVersion}...`);
execSync('npx tauri build', {
    stdio: 'inherit',
    env: {
        ...process.env,
        TAURI_SIGNING_PRIVATE_KEY: privateKey,
        TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ''
    }
});

// 5. Locate generated binary and signature (.nsis.zip or .exe)
const nsisFiles = fs.readdirSync(nsisDir);
const sigFile = nsisFiles.find(f => f.includes(targetVersion) && f.endsWith('.sig'));

if (!sigFile) {
    console.error(`Error: No .sig signature file found for version ${targetVersion} in ${nsisDir}`);
    process.exit(1);
}

const binaryFile = sigFile.replace(/\.sig$/, '');
const binaryPath = path.join(nsisDir, binaryFile);
const sigPath = path.join(nsisDir, sigFile);

if (!fs.existsSync(binaryPath)) {
    console.error(`Error: Binary file ${binaryPath} does not exist`);
    process.exit(1);
}

// 6. Read signature
const signature = fs.readFileSync(sigPath, 'utf8').trim();

// 7. Upload binary asset to Supabase Storage
console.log(`📤 Uploading ${binaryFile} to Supabase storage...`);
const binaryBuffer = fs.readFileSync(binaryPath);
const contentType = binaryFile.endsWith('.zip') ? 'application/zip' : 'application/x-msdownload';

const { error: uploadError } = await supabase.storage.from(BUCKET).upload(binaryFile, binaryBuffer, {
    upsert: true,
    contentType: contentType,
    cacheControl: '0'
});

if (uploadError) {
    console.error('Failed to upload update bundle:', uploadError.message);
    process.exit(1);
}

// Upload public logo asset for Discord Rich Presence
if (fs.existsSync('public/logos/logo_obsidian.png')) {
    const logoBuf = fs.readFileSync('public/logos/logo_obsidian.png');
    await supabase.storage.from(BUCKET).upload('aighto_logo.png', logoBuf, {
        upsert: true,
        contentType: 'image/png',
        cacheControl: '0'
    });
}

// 8. Generate & Upload latest.json metadata for Tauri Updater
const latestJson = {
    version: targetVersion,
    notes: `Release v${targetVersion}`,
    pub_date: new Date().toISOString(),
    platforms: {
        'windows-x86_64': {
            signature: signature,
            url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(binaryFile)}`
        }
    }
};

console.log('🔄 Updating latest.json in Supabase...');
const jsonBuffer = Buffer.from(JSON.stringify(latestJson, null, 2), 'utf-8');

const { error: jsonError } = await supabase.storage.from(BUCKET).upload('latest.json', jsonBuffer, {
    upsert: true,
    contentType: 'application/json',
    cacheControl: '0'
});

if (jsonError) {
    console.error('Failed to upload latest.json:', jsonError.message);
    process.exit(1);
}

// Update local latest.json file for reference
fs.writeFileSync('latest.json', JSON.stringify(latestJson, null, 2) + '\n');

console.log(`\n✨ Version ${targetVersion} published successfully to Supabase!`);