# Stimmwerk – Plan

Stimmwerk is a personal web app for voice training. You use it to hold a pitch, to hit a note, and to sing a melody again. The app shows if you hit the note, and if you must sing higher or lower. The app gives tips and has lessons from easy to difficult.

This document records the decisions. Use it as the reference for all milestones.

## 1. Scope and platform

- The first user is the owner. Keep the structure so that other users can use the app later.
- The app is a mobile-first Progressive Web App (PWA). It also works on desktop.
- The app has no backend and no login. All data stays in the browser (IndexedDB or localStorage).
- The app works offline after the first load.
- The user interface is in German. Keep all texts in one central module, so that a translation is easy later.

## 2. Technology

| Area | Decision |
| --- | --- |
| Build | Vite, React, TypeScript |
| Styling | Tailwind CSS. Light and dark mode follow the system setting. |
| Audio input | Web Audio API, `getUserMedia` without echo cancellation, noise suppression and auto gain |
| Pitch detection | `pitchy` (McLeod pitch method) |
| Graphics | `<canvas>` for the tuner and the piano roll |
| Reference sound | Piano samples (milestone 2). Milestone 1 uses a simple synthesized tone. |
| PWA | `vite-plugin-pwa`. Precache the app and the piano samples. |
| Tests | Vitest for all pure logic. Test the pitch detection with synthetic signals. |
| Hosting | Public GitHub repository `dahei/stimmwerk`, deployment to GitHub Pages with GitHub Actions |

Git commits use the author email `dahei@users.noreply.github.com`.

## 3. Onboarding and calibration

1. The user gives permission for the microphone.
2. Level and noise check: the user is silent for a short time, then sings "aaa". The app sets the noise threshold automatically.
3. Range calibration: the user sings a siren from low to high. Then the app guides the user to confirm the lowest and the highest comfortable note.
4. The app suggests a voice type (for example "Bariton"). The user can change it.
5. The first lesson starts.

The user can do the calibration again at any time. All exercises are transposed into the comfortable range. Exercises do not use the extreme notes.

The app recommends headphones and a quiet room.

## 4. Exercise types

1. **Hold a note** – sing one note stable for 3 to 10 seconds.
2. **Hit a note** – start a played note fast and clean.
3. **Intervals** – sing two notes one after the other (second to octave).
4. **Patterns** – for example 1-2-3-2-1 or 1-3-5-3-1.
5. **Melodies** – sing short phrases or parts of songs.
6. **Siren** – warm-up only. The app does not score it.

Default mode is call and response: the app plays the notes, then the user sings. A switch "Ich trage Kopfhörer" also allows singing along with a quiet reference tone.

## 5. Feedback and display

- The main live display is a vertical note ladder: note names on the left, the target band, and the voice as a trail of the last 4 seconds. Thus, the user sees how far away the voice is (for example "2 notes too low").
- The text shows the direction and the distance: in cents below one semitone, in semitones above one semitone.
- A level meter shows if the microphone hears the user loudly enough. The URL parameter `?debug` shows the raw values (dB, clarity, Hz).
- The free tuner also has a fine horizontal display with the deviation in cents.
- Melodies use a scrolling piano roll: target notes are bars, the voice of the user is a live line.
- Colors: green = hit, blue = too low, orange = too high. Arrows ↑ and ↓ also show the direction (for users with color blindness).
- Note names are German (C D E F G A H) with the scientific octave number (C4, A4, H3). A setting changes them to English.
- Smoothing: the score uses a moving median of approximately 200 ms. Thus, natural vibrato is not an error. The live line shows the real curve with a small smoothing.
- Only the pitch gets a score, not the rhythm. Each note has a time window with a lead and a lag.

## 6. Scoring

- The tolerance becomes smaller at each level: ±50 → ±30 → ±20 → ±10 cents.
- The score is the part of the time in the tolerance, with weights for stability and onset time.
- Each lesson gives 0 to 3 stars. 2 stars unlock the next lesson.
- In free mode, the user can set the tolerance manually.

