const fs = require('fs');
const path = require('path');
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  sharp = null;
}

const ASSETS_DIR = path.join(__dirname, 'assets');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

async function main() {
  console.log('--- FASO EXPRESS MOBILE ASSETS GENERATOR ---');
  if (!sharp) {
    console.warn('Warning: "sharp" is not installed. Asset generation skipped.');
    return;
  }
  console.log('Generating authentic, branded assets using the web application logo...');

  const candidates = ['LOGOFASO.png', 'logofaso.png', 'logo-faso.jpg', 'favicon.png'];
  let logoSource = null;

  for (const file of candidates) {
    const fullPath = path.join(PUBLIC_DIR, file);
    if (fs.existsSync(fullPath)) {
      logoSource = fullPath;
      break;
    }
  }

  if (!logoSource) {
    console.error('Error: No source logo found in public directory.');
    process.exit(1);
  }

  console.log(`Using source logo: ${logoSource}`);

  try {
    // 1. Generate icon.png (1024x1024)
    console.log('Generating assets/icon.png (1024x1024)...');
    await sharp(logoSource)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(ASSETS_DIR, 'icon.png'));
    console.log('✅ assets/icon.png generated successfully.');

    // 2. Generate logo.png (1024x1024)
    console.log('Generating assets/logo.png (1024x1024)...');
    await sharp(logoSource)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(ASSETS_DIR, 'logo.png'));
    console.log('✅ assets/logo.png generated successfully.');

    // 3. Generate splash.png (2732x2732) with centered brand logo on a solid white background
    console.log('Generating assets/splash.png (2732x2732)...');
    
    const splashLogoBuffer = await sharp(logoSource)
      .resize(1000, 1000, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toBuffer();

    await sharp({
      create: {
        width: 2732,
        height: 2732,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([{
      input: splashLogoBuffer,
      top: 866, // (2732 - 1000) / 2
      left: 866
    }])
    .png()
    .toFile(path.join(ASSETS_DIR, 'splash.png'));
    console.log('✅ assets/splash.png generated successfully.');

    // 4. Generate splash.jpg (2732x2732)
    console.log('Generating assets/splash.jpg (2732x2732)...');
    await sharp({
      create: {
        width: 2732,
        height: 2732,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .composite([{
      input: splashLogoBuffer,
      top: 866,
      left: 866
    }])
    .jpeg({ quality: 95 })
    .toFile(path.join(ASSETS_DIR, 'splash.jpg'));
    console.log('✅ assets/splash.jpg generated successfully.');

    console.log('\n✨ All mobile assets have been successfully prepared with your official Faso Express branding!');
  } catch (error) {
    console.error('❌ Error generating assets:', error);
    process.exit(1);
  }
}

main();

