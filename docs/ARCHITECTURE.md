# useGame Composable Architecture

## Overview

The `useGame` composable manages the core game state and orchestrates specialized sub-modules for different concerns. This document describes the refactored architecture.

## Module Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                           useGame.ts                                  │
│                         (204 lines)                                  │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ useGameState│  │useGameStorage│ │useCausalGraph│ │socialNetwork│ │
│  │   (state)   │  │  (slots)    │  │(action graph)│ │  (engine)  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
└─────────┼─────────────────┼────────────────┼───────────────┼────────┘
          │                 │                │               │
          ▼                 ▼                ▼               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Composed in useGame()                           │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Sub-Module Composables                           │
├──────────────┬──────────────┬──────────────┬─────────────────────────┤
│ useGame      │ useEmotional │ useGame      │ useGame                │
│ Computed     │ Memory       │ Economy      │ Event                  │
│ (metrics)    │ Storage      │ Actions     │ Resolver               │
├──────────────┴──────────────┼──────────────┴─────────────────────────┤
│                             │                                        │
│                     useGameActionExecutor                             │
│                      (action orchestration)                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Module Responsibilities

### useGame.ts (204 lines)
- Central orchestrator
- UI state management (summary panel)
- Module composition
- Return API surface

### useGameComputed.ts
Computes derived game metrics:
- `totalDebt`: Current total debt with interest
- `creditLimit`: Available credit based on debt
- `minPayment`: Minimum payment required
- `accumulatedMinPayment`: Accumulated minimum payments
- `profileSnapshot`: Current social profile
- `profileDigest`: Profile hash for change detection
- `classPressureDigest`: Class tier pressure hash
- `remainingSlots`: Available action slots

### useEmotionalMemoryStorage.ts
Persistent session memory:
- `loadEmotionalMemory()`: Load from localStorage
- `saveEmotionalMemory()`: Persist to localStorage
- `recordCurrentSession()`: Track session state
- Session timing and anti-profile streak tracking

### useGameEconomyActions.ts
Financial operations:
- `borrow()`: Take on new debt
- `repay()`: Make debt payments
- Debt locking logic
- Transaction logging

### useGameEventResolver.ts
Event system:
- `resolveEvent()`: Process event option selections
- `applyEventEffects()`: Apply event consequences
- `randomPoolAfterAction()`: Trigger random events
- `computeHiddenContributions()`: Calculate hidden modifiers

### useGameActionExecutor.ts
Action orchestration:
- `act()`: Execute player actions
- Period/day advancement
- Contract triggers
- Action statistics

## Dependency Flow

```typescript
useGame()
├── useGameState()           // Core state
├── useGameStorage()         // Slot persistence
├── useCausalGraph()         // Action graph tracking
├── socialNetwork           // Social engine
│
├── useGameComputed(game)           // Metrics
├── useEmotionalMemoryStorage()     // Memory
├── useGameEconomyActions()         // Finances
├── useGameEventResolver()          // Events
│
└── useGameActionExecutor(..., recordGameAction)
    └── Coordinates all subsystems
```

## Design Decisions

### Separation of Concerns
Each module handles one domain:
- **Computed**: Read-only calculations
- **Storage**: Persistence concerns
- **Actions**: State mutations
- **Events**: Event system logic
- **Executor**: Action orchestration

### Dependency Injection
Modules receive dependencies as parameters rather than creating them internally, enabling:
- Easier testing with mocks
- Clear dependency contracts
- Better code organization

### Backward Compatibility
The `useGame()` return API remains unchanged after refactoring:
- All existing usages continue to work
- New modules are internal implementation details

## Testing Strategy

Each module has its own spec file:
- `useGameComputed.spec.ts`
- `useEmotionalMemoryStorage.spec.ts`
- `useGameEconomyActions.spec.ts`
- `useGameEventResolver.spec.ts`
- `useGameActionExecutor.spec.ts`

Total: 489 tests

## Migration History

| Phase | Module | Lines Removed | Date |
|-------|--------|---------------|------|
| 1 | useGameComputed | 55 | Phase 1 |
| 2 | useEmotionalMemoryStorage | 41 | Phase 2 |
| 3 | useGameEconomyActions | 96 | Phase 3 |
| 4 | useGameEventResolver | 252 | Phase 4 |
| 5 | useGameActionExecutor | 178 | Phase 5 |
| **Total** | | **622** | |
