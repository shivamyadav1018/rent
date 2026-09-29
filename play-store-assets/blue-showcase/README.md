# KirayaBahi — blue Play Store showcase

New campaign inspired by the supplied reference: blue backgrounds, large white benefit headings, and prominent app panels. All earlier Play Store assets are preserved.

## Files

| Folder under `upload-ready/` | Size | Images |
| --- | --- | --- |
| `phone/` | 1080 × 1920 | 4 |
| `7-inch-tablet/` | 1440 × 2560 | 4 |
| `10-inch-tablet/` | 2560 × 1440 | 4 |
| `chromebook/` | 2560 × 1440 | 4 |

Upload individual PNGs in numeric order: dashboard, tenants, ledger, properties. `previews/` contains overview strips for review, not store upload.

These are marketing compositions reusing the app panels from `../multi-device/upload-ready/phone-v3/`. Device folders describe export sizes; they are not new captures from tablet or Chromebook hardware. Confirm actual device support and UI accuracy before submitting to those device categories.

Sizes follow the portrait 9:16 / landscape 16:9 recommendations in [Google Play's preview asset guidance](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en-GB).

## Rebuild

From the repository root on macOS:

```sh
swift -module-cache-path /tmp/kirayabahi-swift-cache play-store-assets/blue-showcase/render.swift
```

The renderer is adapted from the existing native AppKit asset renderer. It only writes inside this new folder. `original-assets-sha256.json` records the pre-existing assets for preservation checks.

## Background generation

Tool: built-in imagegen. Typography and screenshot placement use the native renderer for consistent, legible exports.

Prompt:

> Use case: ads-marketing. Create a clean portrait background plate for KirayaBahi Play Store screenshot compositions, matching a professional property app screenshot campaign. 9:16 portrait. Saturated medium blue #0873C8 dominating, very subtle darker blue broad curved layers in bottom third, upper half nearly uniform blue with ample empty space for white headlines. Flat restrained elegant graphic design. Full bleed, no borders. No text, no letters, no icons, no devices, no buildings, no objects. This is a background only; actual screenshots and typography will be placed separately.
