const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(projectRoot, '..');
const isWindows = os.platform() === 'win32';

let virtualDrive = null;

function cleanup() {
  if (virtualDrive) {
    try {
      execSync(`subst ${virtualDrive} /D`, { stdio: 'ignore' });
      console.log(`[Build] Cleaned up temporary drive ${virtualDrive}`);
    } catch (_) {}
    virtualDrive = null;
  }
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

async function main() {
  console.log('====================================================');
  console.log('🚀 BUILDING PRODUCTION RELEASE APK FOR CALLTRACKER');
  console.log('====================================================');

  let workDir = projectRoot;

  if (isWindows) {
    for (const letter of ['Y', 'Z', 'X', 'W', 'V']) {
      try {
        if (!fs.existsSync(`${letter}:\\`)) {
          virtualDrive = `${letter}:`;
          break;
        }
      } catch (_) {}
    }

    if (virtualDrive) {
      console.log(`[Build] Mapping ${virtualDrive} -> ${projectRoot} (bypasses Windows MAX_PATH)...`);
      execSync(`subst ${virtualDrive} "${projectRoot}"`, { stdio: 'inherit' });
      workDir = virtualDrive;
    }
  }

  const androidDir = path.join(workDir, 'android');
  const gradlew = isWindows ? path.join(androidDir, 'gradlew.bat') : path.join(androidDir, 'gradlew');

  console.log(`[Build] Running Gradle assembleRelease in ${androidDir}...`);
  execSync(`"${gradlew}" -p "${androidDir}" assembleRelease`, {
    stdio: 'inherit',
    cwd: androidDir,
  });

  const builtApk = path.join(projectRoot, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
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
      console.log('🎉 App launched with updated proxy-safe authentication!');
    } else {
      console.log('ℹ️ No active ADB device found. APK is ready for distribution.');
    }
  } catch (adbErr) {
    console.warn('[ADB] Device install notice:', adbErr.message);
  }

  cleanup();
  console.log('\n🎉 BUILD AND DEPLOYMENT COMPLETE!');
}

main().catch(err => {
  cleanup();
  console.error('\n❌ BUILD FAILED:', err.message);
  process.exit(1);
});
