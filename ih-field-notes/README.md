# 📋 IH Field Notes

A phone web app for industrial hygiene worker interviews. Tap **Start recording**, say a field name followed by the
answer, and the matching box on the form fills itself in. Everything you say is also saved in a transcript.

> “Worker name Maria Lopez. Job title welder. Department maintenance. Second shift.
> Task is grinding and MIG welding on steel frames. About 4 hours a day.
> Respirator half face with P100 filters. Safety glasses and ear plugs.”

fills in Worker name, Job title, Department, Shift, Task, Duration, Respirator, Eye protection and Hearing protection.

## Features

- **Voice auto-fill** from cue words (the full list is under “How voice fill works” in the app).
- **🎤 on any box** sends your next sentence straight into that box.
- **Auto-fill switch.** Turn it off to only keep a transcript, for example while the worker is talking.
- **Form sections:** Interview, Worker, Task & exposure, PPE, Health, Sampling, Notes. Every box can also be typed in.
- **Saved automatically** on the phone. The interviewer name is remembered for the next interview.
- **Export:** Share (text), Copy text, Print / PDF for one interview, and CSV of all interviews for Excel.
- Keeps the screen awake while recording (where the browser supports it).

## Running it

It's one file: `index.html`. Speech needs a secure page (`https://`), so host it somewhere like GitHub Pages and open
the link in **Safari on iPhone** or **Chrome on Android**, then use **Add to Home Screen**.

On iPhone, voice needs **Settings → General → Keyboard → Enable Dictation** (and Siri & Dictation allowed).

For a quick test on a computer: `python3 -m http.server 8000` in this folder, then open http://localhost:8000.

## Privacy

- Notes are stored only in that phone's browser (localStorage). Clearing Safari/Chrome website data deletes them,
  so export regularly.
- Speech is turned into text by the phone's built-in speech service (Apple or Google), the same one the keyboard
  mic uses. Check that this is allowed under your company's rules for worker information.

## Changing the form

The fields and their cue words are in the `SECTIONS` list near the top of the script in `index.html`. Add a field
by adding a line like:

```js
{ key: 'ventRate', label: 'Ventilation rate', cues: ['ventilation rate', 'air flow'] },
```
