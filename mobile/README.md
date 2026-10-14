# বাকি খাতা — মোবাইল অ্যাপ (iPhone + Android)

React Native + Expo অ্যাপ। Google দিয়ে এক ক্লিকে লগইন — প্রত্যেক ইউজারের হিসাব তার **নিজের Google Drive**-এ “বাকি খাতা” নামের একটি Google Sheet-এ থাকে। কোনো আলাদা সার্ভার লাগে না।

## কিভাবে কাজ করে

- লগইনের সময় অ্যাপ শুধু `drive.file` অনুমতি চায় — মানে অ্যাপ কেবল নিজের তৈরি করা ফাইল দেখতে পারে, ইউজারের অন্য কোনো ফাইল নয়।
- প্রথম লগইনে Drive-এ শিট তৈরি হয় (`Transactions` + `Summary` ট্যাব)। পরে যেকোনো ফোনে একই Google অ্যাকাউন্টে লগইন করলে একই শিট খুলে যায়।
- এন্ট্রি সাথে সাথে স্ক্রিনে দেখায়, পেছনে Sheet-এ সেভ হয়; ব্যর্থ হলে ফিরিয়ে নেয়। শেষ ডাটা ফোনে ক্যাশ থাকে, তাই নেট ছাড়াও দেখা যায়।

ফিচার: মোট পাওনা, নতুন বাকি/জমা, নাম সাজেশন, খোঁজা, কাস্টমারের ইতিহাস, এন্ট্রি মুছা, রিমাইন্ডার শেয়ার (WhatsApp/SMS), মুদ্রা বদল, ডার্ক মোড, Sheet খোলা, লগ আউট।

## সেটআপ (একবারই করতে হবে)

### ১. Google Cloud
1. <https://console.cloud.google.com> → নতুন প্রজেক্ট।
2. **APIs & Services → Library** থেকে **Google Sheets API** ও **Google Drive API** Enable করুন।
3. **OAuth consent screen**: User type *External*, অ্যাপের নাম/ইমেইল দিন, scope হিসেবে `.../auth/drive.file` যোগ করুন, তারপর **Publish app** (In production)। `drive.file` non-sensitive scope, তাই Google verification লাগে না।
4. **Credentials → Create OAuth client ID** — তিনটি বানান:
   - **Web application** → এর Client ID = `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - **iOS** → Bundle ID `com.bakikhata.app` → এর Client ID = `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
   - **Android** → Package `com.bakikhata.app` + SHA-1 (নিচে ধাপ ৩ দেখুন)

### ২. প্রজেক্ট
```bash
cd mobile
npm install
cp .env.example .env      # দুইটি Client ID বসান
npm install -g eas-cli && eas login
eas init                  # Expo অ্যাকাউন্টে প্রজেক্ট লিংক
eas env:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value <web-id> --environment preview --environment production --environment development
eas env:create --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value <ios-id> --environment preview --environment production --environment development
```

### ৩. বিল্ড
```bash
# Android — সরাসরি ফোনে ইন্সটল করার APK
eas build -p android --profile preview
eas credentials -p android   # এখান থেকে SHA-1 কপি করে Google Cloud-এর Android client-এ দিন

# iPhone (Apple Developer অ্যাকাউন্ট লাগবে)
eas build -p ios --profile preview

# Play Store / App Store
eas build -p all --profile production && eas submit -p all
```
Play Store-এ দিলে Play Console → *App signing*-এর SHA-1-ও Android OAuth client-এ যোগ করতে হবে।

> Google Sign-In নেটিভ মডিউল, তাই **Expo Go-তে চলবে না**। ডেভেলপমেন্টের জন্য `eas build --profile development` দিয়ে dev build নিন, তারপর `npx expo start`।

## ফাইল

```
App.tsx                  লগইন চেক, ফন্ট, স্ক্রিন বাছাই
src/google.ts            Google Sign-In
src/sheets.ts            ইউজারের Drive-এ Sheet খোঁজা/তৈরি, পড়া/লেখা/মুছা
src/store.tsx            ডাটা, ক্যাশ, optimistic আপডেট
src/ledger.ts            হিসাব ও ফরম্যাটিং
src/screens/             Login, Home, CustomerModal, SettingsModal
app.config.ts, eas.json  অ্যাপ ও বিল্ড কনফিগ
```
