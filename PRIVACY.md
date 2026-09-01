# Privacy Policy / プライバシーポリシー

**GH Actions Tree** (Chrome extension)

Last updated: 2026-09-01

## 日本語

### 収集するデータ

本拡張機能は、開発者や第三者のサーバーへいかなるデータも送信・収集しません。アナリティクスやトラッキングも含まれていません。

### 扱うデータと保存場所

- **GitHub Personal Access Token（任意設定）**: ユーザーが任意でオプション画面に設定した場合のみ、ブラウザ内の `chrome.storage.local` に保存されます。このトークンは GitHub のワークフロー一覧を取得する目的で `https://api.github.com` への HTTPS リクエストにのみ使用され、それ以外へ送信されることはありません。
- **ワークフロー一覧のキャッシュと UI 状態**（フォルダの開閉状態など）: github.com の `localStorage` および `chrome.storage.local` に保存されます。ブラウザの外に出ることはありません。

### 通信先

本拡張機能が通信するのは以下のみです。

- `https://api.github.com` — ワークフロー一覧の取得（GET のみ）

### データの削除

拡張機能を削除すると、`chrome.storage.local` のデータは削除されます。github.com の `localStorage` に保存されたキャッシュはブラウザのサイトデータ削除で消去できます。

### お問い合わせ

https://github.com/ShunnMatsumura/gh-actions-tree/issues

## English

### Data Collection

This extension does not transmit or collect any data to the developer or any third party. It contains no analytics or tracking.

### Data Handled and Where It Is Stored

- **GitHub Personal Access Token (optional)**: Only if the user chooses to set one on the options page, it is stored in `chrome.storage.local` inside the browser. The token is used solely in HTTPS requests to `https://api.github.com` to fetch the workflow list, and is never sent anywhere else.
- **Workflow list cache and UI state** (such as folder open/closed state): stored in `localStorage` on github.com and in `chrome.storage.local`. This data never leaves the browser.

### Network Endpoints

The only endpoint this extension communicates with is:

- `https://api.github.com` — fetching the workflow list (GET only)

### Data Deletion

Uninstalling the extension deletes its `chrome.storage.local` data. The cache in github.com `localStorage` can be removed by clearing the site data in the browser.

### Contact

https://github.com/ShunnMatsumura/gh-actions-tree/issues
