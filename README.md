# gh-actions-tree

GitHub Actions のワークフロー一覧サイドバーを、命名規則ベースのフォルダツリー UI に置き換える Chrome 拡張機能です。

ワークフロー名が `[A][B]_deploy` のような形式のとき、`A > B > deploy` という階層で表示します。

```
Before                         After

[app][web]_deploy              ▸ app
[app][web]_test                  ▸ web
[app][api]_deploy                    deploy
[app][api]_test                      test
[infra]_terraform-plan           ▸ api
lint                                 deploy
                                     test
                               ▸ infra
                                   terraform-plan
                               lint
```

## 機能

- `[A][B]_name` / `[A] [B] name` / `[A]-[B]-name` 形式のプレフィックスをパースして、折りたたみ可能なツリーを構築（ネスト段数は任意）
- **ページネーション対応**: サイドバーに表示されている分だけでなく、全ワークフローを取得してツリー化
  - まず GitHub REST API（`GET /repos/{owner}/{repo}/actions/workflows`、`per_page=100` でページング）で全件取得
  - API が使えない場合（トークン未設定のプライベートリポジトリなど）は、サイドバーの「Show more workflows」を自動クリックして全件を DOM から取得するフォールバック
- ワークフロー名のインクリメンタルフィルタ
- フォルダの開閉状態をリポジトリごとに保存
- 現在表示中のワークフローをハイライトし、その階層を自動展開
- ヘッダーのボタンで「元のフラット表示」へいつでも切り替え可能／一覧の再取得
- 一覧は 5 分間キャッシュ（更新ボタンで即時再取得）
- GitHub のライト/ダークテーマ両対応（Primer CSS 変数を使用）

## インストール

1. このリポジトリをクローン
2. Chrome で `chrome://extensions` を開く
3. 右上の「デベロッパー モード」を ON
4. 「パッケージ化されていない拡張機能を読み込む」でこのリポジトリのルートディレクトリを選択

## プライベートリポジトリで使う場合

API 経由で全件取得するには Personal Access Token を設定します（任意。未設定でも DOM フォールバックで動作します）。

1. 拡張機能の「オプション」を開く
2. トークンを入力して Save
   - Fine-grained token: 対象リポジトリの **Actions: Read-only** 権限
   - Classic token: **repo** スコープ

トークンは `chrome.storage.local`（ローカル）にのみ保存され、`api.github.com` へのリクエスト以外には使用されません。

## 命名規則

| ワークフロー名 | 表示 |
| --- | --- |
| `[app][web]_deploy` | app > web > deploy |
| `[infra] terraform-plan` | infra > terraform-plan |
| `lint` | ルート直下に `lint` |

- ブラケット `[...]` の連続がフォルダ階層になります
- ブラケットの後の区切り文字（`_` / `-` / スペース）は無視されます
- ブラケットを含まない名前はルート直下に表示されます

## 制限事項

- github.com のみ対応（GitHub Enterprise Server は未対応）
- GitHub 側の DOM 構造変更により表示が崩れる可能性があります。その場合はヘッダーのリストアイコンから元の表示に戻せます

## License

MIT
