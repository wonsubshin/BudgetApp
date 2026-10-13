# 🚀 BudgetApp 실행 가이드

본 가이드는 **다른 PC에서 Git 저장소를 새로 다운로드(Clone)받았을 때**부터 **Windows / macOS 환경에서 빌드 및 구동**하기까지의 전체 과정을 담고 있습니다.

---

## 1. 사전 준비 사항 (Prerequisites)

* **Node.js**: v18 이상
* **JDK (Java Development Kit)**: OpenJDK 17 권장
* **Android Studio & Android SDK**:
  * Android SDK Platform 34 및 Build-Tools 34.0.0 설치
  * Android Emulator(가상 기기) 구동 또는 USB 디버깅이 연결된 실기기

---

## 2. 💻 새로운 PC에서 저장소 받아서 실행하기 (Step-by-Step)

### Step 1: 저장소 클론 (Git Clone)
```bash
git clone <저장소-주소>
cd BudgetApp
```

### Step 2: 의존성 패키지 설치
`--legacy-peer-deps` 옵션을 사용하여 패키지를 설치합니다:
```bash
npm install --legacy-peer-deps
```

### Step 3: `devenv.json` 경로 확인 및 수정 (필수 ⭐)
프로젝트 루트의 `devenv.json` 파일을 열고, **현재 PC의 JDK 및 Android SDK 설치 경로**와 일치하는지 확인 및 수정합니다.

```json
{
  "activeEnv": "window",
  "environments": {
    "window": {
      "JAVA_HOME": "D:\\dev\\tools\\openJDK\\17",
      "ANDROID_HOME": "C:\\Users\\<사용자명>\\AppData\\Local\\Android\\Sdk",
      "platformTools": "C:\\Users\\<사용자명>\\AppData\\Local\\Android\\Sdk\\platform-tools"
    },
    "mac": {
      "JAVA_HOME": "/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home",
      "ANDROID_HOME": "/Users/<사용자명>/Library/Android/sdk",
      "platformTools": "/Users/<사용자명>/Library/Android/sdk/platform-tools"
    }
  }
}
```

> **경로 확인 팁**:
> * **Windows**: Android SDK 기본 경로는 `C:\Users\<사용자명>\AppData\Local\Android\Sdk` 입니다.
> * **macOS**: Android SDK 기본 경로는 `/Users/<사용자명>/Library/Android/sdk` 입니다.
> * JDK 17 경로 확인: 터미널에서 `java -version` 또는 `javac -version`으로 설치 디렉터리를 확인하세요.

---

### Step 4: 안드로이드 에뮬레이터/기기 연결 확인
Android Studio에서 에뮬레이터를 먼저 켜거나 실기기를 연결한 후 터미널에서 확인합니다:
```bash
adb devices
```
*(목록에 `device` 상태로 등록된 기기가 표시되어야 합니다)*

---

### Step 5: Metro 번들러 실행 (터미널 1)
첫 번째 터미널 창을 열고 아래 명령어를 구동합니다:
```bash
npm start
```
터미널에 `Welcome to Metro ...` 문구가 나오면 번들러 준비 완료 상태입니다. (이 터미널 창은 계속 켜두세요)

---

### Step 6: 앱 빌드 및 구동 (터미널 2)
두 번째 터미널 창을 새로 열고, PC OS에 맞는 명령어를 실행합니다.

#### 🏢 Windows PC에서 빌드할 때:
```bash
npm run android:win
```

#### 🏠 macOS PC에서 빌드할 때:
```bash
npm run android:mac
```

> **스크립트 자동화 내용**:
> * `devenv.json` 설정에 따라 `android/local.properties` 파일자동 생성/갱신
> * `JAVA_HOME` 및 `ANDROID_HOME` 환경변수 자동 적용
> * 안드로이드 앱 빌드, 에뮬레이터 설치, 포트 포워딩(`adb reverse`) 및 앱 자동 실행까지 한 번에 처리

---

## 3. 🛠️ 자주 발생하는 문제 및 해결 방법 (Troubleshooting)

### Q1. Metro 번들러 연결 오류 ("Unable to load script" / "Could not connect to development server")
1. **터미널 1**에서 `npm start`가 꺼지지 않고 구동 중인지 확인하세요.
2. 아래 명령어로 포트 포워딩을 수동 적용 후 에뮬레이터에서 **`RELOAD (R, R)`**를 눌러주세요:
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```

### Q2. `JAVA_HOME` 또는 `ANDROID_HOME` 관련 빌드 오류
* `devenv.json` 파일에 적힌 `JAVA_HOME` 및 `ANDROID_HOME` 경로에 실제로 해당 폴더와 `java.exe` / `sdk` 가 존재하는지 체크해 주세요.

### Q3. 의존성 설치 충돌 오류 시
* `npm install` 대신 아래 명령어를 사용하세요:
  ```bash
  npm install --legacy-peer-deps
  ```

---

## 4. 📜 유용한 스크립트 모음

| 명령어 | 설명 |
| :--- | :--- |
| `npm start` | Metro 번들러 구동 (캐시 리셋 포함) |
| `npm run android:win` | Windows 환경변수 적용 및 안드로이드 빌드/실행 |
| `npm run android:mac` | macOS 환경변수 적용 및 안드로이드 빌드/실행 |
| `npm run env:win` | 빌드 없이 Windows용 `local.properties` 경로만 동기화 |
| `npm run env:mac` | 빌드 없이 macOS용 `local.properties` 경로만 동기화 |

## 5. 📜 apk 생성
node scripts/run-build.js window assembleRelease