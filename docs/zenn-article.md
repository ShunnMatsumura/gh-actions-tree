---
title: "GitHub Actionsのワークフローが多すぎて見づらいので、命名規則でフォルダツリー化するChrome拡張を作った"
emoji: "🌳"
type: "tech"
topics: ["chrome拡張", "githubactions", "javascript", "個人開発"]
published: false
---

## 課題：ワークフローが増えるとサイドバーが破綻する

GitHub Actions を本格的に使っていると、ワークフローはどんどん増えていきます。デプロイ、テスト、Lint、Terraform、定期バッチ……。気づけば数十件になり、Actions ページの左サイドバーはフラットな一覧のまま。しかも件数が多いと途中でページネーションされ、「Show more workflows」を押さないと全部見えません。

<!-- 📸 スクショ1: Before — 素のGitHub Actionsサイドバー。フラットな一覧で「Show more workflows」が出ている状態 -->
![変更前：フラットなワークフロー一覧](/images/gh-actions-tree/before.png)
*変更前。フラットな一覧で、下の方は「Show more workflows」を押すまで見えない*

GitHub にはワークフローをグルーピングする機能がありません。ないなら作ろう、ということで Chrome 拡張機能を作りました。

## 作ったもの：GH Actions Tree

ワークフロー名の先頭に `[A][B]` 形式のプレフィックスを付けておくと、それをフォルダ階層として解釈し、サイドバーを折りたたみ可能なツリー表示に置き換える拡張機能です。

```
[app][web]_deploy   →  app > web > deploy
[app][web]_test     →  app > web > test
[infra][aws]_plan   →  infra > aws > plan
lint                →  ルート直下に lint
```

<!-- 📸 スクショ2: After — 拡張機能適用後のツリー表示。フォルダが展開されて階層とカウントバッジが見えている状態 -->
![変更後：フォルダツリー表示](/images/gh-actions-tree/after.png)
*変更後。命名プレフィックスがそのままフォルダ階層になる。バッジは配下のワークフロー数*

リポジトリはこちらです。

https://github.com/ShunnMatsumura/gh-actions-tree

主な機能：

- 命名プレフィックスによる自動フォルダ分け（ネスト段数は任意、区切りは `_` / `-` / スペースいずれもOK）
- **サイドバーのページネーションに関係なく全ワークフローを取得**してツリー化
- インクリメンタル検索フィルタ
- フォルダ開閉状態のリポジトリごとの記憶
- 表示中ワークフローのハイライト＋祖先フォルダの自動展開
- ワンクリックで元のフラット表示に戻せる
- ライト/ダークテーマ対応

<!-- 📸 スクショ3: フィルタ機能 — 検索ボックスに "deploy" などを入力して絞り込まれている状態 -->
![フィルタで絞り込み](/images/gh-actions-tree/filter.png)
*フィルタ入力中は該当ワークフローだけが表示され、フォルダも自動で開く*

## 実装のポイント

Manifest V3 のコンテンツスクリプトで、ビルドなしの素の JavaScript ~500行です。技術的に考えどころだったのは3点でした。

### 1. ページネーション問題：全ワークフローをどう取得するか

サイドバーの DOM には最初の10件程度しか載っていないので、DOM を読むだけでは全件のツリーが作れません。そこで取得は2段構えにしました。

**第1段：GitHub REST API。** `GET /repos/{owner}/{repo}/actions/workflows` を `per_page=100` でページングすれば全件取れます。ポイントは、api.github.com が CORS を許可している（`Access-Control-Allow-Origin: *`）ので、**コンテンツスクリプトから直接 fetch できる**こと。バックグラウンドワーカーを経由する必要がなく、公開リポジトリなら認証も不要です。

```js
async function fetchWorkflowsViaApi(info, token) {
  const all = [];
  for (let page = 1; page <= 30; page++) {
    const res = await fetch(
      `https://api.github.com/repos/${info.owner}/${info.repo}` +
      `/actions/workflows?per_page=100&page=${page}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const data = await res.json();
    all.push(...data.workflows);
    if (data.workflows.length === 0 || all.length >= data.total_count) break;
  }
  return all;
}
```

**第2段：DOMフォールバック。** トークン未設定のプライベートリポジトリなどで API が使えない場合は、サイドバーの「Show more workflows」ボタンを増分がなくなるまで自動クリックし、画面に表示された一覧をそのまま読み取ってツリーを組み立てます。ユーザー自身に見えているページの DOM を参照するだけなので、追加の認証が要りません。

