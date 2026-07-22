const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS_DIR = path.join(__dirname, 'assets');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

async function main() {
  console.log('--- FASO EXPRESS MOBILE ASSETS GENERATOR ---');
  console.log('Generating authentic, branded assets using the web application logo...');

  let logoSource = path.join(PUBLIC_DIR, 'logofaso.png');

  if (!fs.existsSync(logoSource)) {
    console.warn(`Warning: logofaso.png not found at ${logoSource}, checking fallback...`);
    logoSource = path.join(PUBLIC_DIR, 'logo-faso.jpg');
    if (!fs.existsSync(logoSource)) {
      console.error('Error: No source logo found in public directory.');
      process.exit(1);
    }
  }

  try {
    // 1. Generate icon.png (1024x1024) directly from the branded logo
    console.log('Generating assets/icon.png (1024x1024)...');
    await sharp(logoSource)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFile(path.join(ASSETS_DIR, 'icon.png'));
    console.log('✅ assets/icon.png generated successfully.');

    // 2. Generate splash.png (2732x2732) with centered brand logo on a solid white background
    console.log('Generating assets/splash.png (2732x2732)...');
    
    // Resize the logo to a reasonable size for the splash screen (e.g. 1000x1000)
    const splashLogoBuffer = await sharp(logoSource)
      .resize(1000, 1000, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toBuffer();

    // Create solid white background and overlay the logo in the center
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

    // 3. Generate splash.jpg (2732x2732)
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
