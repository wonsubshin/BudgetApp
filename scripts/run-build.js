const { spawn } = require('child_process');
const path = require('path');
const { getEnvironmentConfig, setupLocalProperties } = require('./setup-env');

function main() {
  const targetEnv = process.argv[2];
  const { envKey, envConfig } = getEnvironmentConfig(targetEnv);

  console.log(`🚀 [${envKey.toUpperCase()}] 환경으로 컴파일 및 빌드를 시작합니다...`);

  // 1. android/local.properties 생성 및 갱신
  setupLocalProperties(envKey, envConfig);

  // 2. 프로세스 환경변수 주입
  const env = { ...process.env };
  env.JAVA_HOME = envConfig.JAVA_HOME;
  env.ANDROID_HOME = envConfig.ANDROID_HOME;

  const pathSeparator = process.platform === 'win32' ? ';' : ':';
  const javaBin = path.join(envConfig.JAVA_HOME, 'bin');
  const androidTools = path.join(envConfig.ANDROID_HOME, 'platform-tools');
  const androidEmulator = path.join(envConfig.ANDROID_HOME, 'emulator');

  const additionalPaths = [javaBin, androidTools, androidEmulator];
  if (envConfig.platformTools) {
    additionalPaths.push(envConfig.platformTools);
  }

  env.PATH = `${additionalPaths.join(pathSeparator)}${pathSeparator}${env.PATH || ''}`;

  console.log(`📌 주입된 환경변수:`);
  console.log(`   JAVA_HOME   : ${env.JAVA_HOME}`);
  console.log(`   ANDROID_HOME: ${env.ANDROID_HOME}`);

  // 3. npx react-native run-android 실행
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'npx.cmd' : 'npx';
  const args = ['react-native', 'run-android'];

  console.log(`\n▶️ 실행 명령어: ${command} ${args.join(' ')}\n`);

  const child = spawn(command, args, {
    env,
    stdio: 'inherit',
    shell: true,
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log(`\n🎉 [${envKey.toUpperCase()}] 빌드 및 실행 완료!`);
    } else {
      console.error(`\n❌ 빌드 중 오류 발생 (종료 코드: ${code})`);
      process.exit(code || 1);
    }
  });
}

main();
