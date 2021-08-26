# `<analog-clock>`

A Custom Element for an analog clock.

## Attributes

- `mode` (`string`): `stopwatch` or `clock`.
- `size` (`number`): Width and height in pixel.
- `marks` (`number`): Number of markings on the edge of the clock for telling the time.
- `ticks` (`boolean`): Whether to display the hour numbers on the dial.

## Shadow Parts

- `::part(tick)`: The numbers on the dial.
- `::part(tick)`: The numbers on the dial.
- `::part(tick1)`...`::part(tick12)`: Each of the nubmers on the dial.
- `::part(clock)`: The clock face.
- `::part(marks)`: The markings on the edge of the clock.
- `::part(hand-hour)`: The hour hand.
- `::part(hand-minute)`: The minute hand.
- `::part(hand-second)`: The second hand.

## Methods

- `analogClock.mode = 'clock'/'stopwatch'` switches mode between clock and stopwatch.
- `analogClock.toggleStopwatch()` starts and stops the stop watch.
- `analogClock.resetStopwatch()` resets stopwatch to 0.
- `analogClock.getTimeElapsed()` get time elapsed in `ms`.

## Known issues

In Safari, quickly switching between mode might result in janky animation. Related bug reports:

- https://bugs.webkit.org/show_bug.cgi?id=191265
- https://bugs.webkit.org/show_bug.cgi?id=201736
- https://bugs.webkit.org/show_bug.cgi?id=229437
