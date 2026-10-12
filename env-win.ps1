# 윈도우(회사) 환경변수 설정 스크립트
node scripts/setup-env.js window

$env:JAVA_HOME = "D:\dev\tools\openJDK\17"
$env:ANDROID_HOME = "C:\Users\sir\AppData\Local\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"

Write-Host "✅ [Windows] 환경변수(JAVA_HOME, ANDROID_HOME, PATH) 설정이 완료되었습니다." -ForegroundColor Green
Write-Host "   JAVA_HOME   : $env:JAVA_HOME"
Write-Host "   ANDROID_HOME: $env:ANDROID_HOME"
