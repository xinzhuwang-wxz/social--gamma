# 花托邦 路演页 · 协作说明

**线上入口（改完 merge 到 main 后 ~1 分钟自动更新）**
https://xinzhuwang-wxz.github.io/social--gamma/pitch/

它由 `docs/pitch/index.html`（单文件、全内联）提供。**不要手改 docs 下的产物**，改这里的源码：

| 想改什么 | 改哪个文件 |
|---|---|
| 页面文案 / 讲稿(data-note) / 页面结构 | `public/pitch/index.html` |
| 配色 / 字号 / 布局 | `public/pitch/pitch.css` |
| 动效 / 翻页逻辑 / 手机 demo 场景 / 地图 | `public/pitch/pitch.js` |
| 截图与生成图素材 | `public/pitch/assets/` |

改完后在**仓库根目录**执行：

```bash
python3 scripts/build-pitch.py   # 重新生成 docs/pitch/index.html
git add public/pitch docs/pitch && git commit -m "..." && git push
```

本地预览：直接双击 `public/pitch/index.html`（多文件源码版）或 `docs/pitch/index.html`（单文件版）。
演示操作：`↓` 或点击=一路播；`N` 讲稿；`F` 全屏；`1-8` 跳页。

叙事口径见 `NARRATIVE.md`（会议定稿，改文案前先读）。
