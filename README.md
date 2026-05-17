# Prompt Drop Casino

Prompt Drop Casino is a play-for-fun browser slot game built with plain HTML, CSS, and JavaScript. It renders a 5x3 reel board, evaluates 10 fixed paylines, supports adjustable high-limit wager and auto-play controls, includes a separate user profile page for saving a name and buying profile icons with credits, shows live session play time, awards a once-per-day login bonus with a popup, tracks consecutive daily play streaks, warns when credits are too low for the wager, starts an automatic refill countdown when credits are too low to spin, offers an invite friends button, persists theme/consent/reward/profile/wallet state in `localStorage`, and includes a separate paytable view.

The main game now also includes a classroom-only variable-ratio reward schedule. It can award an extra hidden bonus after an undisclosed number of completed spins while keeping the original payline logic intact.

## Installation / Setup

No package install or build step is required. The project is fully static and already includes its animation dependency at `vendor/motion.js`.

1. From the project root, start a local static server:

```powershell
python -m http.server 8000
```

2. Open the app in a browser:

```text
http://localhost:8000/index.html
```

3. Open the profile or paytable pages when needed:

```text
http://localhost:8000/profile.html
http://localhost:8000/paytable.html
```

Serving over `localhost` is the recommended setup because the game requests browser geolocation during the consent flow, and that feature is typically blocked when opening `index.html` directly from disk.

## Usage Examples

Start a manual spin:

1. Open `index.html`.
2. Accept the privacy policy and terms.
3. Share device location or choose a state manually.
4. Set the bet with the wager slider.
5. Click `SPIN`.

Run auto-play:

1. Set `Auto-Play Count`.
2. Click `start auto spin`.
3. Click `stop auto spin` to halt the queue early.

Personalize the player:

1. Click `user profile` at the top left of the game.
2. Enter a display name on `profile.html`.
3. Click `save name`.
4. Spend credits in the icon shop to unlock and equip profile icons.

Check daily rewards:

1. Open `index.html` once per day to receive the daily credit bonus.
2. Return on consecutive local calendar days to increase the streak.
3. Use the daily bonus popup and check-in panel to review the awarded bonus, current streak, and next bonus.

Recover tokens and invite friends:

1. When credits are below the selected wager, the `Token Refill` HUD card counts down to the automatic refill.
2. Click `refill tokens` to refill manually before the countdown completes.
3. Click `invite friends` to share the game through the browser share sheet or copy the invite link.

Review rules and payouts:

1. Click `open paytable` in the main game.
2. Inspect symbol weights, payout multipliers, and the 10-payline gallery in `paytable.html`.

Run the variable-ratio schedule tests:

1. Start the same local static server from the project root.
2. Open `tests/variable-ratio-reward.test.html` in a browser.
3. Review the in-browser pass/fail output for the deterministic spin simulations.

## Configuration

Primary game configuration lives in `game-data.js`:

- `startingTokens`: initial credit balance, currently `3000`
- `defaultSpinCost`: default wager, currently `60`
- `minSpinCost` / `maxSpinCost`: wager bounds, currently `10` to `500`
- `autoSpinRange`: auto-play bounds and default, currently `1` to `30` with default `10`
- `variableRatioReward`: hidden spin window and reward multiplier table used by the classroom bonus schedule
- `symbols`: symbol labels, weights, payout multipliers, and the non-paying blank stop that reduces hit frequency
- `paylines`: the 10 fixed winning line definitions
- `states`: manual state-selection options shown in the consent modal
- `complianceReminder`: location disclaimer text reused across the game and paytable

Browser persistence keys are defined in `script.js` and `paytable.js`:

- `prompt-drop-consent-v1`: stores consent acceptance and location acknowledgement
- `prompt-drop-theme-v1`: stores the selected light/dark theme
- `prompt-drop-daily-reward-v1`: stores the latest rewarded local date, streak count, and bonus amount
- `prompt-drop-variable-reward-v1`: stores the hidden progress for the classroom variable-ratio reward schedule
- `prompt-drop-player-profile-v1`: stores the player name, selected icon, and purchased icons
- `prompt-drop-wallet-v1`: stores the shared credit balance used by the game and profile icon shop

If you want to rebalance gameplay or change defaults, update `game-data.js`. If you want to change storage behavior or consent/theme handling, update `script.js` and `paytable.js`.