実際に60件のワークフローで検証したところ、サイドバーの DOM に10件しか載っていない状態でも、「Show more workflows」を一度もクリックせずに全60件がツリー化されました。

### 2. 名前のパース

`[A][B]_deploy` 形式のパースは、先頭のブラケットを繰り返し消費していくだけの素朴な実装です。

```js
// "[A][B]_deploy" -> { folders: ["A", "B"], leaf: "deploy" }
function parseName(name) {
  const folders = [];
  let rest = name.trim();
  for (;;) {
    const m = rest.match(/^\[([^\]]*)\][-_\s]*/);
    if (!m) break;
    const seg = m[1].trim();
    if (seg) folders.push(seg);
    rest = rest.slice(m[0].length);
  }
  return { folders, leaf: rest.trim() || name.trim() };
}
```

ブラケットがない名前はルート直下に置くので、既存の命名を壊さず段階的に移行できます。ツリー自体は `<details>`/`<summary>` で組んでいて、折りたたみはブラウザネイティブ。スタイルは GitHub の Primer CSS 変数（`var(--fgColor-default)` など）を参照しているので、ライト/ダークどちらのテーマでも馴染みます。

### 3. GitHubのReact再レンダリングとの戦い

今の GitHub は React ベースで、SPA的な画面遷移や再レンダリングで注入した DOM が消されます。イベントだけで追いかけるのは無理があったので、開き直って **800msごとに状態をチェックして、自分のツリーが消えていたら再注入する** 方式にしました。

```js
setInterval(tick, 800);
document.addEventListener('turbo:load', tick);
```

`tick()` は「URLがActionsページか」「自分のツリーがまだDOMにいるか」「元のリストが再表示されていないか」を見て差分だけ直すので、実質コストはほぼゼロです。泥臭いですが、DOM 構造の変化に対して一番頑健でした。

## ハマったポイント：YAMLの `: ` 問題

開発中、テスト用のダミーワークフローを30個生成したら、サイドバーに **`name` ではなくファイルパスが表示される** 現象に遭遇しました。

<!-- 📸 スクショ4（任意）: 名前ではなく .github/workflows/xxx.yml が並んでしまっている状態のスクショがあれば -->

原因はこの行です。

```yaml
steps:
  - run: echo "dummy workflow: [app][web]_deploy"
```

一見問題なさそうですが、YAML のプレーンスカラー内に `: `（コロン＋スペース）があると `mapping values are not allowed in this context` でパースエラーになります。値が `"` で始まっていないので、途中の引用符は保護になりません。GitHub はパースできないワークフローの `name` を読めず、フォールバックとしてファイルパスを表示していたのでした。

エラーとして通知されるわけでもなく、Actions の実行履歴に謎の Failure が積まれるだけなので、地味に気づきにくい罠です。

## セキュリティ面で気をつけたこと

ブラウザ拡張はページに任意のコードを注入できてしまうので、公開前にセルフレビューしました。

- **XSS対策**: `innerHTML` は静的なSVGアイコン定数のみ。ワークフロー名（API・DOM由来の外部入力）はすべて `textContent` で描画。`[<img onerror=...>]_deploy` みたいな名前が来ても文字列として表示されるだけ
- **PATの扱い**: `chrome.storage.local` のみに保存（ページと共有される `localStorage` には置かない）。送信先はハードコードされた `https://api.github.com` のみ
- **権限は最小**: `permissions` は `storage` だけ、コンテンツスクリプトは `https://github.com/*` 限定。外部スクリプト読み込み・アナリティクスなし
- URLパス由来の owner/repo は GitHub の命名規則で検証してから API パスに使用（`..` などの混入対策）

## インストール

Chrome Web Store で公開しています（審査中の場合はリポジトリから load unpacked でも使えます）。

<!-- 🔗 ストア公開後にURLを差し替え -->
- Chrome Web Store: （公開URL）
- GitHub: https://github.com/ShunnMatsumura/gh-actions-tree

プライベートリポジトリで使う場合は、拡張機能のオプション画面で Fine-grained PAT（対象リポジトリの Actions: Read-only 権限）を設定すると API 経由で全件取得できます。未設定でも DOM フォールバックで動作します。

## おわりに

「命名規則をUIに反映する」というアプローチは、チームに新しいルールを強制せず（既存の `[prefix]` 命名をしているチームは意外と多いはず）、拡張機能を入れていない人の環境も一切壊さないのが気に入っています。

同じ悩みを持っている方はぜひ試してみてください。Issue や PR も歓迎です 🙌
