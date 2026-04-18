# Team Grouping App - Specification

## Concept & Vision

A playful yet functional sports team randomization app that takes the hassle out of forming balanced teams for mixed-gender sports. The experience should feel like a digital dice roll at a game night — quick, fair, and a little bit exciting. The app brings order to chaos: paste your participants, configure your game, and watch teams materialize with satisfying animations.

The aesthetic is **arcade-meets-sports-club** — bold typography, energetic colors, and tactile feedback that makes team assignments feel like an event rather than a chore.

## Design Language

### Aesthetic Direction
Retro sports scoreboard meets modern app design. Think tennis scoreboards, cricket scorecards, and basketball stats — but with a fresh, digital twist. Clean data presentation with personality.

### Color Palette
```css
--bg-primary: #1a1d29;        /* Deep navy background */
--bg-secondary: #242938;      /* Card backgrounds */
--bg-tertiary: #2d3342;       /* Input backgrounds */
--text-primary: #f4f5f7;      /* Primary text */
--text-secondary: #9ca3af;    /* Secondary text */
--text-muted: #6b7280;        /* Muted text */
--accent-green: #22c55e;      /* Success, team A */
--accent-blue: #3b82f6;       /* Team B */
--accent-orange: #f59e0b;     /* Highlights, warnings */
--accent-purple: #a855f7;     /* Leaderboard accents */
--border: #374151;            /* Borders */
--error: #ef4444;             /* Error states */
```

### Typography
- **Headings**: `'Space Grotesk', sans-serif` — Bold, geometric, sporty
- **Body/Data**: `'Inter', sans-serif` — Clean readability for scores and names
- **Monospace accents**: `'JetBrains Mono', monospace` — For numbers and stats

### Spatial System
- Base unit: 4px
- Component padding: 16px (4 units)
- Section gaps: 32px (8 units)
- Border radius: 8px (cards), 6px (inputs), 4px (buttons)

### Motion Philosophy
- **Team reveal**: Staggered fade-in with slight scale (0.95→1) over 300ms, 50ms delay between teams
- **Score updates**: Number counter animation for points
- **State changes**: 150ms ease-out transitions
- **Shuffle animation**: When regenerating teams, brief 200ms shuffle effect

## Layout & Structure

### Page Structure
```
┌─────────────────────────────────────────────────────────┐
│  Header: App Title + Sport Category Badge              │
├─────────────────────────────────────────────────────────┤
│  Configuration Panel (collapsible after generation)    │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Participants Textarea                           │    │
│  │ [Format help tooltip]                           │    │
│  ├─────────────────────────────────────────────────┤    │
│  │ Settings Row: [Courts ▼] [Team Size ▼]          │    │
│  └─────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│  [Generate Teams] Button (primary CTA)                  │
├─────────────────────────────────────────────────────────┤
│  Schedule Display (appears after generation)            │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Round 1                          Court 1        │    │
│  │ Team A: mark & alice             vs             │    │
│  │ Team B: bob & sinta              [Score: __]   │    │
│  ├─────────────────────────────────────────────────┤    │
│  │ Round 2                          Court 2        │    │
│  │ ...                                               │
│  └─────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│  Leaderboard Panel                                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │ #  Player    W  L  Pts                          │    │
│  │ 1  mark      2  0  6                            │    │
│  │ 2  alice     2  0  6                            │    │
│  │ ...                                             │    │
│  └─────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│  [Print Schedule] [Reset] [New Teams]                   │
└─────────────────────────────────────────────────────────┘
```

### Responsive Strategy
- Desktop (>1024px): Two-column layout for schedule cards
- Tablet (768-1024px): Single column, larger touch targets
- Mobile (<768px): Stacked layout, full-width inputs

## Features & Interactions

### 1. Participant Input
**Behavior:**
- Textarea accepts multi-line or single-line participant list
- Format: `1. name(gender)` where gender is `m` or `f`
- Supports variations: `1. Mark (M)`, `2. bob(f)`, `3. alice F`
- Case-insensitive gender parsing
- Auto-strips leading numbers and extra whitespace

**Edge Cases:**
- Empty input → Show error: "Please enter at least 2 participants"
- Single participant → Show error: "Need at least 2 participants for teams"
- Invalid format lines → Skip with warning toast
- Odd number → Auto-add "Mr. Z" or "Ms. Z" based on gender balance

**Odd Participant Handling:**
- If majority male (>50%), add "Ms. Z" (female)
- If majority female, add "Mr. Z" (male)
- If equal, randomly choose
- Show notification: "Added placeholder player to balance teams"

### 2. Configuration Settings

**Courts:**
- Dropdown: 1 or 2 courts
- Default: 1
- Affects how many matches per round

**Team Size:**
- Dropdown: Single (1v1) or Double (2v2)
- Default: Double
- Single = 1 player per team
- Double = 2 players per team

**Sports Category:**
- Text input with autocomplete suggestions: Tennis, Padel, Badminton, Squash, Pickleball
- Default: Tennis
- Displayed in header badge

### 3. Team Generation Algorithm

**Balancing Logic:**
1. Separate players by gender
2. Group into teams ensuring mixed gender when possible
3. Randomly shuffle within groups
4. Pair players: strongest female with weakest male, etc.
5. For round-robin: rotate partners each round

**Round Generation:**
- Calculate total rounds needed for everyone to play with everyone
- Formula: (n-1) × 2 for doubles (each pair plays with each partner once)
- Ensure no player sits out (use bye system or filler matches)

### 4. Score Entry

**Interaction:**
- Click on match score area to expand inline score form
- Input format: Team A Score - Team B Score
- Validation: Positive integers only
- Updates immediately on blur or Enter key

