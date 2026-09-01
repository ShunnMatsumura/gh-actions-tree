# Chrome Web Store 掲載情報（コピペ用）

デベロッパーダッシュボード: https://chrome.google.com/webstore/devconsole

## ストア掲載情報タブ

**名前**: GH Actions Tree

**概要（132文字以内）**:

> GitHub Actionsのワークフロー一覧を、[A][B]_name の命名規則に基づく折りたたみ可能なフォルダツリー表示に整理します。

英語版:

> Organizes your GitHub Actions workflow sidebar into a collapsible folder tree based on [A][B]_name prefixes.

**詳細説明**:

> ワークフローが増えてくると、GitHub Actions のサイドバーはフラットな一覧で見通しが悪くなります。GH Actions Tree は、ワークフロー名の先頭の [A][B] 形式のプレフィックスをフォルダ階層として解釈し、サイドバーを折りたたみ可能なツリー表示に置き換えます。
>
> 例: 「[app][web]_deploy」→ app > web > deploy
>
> 主な機能:
> ・命名プレフィックスによる自動フォルダ分け（ネスト段数は任意）
> ・サイドバーのページネーションに関係なく全ワークフローを取得して表示（GitHub REST API を使用、取得できない場合はDOMフォールバック）
> ・インクリメンタル検索フィルタ
> ・フォルダ開閉状態のリポジトリごとの記憶
> ・表示中ワークフローのハイライトと自動展開
> ・ワンクリックで元のフラット表示に切り替え
> ・ライト/ダークテーマ対応
>
> プライベートリポジトリでは、オプション画面で Personal Access Token（Actions: Read-only 権限）を設定するとAPI経由で全件取得できます。トークンはブラウザ内にのみ保存され、api.github.com 以外へは送信されません。
>
> オープンソース: https://github.com/ShunnMatsumura/gh-actions-tree

**カテゴリ**: デベロッパーツール

**言語**: 日本語（英語も追加するなら上記英文を使用）

**アイコン**: `icons/icon128.png` をアップロード

**スクリーンショット**: `docs/store-assets/screenshot-1.png`（ツリー表示）、`docs/store-assets/screenshot-2.png`（フィルタ機能）※1280×800

## プライバシータブ

**単一用途の説明**:

> GitHub Actions ページのワークフローサイドバーを、命名規則に基づくフォルダツリー表示に置き換える単一目的の拡張機能です。

**権限の使用理由**:

- `storage`:
  > ユーザーが任意で設定する GitHub Personal Access Token、ワークフロー一覧のキャッシュ、およびフォルダの開閉状態などのUI設定をブラウザ内に保存するために使用します。
- ホスト権限（コンテンツスクリプト `https://github.com/*`）:
  > GitHub Actions ページのサイドバーDOMを読み取り、ツリーUIを挿入・表示するために github.com 上でのみ動作します。

**データ使用について**:

- 「認証情報」の項目: ユーザーが任意設定する PAT を扱うが、ブラウザ内（chrome.storage.local）にのみ保存され、開発者・第三者には一切送信されない。GitHub API（api.github.com）への認証にのみ使用。
- データの販売なし / 承認された用途以外での使用・譲渡なし にチェック

**プライバシーポリシーURL**:

> https://github.com/ShunnMatsumura/gh-actions-tree/blob/main/PRIVACY.md

## 配布設定

- 公開範囲: まず「限定公開（リンクを知っているユーザーのみ）」で動作確認 → 問題なければ「公開」に変更
- リージョン: すべて

## 提出手順

1. `./scripts/package.sh` で `gh-actions-tree.zip` を生成
2. ダッシュボード →「新しいアイテム」→ ZIP をアップロード
3. 上記の掲載情報・プライバシー項目を入力
4. 「審査のため送信」（初回審査は通常1〜3営業日）
