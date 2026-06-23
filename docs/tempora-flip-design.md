# Tempora Flip / 时幕翻页钟

## Product Name

English: **Tempora Flip**

中文：**时幕翻页钟**

Brand family: **Tempora Screens / 时幕屏保系列**

Tagline: **Time, Simplified. / 让时间回归安静。**

## First Experience

Tempora Flip opens as a fullscreen-style black screensaver surface at `/tempora`.

The clock is the product. Branding and controls only appear briefly when the user moves the mouse, touches the screen, or presses a key. When idle, the cursor disappears and the display returns to a pure clock view.

Tempora Flip 的第一屏是黑场里的大号翻页钟。默认状态不展示品牌、不展示说明、不展示装饰，只保留时间本身。鼠标、触摸或键盘唤醒后，才短暂出现设置和品牌信息。

## Visual Rules

- Pure black background.
- Centered oversized clock.
- Two-card default layout: `HH MM`.
- Optional three-card layout: `HH MM SS`.
- Rounded black cards with very subtle depth.
- Large condensed numerals in soft gray, not pure white.
- A strong horizontal split line across every card.
- Mechanical flip motion, 320ms, no bounce and no spring.

## Interaction Rules

- 12-hour and 24-hour mode.
- Optional seconds.
- Optional AM/PM marker in the top-left of the hour card.
- Fullscreen toggle for the web preview.
- Wake Lock request when supported by the browser.
- Idle mode hides cursor and control chrome.

## Architecture

Current web route:

```text
/tempora
```

Current files:

```text
apps/web/src/tempora/TemporaFlip.tsx
apps/web/src/tempora/tempora.css
```

Future shell targets can reuse the same render surface:

```text
Tempora Flip Web
Tempora Flip macOS Screensaver
Tempora Flip Windows Screensaver
Tempora Flip Linux
Tempora Flip Electron
Tempora Flip Wallpaper Engine
Tempora Flip Android TV
```

## Product Family

```text
Tempora Flip       时幕翻页钟
Tempora World      时幕世界时钟
Tempora Matrix     时幕矩阵
Tempora Weather    时幕天气
Tempora Space      时幕星空
Tempora Focus      时幕专注
Tempora Gallery    时幕画廊
```
