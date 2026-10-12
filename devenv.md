# 🛠️ 멀티 OS 개발 환경 설정 가이드 (Windows & macOS)

본 프로젝트는 회사(Windows)와 집(macOS) 간의 개발 환경 차이(JDK 및 Android SDK 설치 경로)를 단일 설정 파일과 빌드 스크립트를 통해 자동으로 처리할 수 있도록 구성되어 있습니다.

---

## 1. 환경 설정 파일: `devenv.json`

프로젝트 루트의 `devenv.json` 파일에서 각 OS별 경로를 관리합니다.  
집(Mac)이나 회사(Windows)에서 실제 설치된 경로가 다를 경우 이 파일의 경로를 수정해 주세요.

```json
{
  "activeEnv": "window",
  "environments": {
    "window": {
      "JAVA_HOME": "D:\\dev\\tools\\openJDK\\17",
      "ANDROID_HOME": "C:\\Users\\sir\\AppData\\Local\\Android\\Sdk",
      "platformTools": "D:\\dev\\tools\\platform-tools-latest-windows\\platform-tools"
    },
    "mac": {
      "JAVA_HOME": "/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home",
      "ANDROID_HOME": "/Users/wonsub/Library/Android/sdk",
      "platformTools": "/Users/wonsub/Library/Android/sdk/platform-tools"
    }
  }
}
```

- **`activeEnv`**: 기본값으로 사용할 환경 이름 (`"window"` 또는 `"mac"`).
- **`JAVA_HOME`**: JDK 17 설치 홈 디렉터리 경로.
- **`ANDROID_HOME`**: Android SDK 설치 경로.
- **`platformTools`**: `adb`가 포함된 platform-tools 경로.

---

## 2. 간편 실행 명령어 (원클릭 컴파일 및 빌드)

`package.json`에 등록된 스크립트를 통해 OS별 환경변수를 자동으로 주입하고 `react-native run-android`를 실행합니다.

### 🏢 회사 (Windows)에서 빌드할 때
```bash
npm run android:win
```
또는:
```bash
node scripts/run-build.js window
```

### 🏠 집 (macOS)에서 빌드할 때
```bash
npm run android:mac
```
또는:
```bash
node scripts/run-build.js mac
```

> **동작 원리:**  
> 1. `scripts/run-build.js`가 지정된 환경(`window` 또는 `mac`)에 맞춰 `android/local.properties`의 `sdk.dir`을 자동 생성/갱신합니다.  
> 2. 프로세스에 해당 OS의 `JAVA_HOME`, `ANDROID_HOME`, `PATH` 환경변수를 주입한 상태로 `react-native run-android`를 호출하여 컴파일 및 에뮬레이터/기기 설치를 진행합니다.

---

## 3. 환경만 전환하기 (local.properties 동기화)

빌드를 즉시 실행하지 않고 `android/local.properties`만 대상 환경에 맞게 전환하려면 아래 명령어를 사용합니다.

```bash
# Windows 환경으로 전환
npm run env:win

# Mac 환경으로 전환
npm run env:mac
```

---

## 4. 터미널 세션 환경변수 적용 (선택 사항)

VS Code나 시스템 터미널 자체에 `JAVA_HOME`, `ANDROID_HOME`, `adb` 경로를 적용하고 싶을 때 사용합니다.

### Windows (PowerShell)
```powershell
.\env-win.ps1
```

### macOS (bash / zsh)
```bash
source env-mac.sh
# 또는
. env-mac.sh
```

---

## 5. 집(Mac) 초기 셋업 시 체크리스트

1. **JDK 17 확인**:
   ```bash
   # Homebrew로 설치 시
   brew install openjdk@17
   # 또는 Azul Zulu JDK 17 설치
   ```
2. **Mac의 실제 경로 확인 후 `devenv.json` 수정**:
   ```bash
   # JDK 경로 확인
   /usr/libexec/java_home -v 17
   
   # Android SDK 기본 경로
   # /Users/<사용자명>/Library/Android/sdk
   ```
   확인된 경로를 `devenv.json`의 `mac` 섹션에 반영하시면 됩니다.
