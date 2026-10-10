const { execSync, spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const isWindows = os.platform() === 'win32';

function checkDevices() {
  try {
    const out = execSync('adb devices', { encoding: 'utf8' });
    const lines = out
      .trim()
      .split('\n')
      .slice(1)
      .map(l => l.trim())
      .filter(Boolean);

    const authorized = lines.filter(l => l.endsWith('device'));
    const unauthorized = lines.filter(l => l.endsWith('unauthorized'));

    return { total: lines.length, authorized, unauthorized };
  } catch (e) {
    return { total: 0, authorized: [], unauthorized: [] };
  }
}

function run() {
  let virtualDrive = null;

  const cleanupDrive = () => {
    if (virtualDrive) {
      try {
        execSync(`subst ${virtualDrive} /D`, { stdio: 'ignore' });
        console.log(`[CallTracker] Cleaned up temporary drive ${virtualDrive}.`);
        virtualDrive = null;
      } catch (_) {}
    }
  };

  process.on('SIGINT', () => {
    cleanupDrive();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanupDrive();
    process.exit(0);
  });

  // Pre-flight check: Verify Android device availability
  console.log('[CallTracker] Checking connected Android devices via ADB...');
  const { total, authorized, unauthorized } = checkDevices();

  if (unauthorized.length > 0) {
    console.error('\n[CallTracker] Device detected but UNAUTHORIZED!');
    console.error('[CallTracker] Please unlock your phone screen and tap "Allow USB debugging".\n');
    process.exit(1);
  }

  if (authorized.length === 0) {
    console.error('\n[CallTracker] No active Android device or emulator detected!');
    console.error('[CallTracker] Please:');
    console.error('  1. Connect your Android phone via USB cable.');
    console.error('  2. Enable "Developer Options" and "USB Debugging" in Settings.');
    console.error('  3. Run "adb devices" to verify your device appears with status "device".\n');
    process.exit(1);
  }

  console.log(`[CallTracker] Target device ready: ${authorized[0].split('\t')[0]}`);

  try {
    if (isWindows && projectRoot.length > 60) {
      // Find an available drive letter using Node's fs
      for (const letter of ['Y', 'Z', 'X', 'W', 'V']) {
        try {
          if (!fs.existsSync(`${letter}:\\`)) {
            virtualDrive = `${letter}:`;
            break;
          }
        } catch (_) {}
      }

      if (virtualDrive) {
        console.log(`[CallTracker] Long Windows path detected (${projectRoot.length} chars).`);
        console.log(`[CallTracker] Temporarily mapping ${virtualDrive} to shorten C++ build paths...`);
        execSync(`subst ${virtualDrive} "${projectRoot}"`, { stdio: 'inherit' });

        const gradlewPath = path.join(virtualDrive, 'android', 'gradlew.bat');
        console.log(`[CallTracker] Building and installing debug APK...`);
        execSync(`"${gradlewPath}" -p "${path.join(virtualDrive, 'android')}" app:installDebug`, {
          stdio: 'inherit',
          cwd: path.join(virtualDrive, 'android'),
        });

        // Safe to unmount virtual drive now that Gradle native compilation & APK install finished
        cleanupDrive();
      }
    }

    if (!virtualDrive) {
      console.log(`[CallTracker] Building via standard react-native run-android...`);
      execSync('npx react-native run-android --no-packager', {
        stdio: 'inherit',
        cwd: projectRoot,
      });
    }

    // Launch the app on the connected device and set up adb reverse
    try {
      console.log('[CallTracker] Configuring ADB reverse ports for Metro (8081) and Backend (3000)...');
      execSync('adb reverse tcp:8081 tcp:8081', { stdio: 'ignore' });
      execSync('adb reverse tcp:3000 tcp:3000', { stdio: 'ignore' });
      execSync('adb shell am start -n com.calltracker/.MainActivity', { stdio: 'ignore' });
    } catch (_) {}

    console.log('[CallTracker] Build and installation successful! Starting Metro bundler...');
    const metro = spawn('npx', ['react-native', 'start'], {
      stdio: 'inherit',
      cwd: projectRoot,
      shell: true,
    });

    metro.on('exit', code => {
      cleanupDrive();
      process.exit(code || 0);
    });
  } catch (err) {
    cleanupDrive();
    console.error('[CallTracker] Build failed:', err.message);
    process.exit(1);
  }
}

run();