## 7. Lessons

A lesson has 5 to 8 short tasks. Each task has this sequence:

1. The app plays the target.
2. Count-in or signal.
3. The user sings.
4. Immediate feedback (hit / too high / too low).

At the end, a result screen shows the stars, the detail curve, the tips, and the playback of the last recording. The user can do one task again without a new start of the lesson.

### Course levels

1. **Grundlagen** – hold a note (3 s, ±50 cents), hit a note in the middle range
2. **Stabilität** – longer notes (5 to 8 s), small steps (seconds), 3-note patterns
3. **Intervalle** – third, fourth, fifth, triads, 5-note scales
4. **Melodien** – short folk song phrases, sixth, octave, full major scale
5. **Fortgeschritten** – minor and chromatic, longer melodies, larger range, ±10 cents

Each level has 4 to 6 lessons. The lessons are in a data file, so that they are easy to change. Procedurally generated patterns add variety. The app has no MIDI or MusicXML import in version 1.

A free mode lets the user start each exercise type with custom parameters.

## 8. Tips

Tips come from rules. The rules use the measured data. The app shows a maximum of 2 tips for each result, the most important tip first.

| Error pattern | Detection | Tip direction |
| --- | --- | --- |
| Too low / too high | Mean deviation more than ±15 cents | Breath support, think the note "from above", relax the throat |
| Unstable | High spread, no regular vibrato | Constant air flow, practice shorter notes |
| Slow onset / slide from below | Long time to the tolerance band | Hear the note internally before you sing, clean start |
| Drop at the end | Pitch falls in the last part | Keep the support until the end |
| Errors in high or low range | Error rate depends on the range | Do not force the range, range exercises |
| Large intervals missed | Large intervals fail, small intervals pass | Practice intervals separately (link to a lesson) |
| Octave error | Exactly one octave off | Show a hint, not an error |

Error patterns that occur again in many sessions go into the daily training. Tips link to a small knowledge section.

### Knowledge section

6 to 8 short articles: breathing and support, posture, vowels, warm-up, voice care, and more. The texts are careful and tell the user that they do not replace singing lessons.

## 9. Regular practice

- **Streak**: days in sequence with practice.
- **Daily goal**: default 10 minutes. Options: 5, 10, 15, 20 minutes.
- **Daily training** (for 10 minutes): approximately 1.5 minutes warm-up (siren and held notes), 4 minutes repetition (lessons with few stars or frequent error patterns), 4 minutes of the next course lesson, short summary. The duration changes with the daily goal.
- **Statistics**: hit rate for each week, voice range over time.
- No push reminders in version 1.

## 10. Recording and data

- The user can listen to the last attempt of each exercise. The pitch curve moves together with the playback. The app does not keep the recordings. An archive is for version 2 at the earliest.
- Export and import of all data as a JSON file in the settings.
- The app calls `navigator.storage.persist()` to decrease the risk that the browser deletes the data.

## 11. Milestones

After each milestone, the owner tests the app and gives feedback.

### M1 – Core

- Project setup (Vite, React, TypeScript, Tailwind, Vitest).
- Microphone and pitch detection.
- Tuner display.
- "Hold a note" in free mode.
- Tests for the pitch logic.

### M2 – Exercises

- Piano samples.
- Hit a note, intervals, patterns, melodies with piano roll.
- Scoring and stars.
- Playback of the last recording.

### M3 – Course

- Onboarding and calibration.
- 5 levels, unlock logic.
- Tip engine.
- Knowledge section.

### M4 – Routine

- Daily training, streak, daily goal.
- Statistics.
- Export and import.
- PWA and offline mode.
- Deployment to GitHub Pages.

## 12. Not in version 1

- Rhythm scoring.
- MIDI or MusicXML import.
- Push reminders.
- Recording archive.
- Accounts and sync.
- AI-generated tips.
