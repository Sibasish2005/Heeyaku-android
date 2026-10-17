const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(projectRoot, '..');
const isWindows = os.platform() === 'win32';

async function main() {
  console.log('====================================================');
  console.log('🚀 BUILDING PRODUCTION RELEASE APK FOR CALLTRACKER');
  console.log('====================================================');

  const androidDir = path.join(projectRoot, 'android');
  const gradlew = isWindows ? path.join(androidDir, 'gradlew.bat') : path.join(androidDir, 'gradlew');

  console.log(`[Build] Running Gradle assembleRelease in ${androidDir}...`);
  execSync(`"${gradlew}" assembleRelease`, {
    stdio: 'inherit',
    cwd: androidDir,
  });

  const builtApk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
  if (!fs.existsSync(builtApk)) {
    throw new Error(`Expected APK not found at: ${builtApk}`);
  }

  const stats = fs.statSync(builtApk);
  console.log(`\n✅ Release APK successfully compiled! Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);

  // Copy to public/downloads for web distribution
  const publicDest = path.join(repoRoot, 'public', 'downloads', 'heeyaku-calltracker.apk');
  fs.mkdirSync(path.dirname(publicDest), { recursive: true });
  fs.copyFileSync(builtApk, publicDest);
  console.log(`✅ Synced to public downloads: ${publicDest}`);

  // Check ADB device
  try {
    const devicesOut = execSync('adb devices', { encoding: 'utf8' });
    const hasDevice = devicesOut.includes('\tdevice');
    if (hasDevice) {
      console.log('\n📱 Connected ADB device detected. Installing updated APK directly...');
      execSync(`adb install -r "${builtApk}"`, { stdio: 'inherit' });
      console.log('✅ Updated APK installed onto device!');

      console.log('🚀 Launching CallTracker on device...');
      execSync('adb shell am start -n com.calltracker/.MainActivity', { stdio: 'inherit' });
      console.log('🎉 App launched with Clerk native device verification!');
    } else {
      console.log('ℹ️ No active ADB device found. APK is ready for distribution.');
    }
  } catch (adbErr) {
    console.warn('[ADB] Device install notice:', adbErr.message);
  }

  console.log('\n🎉 BUILD AND DEPLOYMENT COMPLETE!');
}

main().catch(err => {
  console.error('\n❌ BUILD FAILED:', err.message);
  process.exit(1);
});
