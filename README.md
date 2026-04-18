# Gem Sorter - Robotic Arm Challenge

A kids' educational game where players program a robotic arm to sort colorful gems using drag-and-drop code blocks.

## How to Play

1. **Drag blocks** from the TOOLBOX into the PROGRAM area
2. **Start with REPEAT** so the arm keeps sorting continuously
3. **Add IF blocks** inside REPEAT to check gem colors or shapes
4. **Add PICK and PLACE** inside IF to sort matched gems into the correct bin
5. **Click RUN** and watch your program work!

### Example Program

```
REPEAT Forever
  IF gem is Red
    PICK gem
    PLACE in Slot 1
  IF gem is Blue
    PICK gem
    PLACE in Slot 2
```

## 10 Levels

| Level | Challenge | Theme |
|-------|-----------|-------|
| 1-2 | Sort by color (1-2 bins) | Forest, Beach |
| 3-4 | More colors (3-4 bins) | Candy, Space |
| 5-6 | Sort by shape | Ocean, Jungle |
| 7-8 | Sort by color AND shape | Volcano, Arctic |
| 9-10 | All criteria, max speed | Desert, Crystal |

Each level has a unique visual theme. Gem shapes are randomized per playthrough for variety.

## Running

No build tools needed. Just serve the files:

```bash
python3 -m http.server 8080
```

Open http://localhost:8080

## Running Tests

```bash
# Full suite (158 tests, ~200ms)
./tests/run-tests.sh

# Single file
node --test --test-reporter=spec tests/program-runner.test.js
```

## Architecture

```
sort_program/
  index.html              Entry point
  css/
    main.css              Layout and UI
    blocks.css            Scratch-style block styling
    themes.css            Per-level color themes (10 themes)
  js/
    main.js               App bootstrap
    engine/
      GameEngine.js       Game loop and state machine
      Renderer.js         Canvas drawing
    game/
      Gem.js              Gem model (color, shape, state)
      Slot.js             Sorting bin with acceptance criteria
      Conveyor.js         Belt movement and gem spawning
      RoboticArm.js       2-segment articulated arm with IK
    blocks/
      BlockDefinitions.js Block type registry
      BlockWorkspace.js   Drag-and-drop programming UI
      ProgramRunner.js    Block program interpreter
    levels/
      levels.js           10 level configurations (data-driven)
      LevelManager.js     Level loading, star scoring, randomization
    ui/
      HUD.js              Score and star display
      Modal.js            Level intro, win/lose, tutorial dialogs
  tests/                  158 unit tests (Node.js node:test)
```

## Tech Stack

- Vanilla HTML/CSS/JavaScript (ES6 modules)
- HTML5 Canvas for game rendering
- HTML DOM for block programming workspace
- No frameworks, no build tools, no dependencies
- Tests use Node.js built-in `node:test` (zero dependencies)

## Key Design Decisions

- **Articulated arm with inverse kinematics** for natural excavator-like motion
- **Data-driven levels** — adding a level = adding a config object
- **Coroutine-style program execution** — one instruction per frame when blocking
- **Runtime shape/color randomization** — levels feel fresh on every playthrough
- **DOM for blocks, Canvas for game** — best tool for each job
