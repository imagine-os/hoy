version: 0.25.0
date: 2026-10-24
prompt: docs/prompts/0187-drawer-keyboard-dismiss.md
intent: Preserve shared dialog keyboard dismissal when a focused control disappears or is replaced by a disabled control.
decision: Register one document keyboard listener while drawers are open, route only to the latest active innermost layer, and preserve nested focus-return and scroll-lock lifecycles. Align same-value portal paint order with the active logical leaf, without new CSS or stacking numbers. Keep close callbacks caller-controlled and current.
rejected: Payment-controller workarounds, closing every nested drawer with one Escape, ignoring consumed descendant keys, or changing component props/styles.
files: Drawer component/meta and isolated keyboard regression harness.

Focused browser checks cover lost focus, Tab/Shift+Tab, callback refresh, nested initial open and synchronous dismissal, all-layer unmount, reopen, visible Close/overlay and themes/locales. This is an isolated component change; full project build and integrated payment-screen regressions remain root integration gates.
