# Web Accessibility Audit

An audit of web content, run on 2026-11-12. Read the executive summary for the verdict, the priorities section for what to do first, and the findings tables for detail.

## Metadata

What was audited, with what, and under which settings.

| Field | Value |
|---|---|
| Date | 2026-11-12 |
| Scope | 4 items |
| Skills run | keyboard-navigator, media-accessibility |
| Tooling | node v26.13.0, a11y-mcp-server 7.1.0 |
| Scan configuration | defaults, no config file found |
| Checks counted | 10 |

Audited:

- `assets/css/journal.css`
- `assets/js/journal.js`
- `home.hbs`
- `partials/bio.hbs`

## Executive summary

Pass. No critical or serious findings.

The headline numbers for this run.

| Measure | Value |
|---|---|
| Score | 100 out of 100 |
| Grade | A |
| Findings | 0 |
| Blocking (critical plus serious) | 0 |
| Verdict | Pass |

## Severity breakdown

Counts by severity, highest impact first.

| Severity | Count | What it means |
|---|---:|---|
| critical | 0 | Blocks a person from completing the task |
| serious | 0 | Major barrier with a difficult workaround |
| moderate | 0 | Real friction, workaround exists |
| minor | 0 | Noticeable but rarely blocking |

## Findings

No findings. Every check listed under "What passed" ran and came back clean.

## Remediation priorities

Nothing to remediate.

## What passed

7 checks ran and found nothing.

- The Reno trigger is a native button with an expanded state and a control relationship to the player panel.
- The Reno trigger is a native button, so Enter and Space activate it through its click handler; it also opens on mouse or pen hover.
- The YouTube iframe has a descriptive title, and the panel provides a direct YouTube link if playback fails.
- The panel has a close button and supports Escape; closing it removes the iframe source.
- The stylesheet disables CSS animations and transitions when reduced motion is preferred.
- The trigger exposes expanded state and controls, and the panel is hidden when closed. Focus stays on the trigger when opened; Tab can reach the Play and Close buttons, the player, and the YouTube link.
- The trigger receives a visible focus style. The Close button returns focus to the trigger when focus was inside the panel.

## Needs a human

Items a skill could not decide, or could not check automatically.

- **keyboard-navigator**: Reno is generated for marked introduction text in both the home template and bio partial. For New York, keep activation available without hover: use a native button that supports click, Enter, and Space, with visible focus and a reachable Close control.
- **keyboard-navigator**: The Escape handler listens on the parent document and cannot receive key events while focus is inside the cross-origin YouTube iframe. The existing Close button remains available before the iframe, but embedded-player keyboard behavior was not runtime-tested; verify Tab can leave the player.
- **media-accessibility**: The Reno pattern loads an unmuted autoplay iframe on pointer hover. For a music player, use hover only to reveal the player; require deliberate button activation to start audio, with keyboard access and clear play/pause and close controls.
- **media-accessibility**: Verify the chosen YouTube content has accurate captions for relevant lyrics, speech, and sound cues (WCAG 1.2.2 A); provide a transcript if the content is audio-only (1.2.1 A). Caption availability and quality cannot be confirmed from these files.
- **media-accessibility**: Keep emoji rain decorative and out of the accessibility tree. Honor prefers-reduced-motion in both CSS and any JavaScript animation; if motion runs automatically for more than five seconds alongside other content, provide a way to pause, stop, or hide it.

## Next steps

1. Keep the current checks in continuous integration so this does not regress.
2. Re-audit when the interface changes materially, or quarterly.
3. Confirm the automated result with a manual screen reader and keyboard pass.

Automated checks find a minority of accessibility barriers. A passing score is a floor, not a guarantee.

## Findings data

The merged findings, embedded so the next run can compute a delta without parsing this document.

```json a11y-findings
{
  "skills": [
    "keyboard-navigator",
    "media-accessibility"
  ],
  "scope": [
    "assets/css/journal.css",
    "assets/js/journal.js",
    "home.hbs",
    "partials/bio.hbs"
  ],
  "findings": [],
  "passed": [
    "The Reno trigger is a native button with an expanded state and a control relationship to the player panel.",
    "The Reno trigger is a native button, so Enter and Space activate it through its click handler; it also opens on mouse or pen hover.",
    "The YouTube iframe has a descriptive title, and the panel provides a direct YouTube link if playback fails.",
    "The panel has a close button and supports Escape; closing it removes the iframe source.",
    "The stylesheet disables CSS animations and transitions when reduced motion is preferred.",
    "The trigger exposes expanded state and controls, and the panel is hidden when closed. Focus stays on the trigger when opened; Tab can reach the Play and Close buttons, the player, and the YouTube link.",
    "The trigger receives a visible focus style. The Close button returns focus to the trigger when focus was inside the panel."
  ],
  "notes": [
    {
      "skill": "keyboard-navigator",
      "note": "Reno is generated for marked introduction text in both the home template and bio partial. For New York, keep activation available without hover: use a native button that supports click, Enter, and Space, with visible focus and a reachable Close control."
    },
    {
      "skill": "keyboard-navigator",
      "note": "The Escape handler listens on the parent document and cannot receive key events while focus is inside the cross-origin YouTube iframe. The existing Close button remains available before the iframe, but embedded-player keyboard behavior was not runtime-tested; verify Tab can leave the player."
    },
    {
      "skill": "media-accessibility",
      "note": "The Reno pattern loads an unmuted autoplay iframe on pointer hover. For a music player, use hover only to reveal the player; require deliberate button activation to start audio, with keyboard access and clear play/pause and close controls."
    },
    {
      "skill": "media-accessibility",
      "note": "Verify the chosen YouTube content has accurate captions for relevant lyrics, speech, and sound cues (WCAG 1.2.2 A); provide a transcript if the content is audio-only (1.2.1 A). Caption availability and quality cannot be confirmed from these files."
    },
    {
      "skill": "media-accessibility",
      "note": "Keep emoji rain decorative and out of the accessibility tree. Honor prefers-reduced-motion in both CSS and any JavaScript animation; if motion runs automatically for more than five seconds alongside other content, provide a way to pause, stop, or hide it."
    }
  ],
  "counts": {
    "critical": 0,
    "serious": 0,
    "moderate": 0,
    "minor": 0
  },
  "components": [],
  "score": 100,
  "grade": "A",
  "penalty": 0,
  "checks": 10,
  "generated": "2026-11-12",
  "template": "web"
}
```
