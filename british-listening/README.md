# British English Listening(イギリス英語リスニング練習アプリ)

ネイティブ会話スクリプト(全4話)を読み上げ音声で聴いて学ぶアプリです。
**iOSネイティブアプリ(Capacitor)** と **PWA(ブラウザ)** の両方で動く1ソース構成です。

## なぜネイティブアプリ版があるのか

iPhoneの読み上げ音声の制限は **Safari(ブラウザ)側の制限であり、OSの制限ではありません**。

| | 声の取得元 | 使える声 |
|---|---|---|
| Safari / PWA | Web Speech API(WebKitが制限) | イギリス英語は実質 Daniel のみ |
| **ネイティブアプリ** | **AVSpeechSynthesizer(OS直接)** | **ダウンロード済みのすべての声**(Daniel拡張・Serena・Martha など) |

ネイティブアプリ版では `@capacitor-community/text-to-speech` プラグインが
AVSpeechSynthesizer を直接呼び出すため、話者A・Bに本物のイギリス英語の女声・男声を
それぞれ割り当てられます(※Siriの声のみAppleの方針でアプリからは使えません)。

アプリ側は実行環境を自動判別します:
ネイティブで起動すれば AVSpeechSynthesizer、ブラウザで開けば従来どおり Web Speech API
(他地域の女声による代替+ピッチ演じ分け)で動作します。

## 構成

| パス | 役割 |
|---|---|
| `www/` | アプリ本体(HTML/SW/manifest/アイコン)— PWAとしてもこのまま動く |
| `ios/` | Xcodeプロジェクト(`npx cap add ios` で生成済み・SPM方式) |
| `capacitor.config.json` | Capacitor設定(appId: `com.shisei.britishlistening`) |
| `package.json` | Capacitor本体とTTSプラグインの依存定義 |
| `www/audio/`(任意) | `ep01-1.m4a` 等を置くとTTSの代わりに録音を再生 |

## iPhoneネイティブアプリのビルド手順(Mac + Xcode が必要)

```bash
cd british-listening
npm install            # Package.swift が node_modules を参照するため必須
npx cap sync ios       # www/ をネイティブプロジェクトへコピー
npx cap open ios       # Xcodeが開く
```

Xcodeで:
1. 左ペインで **App** プロジェクト → **Signing & Capabilities** → 自分のApple IDのTeamを選択
   (無料のApple IDでも実機インストール可。その場合7日ごとに再署名が必要。
   App Store配布や年単位の有効期限にはApple Developer Program加入が必要)
2. 上部のデバイス選択でiPhone実機を選び **▶ Run**

`www/` を編集したら `npx cap sync ios` で反映されます。

### より良い声を使うには

iPhoneの **設定 → アクセシビリティ → 読み上げコンテンツ → 声 → 英語** から
**Daniel(拡張)・Serena・Martha** などをダウンロードしてください。
ネイティブアプリ版なら、ダウンロードした声がすべて選択リストに表示されます。

## PWAとして使う場合(Macがない場合の代替)

1. リポジトリの Settings → Pages でブランチを公開
2. Safariで `https://<ユーザー名>.github.io/<リポジトリ名>/british-listening/www/` を開く
3. 共有 → 「ホーム画面に追加」

PWA版はSafariの声制限を受けるため、話者Aにはアイルランド(Moira)等の
他地域の英語の女声を自動割り当てして聞き分けを確保します。

ローカル確認: `cd www && python3 -m http.server` → `http://localhost:8000/`
