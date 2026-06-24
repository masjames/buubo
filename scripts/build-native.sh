#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:-all}"

android() {
  echo "==> Android debug APK"
  (cd "$ROOT/native/android" && ./gradlew :app:assembleDebug)
}

macos() {
  echo "==> macOS Swift build"
  (cd "$ROOT/native/macos" && swift build)
}

case "$TARGET" in
  android)
    android
    ;;
  macos|swift)
    macos
    ;;
  all)
    android
    macos
    ;;
  *)
    echo "Usage: $0 [android|macos|all]" >&2
    exit 2
    ;;
esac
