#!/bin/bash
# 맥(집) 환경변수 설정 스크립트
# 사용법: source env-mac.sh 또는 . env-mac.sh

node scripts/setup-env.js mac

export JAVA_HOME="/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

echo "✅ [Mac] 환경변수(JAVA_HOME, ANDROID_HOME, PATH) 설정이 완료되었습니다."
echo "   JAVA_HOME   : $JAVA_HOME"
echo "   ANDROID_HOME: $ANDROID_HOME"