**Visual Feedback:**
- Winning team highlighted with green border
- Losing team with subtle red tint
- Tie: Both highlighted with orange

### 5. Leaderboard

**Calculation:**
- Win = 3 points
- Loss = 0 points
- Tie/Draw = 1 point each
- Players earn points based on their team's result

**Display:**
- Sorted by: Points (desc), then Wins (desc), then alphabetically
- Shows: Rank, Name, Wins, Losses, Points
- Player count badge matches total participants

### 6. Print Functionality

**Behavior:**
- Opens print-optimized view
- Removes interactive elements
- Shows: Date, Sport, All rounds, All scores, Final leaderboard
- Page breaks between sections
- Black/white friendly (uses patterns/position instead of colors)

### 7. Reset & Regenerate

**Reset:**
- Clears all scores
- Keeps configuration
- Shows confirmation modal

**New Teams:**
- Re-randomizes all team assignments
- Clears scores
- Shows brief shuffle animation

## Component Inventory

### InputSection
- **States**: Default, Focused, Error, Success
- **Validation**: Real-time format checking
- **Helper text**: Collapsible format guide

### SelectField
- **States**: Default, Open, Disabled, Selected
- **Hover**: Background lighten
- **Focus**: Ring outline

### Button
- **Variants**: Primary (green), Secondary (gray), Danger (red)
- **States**: Default, Hover (scale 1.02), Active (scale 0.98), Disabled (opacity 0.5), Loading (spinner)
- **Sizes**: Small, Medium, Large

### TeamCard
- **States**: Default, With Winner, With Tie
- **Shows**: Team players, vs separator, score input
- **Animation**: Slide-in on generation

### LeaderboardRow
- **States**: Default, Highlighted (top 3 with gold/silver/bronze)
- **Hover**: Subtle background highlight
- **Shows**: Rank medal, name, W-L record, points

### Toast/Notification
- **Variants**: Info, Success, Warning, Error
- **Animation**: Slide in from top-right, auto-dismiss after 4s
- **Dismiss**: Click X or swipe

### Modal
- **Overlay**: Semi-transparent backdrop with blur
- **Animation**: Fade + scale in
- **Close**: Click outside, X button, or Escape key

### PrintView
- **Layout**: Optimized for A4/Letter
- **Content**: Header, rounds grid, leaderboard table
- **Styling**: `@media print` rules

## Technical Approach

### Stack
- **Framework**: React 19 with TypeScript
- **Build**: Vite
- **Styling**: CSS Modules or vanilla CSS with CSS variables
- **State**: React useState/useReducer (no external state management needed)
- **Testing**: Vitest + React Testing Library

### Architecture

```
src/
├── components/
│   ├── Header/
│   ├── InputSection/
│   ├── ConfigPanel/
│   ├── Schedule/
│   │   ├── RoundCard.tsx
│   │   └── MatchCard.tsx
│   ├── Leaderboard/
│   ├── Button/
│   ├── Select/
│   ├── Toast/
│   └── Modal/
├── hooks/
│   ├── useParticipants.ts
│   ├── useTeamGenerator.ts
│   └── useLeaderboard.ts
├── utils/
│   ├── parser.ts          # Parse participant string
│   ├── teamGenerator.ts   # Team assignment logic
│   ├── roundRobin.ts      # Round scheduling algorithm
│   └── scoring.ts         # Score/points calculations
├── types/
│   └── index.ts           # TypeScript interfaces
├── styles/
│   └── variables.css      # CSS custom properties
├── App.tsx
├── App.css
└── main.tsx
```

### Data Models

```typescript
interface Player {
  id: string;
  name: string;
  gender: 'm' | 'f';
  isPlaceholder: boolean; // true for "Mr. Z" / "Ms. Z"
}

interface Team {
  id: string;
  players: Player[]; // 1 for singles, 2 for doubles
}

interface Match {
  id: string;
  round: number;
  court: number;
  teamA: Team;
  teamB: Team;
  scoreA: number | null;
  scoreB: number | null;
  winner: 'A' | 'B' | 'draw' | null;
}

interface GameState {
  sport: string;
  courts: 1 | 2;
  teamSize: 'single' | 'double';
  participants: Player[];
  matches: Match[];
  isGenerated: boolean;
}
```

### Key Algorithms

**1. Participant Parser**
```typescript
// Regex: /(\d+)\.\s*([a-zA-Z]+)\s*[\(\[]?\s*([mf])\s*[\)\]]?/gi
// Handles: "1. Mark (M)", "2. bob(f)", "3. Alice F", "4. sinta"
```

**2. Round-Robin Scheduling**
- Use circle method for even distribution
- Each player partners with each teammate once
- Rotate positions each round

**3. Gender Balancing**
- Prioritize mixed-gender teams
- If odd player, add opposite-gender placeholder
- Track placeholder status separately (exclude from rankings if desired)

### Testing Strategy

**Unit Tests:**
- `parser.test.ts`: Valid formats, invalid formats, edge cases
- `teamGenerator.test.ts`: Distribution, gender balance, randomization
- `roundRobin.test.ts`: Coverage, no duplicates, correct count
- `scoring.test.ts`: Points calculation, tie handling

**Component Tests:**
- InputSection: Format validation, error display
- MatchCard: Score input, winner highlighting
- Leaderboard: Sort order, point totals

**Integration Tests:**
- Full flow: Input → Generate → Score → Leaderboard
- Print view renders correctly
- Reset clears state properly

**E2E Tests (optional):**
- Full user journey with Playwright

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge - last 2 versions)
- No IE11 support needed
