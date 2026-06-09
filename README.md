# ふるさと納税シミュレーション（業務用）

社内スタッフが顧客対応で使用する、ふるさと納税の**控除上限額（自己負担2,000円で寄附できる目安額）**を試算する Web アプリです。各種所得控除を加味した詳細試算と、顧客ごとの試算履歴の保存に対応しています。

## 主な機能

- 🔐 **スタッフログイン**（Firebase Authentication / メール+パスワード）
- 🧮 **詳細試算**：給与所得控除・基礎控除・社会保険料・配偶者(特別)控除・扶養控除・生命/地震保険料控除・iDeCo・医療費控除等を加味して控除上限額を算出
- 💾 **履歴保存**（Cloud Firestore）：顧客名・対象年・メモとともに試算結果を保存／一覧／絞り込み／削除
- ⚡ リアルタイム再計算（入力に応じて即座に結果更新）
- ☁️ **Firebase Hosting** へのデプロイ対応

## 技術スタック

| 区分 | 採用 |
| --- | --- |
| フロント | React 18 + TypeScript + Vite |
| ルーティング | React Router v6 |
| 認証 | Firebase Authentication |
| DB | Cloud Firestore |
| ホスティング | Firebase Hosting |
| テスト | Vitest |

## ディレクトリ構成

```
src/
  lib/
    furusato.ts        … 控除上限額の計算エンジン（コア）
    taxConstants.ts    … 税制定数（税率・控除額。改正時はここを更新）
    furusato.test.ts   … 計算エンジンの単体テスト
    format.ts          … 表示フォーマット
  firebase/
    config.ts          … Firebase 初期化
    simulations.ts     … Firestore 読み書き
  contexts/
    AuthContext.tsx    … 認証状態の管理
  components/          … Login / Layout / SimulationForm / ResultCard / NumberField
  pages/               … SimulatorPage（試算）/ HistoryPage（履歴）
  App.tsx / main.tsx   … ルーティング・エントリ
```

## セットアップ

### 1. 依存パッケージのインストール

```powershell
npm install
```

### 2. Firebase プロジェクトの準備

1. [Firebase コンソール](https://console.firebase.google.com/) でプロジェクトを作成
2. **Authentication** → ログイン方法 → 「メール/パスワード」を有効化し、スタッフ用アカウントを追加
3. **Firestore Database** を作成（本番モードで開始）
4. プロジェクト設定 → マイアプリ → Web アプリを追加し、設定値を取得

### 3. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、取得した値を設定します。

```powershell
Copy-Item .env.example .env
# .env を編集して VITE_FIREBASE_* を実値に
```

### 4. 開発サーバ起動

```powershell
npm run dev
```

ブラウザで表示された URL（既定 http://localhost:5173 ）を開き、登録済みスタッフアカウントでログインします。

## テスト・型チェック・ビルド

```powershell
npm test         # 計算エンジンの単体テスト（Vitest）
npm run typecheck
npm run build    # dist/ に本番ビルド
```

## デプロイ（Firebase Hosting + Firestore ルール）

```powershell
# 初回のみ
npm install -g firebase-tools
firebase login

# .firebaserc の "default" を自分のプロジェクトIDに変更しておく
npm run build
firebase deploy --only hosting,firestore:rules
```

## 計算ロジックについて

控除上限額は総務省が示す基本式に基づいています。

```
控除上限額 = 住民税所得割額 × 20%
            ÷ (90% − 所得税率 × 1.021)  + 2,000
```

- 所得税・住民税それぞれの課税所得を、給与所得控除と各種所得控除（基礎・社会保険料・配偶者・扶養・保険料・iDeCo・医療費等）から算出します。
- `1.021` は復興特別所得税（2.1%）を加味した係数です。
- 住民税所得割は課税所得 × 10% − 調整控除（簡易固定）で算出しています。

### ⚠ 注意（業務利用時）

本ツールの結果は**目安**です。以下は簡易・近似計算となっており、実額と差が生じる場合があります。最終的な控除額は確定申告・住民税通知書等でご確認ください。

- 自治体ごとの調整控除の差異（簡易固定額で計算）
- 配偶者特別控除（所得帯による概算）
- 住宅ローン控除など**税額控除との併用**（基本式には未反映。併用時は警告を表示）
- 最新の税制改正の細部

税制改正に対応する場合は [`src/lib/taxConstants.ts`](src/lib/taxConstants.ts) の定数を更新してください。

## セキュリティ

- Firebase の API キー等は `.env` に置き、Git にコミットしません（`.gitignore` で除外済み）。
- Firestore は [`firestore.rules`](firestore.rules) により**認証済みスタッフのみ**読み書き可能です。
- 顧客の個人情報（氏名等）を保存するため、アカウント管理・アクセス権限の運用にご留意ください。
