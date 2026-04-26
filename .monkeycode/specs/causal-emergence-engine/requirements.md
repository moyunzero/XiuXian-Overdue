# Requirements Document: Causal Emergence Engine (CEE)

## Introduction

The Causal Emergence Engine (CEE) is a core architectural upgrade for "修仙欠费中" that transforms the game from a linear action-result simulator into a deep psychological-economic emergent system. It introduces cross-session emotional memory, causal graph visualization, emergent event generation, and NPC social networks to create unique, deeply personal gameplay experiences.

## Glossary

- **Emotional Memory Layer (EML)**: A hidden variable system that persists across game sessions, recording the player's key decision patterns and forming a "personality profile" that influences future gameplay.
- **Causal Graph**: A directed graph data structure representing actions as nodes and state changes as edges, enabling prediction and visualization of action consequences.
- **Emergent Event System (EES)**: A dynamic event generator that creates unique events based on current world state, player personality profile, and NPC relationships, rather than relying solely on static JSON configurations.
- **NPC Social Network**: A graph of non-player characters with hidden relationships, where player actions propagate influence and create butterfly effects.
- **Deduction Sandbox**: A UI component that allows players to input hypothetical actions and see predicted state change chains, with hidden variable effects represented as uncertainty intervals.
- **Personality Profile**: A persistent data structure summarizing the player's historical decision patterns across all game sessions.
- **Hidden Variables**: Game state variables that are not directly displayed in the UI but influence gameplay through subtle modifications to action outcomes, event probabilities, and narrative text.

## Requirements

### Requirement 1: Emotional Memory Layer

**User Story:** AS a returning player, I want my past decisions to subtly influence my current game, so that each character feels like a continuation of my previous selves rather than a blank slate.

#### Acceptance Criteria

1. WHEN a player completes a game session (either by reaching a narrative ending or manually exiting), the system SHALL persist key decision metrics to the Emotional Memory Layer.
2. WHEN a new game session begins, the system SHALL load the Emotional Memory Layer and apply its influence to the initial game state and event probabilities.
3. WHILE the Emotional Memory Layer is active, the system SHALL record the following decision patterns:
   - Frequency of borrowing actions relative to total actions
   - Ratio of study/tuna actions to parttime actions (score vs cash route preference)
   - Frequency and timing of body part repayments
   - Contract acceptance rate and compliance behavior
   - Rest action frequency relative to fatigue levels
   - Anti-profile action frequency
4. IF the Emotional Memory Layer exceeds a configurable size limit (default 50 sessions), the system SHALL retain only the most recent sessions, weighted by session duration and outcome diversity.
5. WHEN the Emotional Memory Layer influences gameplay, the system SHALL apply effects through hidden variables rather than direct UI-visible state changes.

### Requirement 2: Causal Graph Data Structure

**User Story:** AS a strategic player, I want to understand how my actions chain together to create long-term consequences, so that I can make more informed decisions.

#### Acceptance Criteria

1. WHEN any action is executed, the system SHALL record the action and its direct effects as nodes and edges in the Causal Graph.
2. WHILE the game is running, the system SHALL maintain the Causal Graph as a directed acyclic graph (DAG) where:
   - Nodes represent game states or actions
   - Edges represent causal relationships with weights indicating effect magnitude
   - Each edge includes a timestamp and effect type classification
3. WHEN a state change occurs that is influenced by a hidden variable, the system SHALL record the hidden variable's contribution as an attributed edge property.
4. IF the Causal Graph exceeds a maximum node count (default 1000), the system SHALL prune the oldest leaf nodes while preserving critical path nodes (nodes on paths to current state).
5. WHEN the Deduction Sandbox requests a prediction, the system SHALL traverse the Causal Graph to generate a forecasted state change chain.

### Requirement 3: Emergent Event System

**User Story:** AS an experienced player, I want events to feel unique and contextually appropriate to my current situation, rather than repetitive and predictable.

#### Acceptance Criteria

1. WHEN the event system needs to generate an event, the system SHALL first attempt to generate an emergent event using the Emergent Event Generator before falling back to static JSON events.
2. WHEN generating an emergent event, the system SHALL consider:
   - Current game state (stats, economy, school status)
   - Player personality profile from Emotional Memory Layer
   - Active NPC relationships and their current states
   - Recent causal chain history (last 7 days)
   - Hidden variable states (emotional residues, environmental factors)
3. WHEN an emergent event is generated, the system SHALL produce:
   - A unique event title and body text using template filling
   - Contextually appropriate options with effects derived from current state
   - A narrative tone that reflects the player's current psychological state
4. IF no suitable emergent event can be generated (template matching fails), the system SHALL fall back to the existing static event system without player-visible error.
5. WHEN an emergent event is triggered, the system SHALL record it in the event history with a flag indicating its emergent nature for analytics purposes.

### Requirement 4: NPC Social Network

**User Story:** AS a socially strategic player, I want my relationships with NPCs to matter and create ripple effects across the game world.

#### Acceptance Criteria

1. WHEN the game initializes, the system SHALL create a Social Network graph containing at minimum the following NPCs:
   - Homeroom Teacher
   - Cultivation Instructor
   - Debt Collector (institutional)
   - Black Market Merchant
   - Classmate (rival)
   - Classmate (ally)
2. WHILE the game runs, each NPC SHALL maintain hidden relationship states with other NPCs, including:
   - Affinity scores (-100 to 100)
   - Trust levels (0 to 100)
   - Shared secrets or grievances (boolean flags)
3. WHEN a player interacts with an NPC (through events or actions), the system SHALL propagate influence through the Social Network using a simplified diffusion model:
   - Direct interactions affect the target NPC's state
   - Changes propagate to connected NPCs with attenuation based on relationship strength
   - Propagation completes within 2 hops to prevent excessive computational cost
4. IF an NPC's state crosses certain thresholds, the system SHALL trigger emergent events reflecting the NPC's new attitude toward the player.
5. WHEN the Social Network influences an event or action outcome, the system SHALL apply the effect through hidden variables rather than direct UI-visible changes.

### Requirement 5: Deduction Sandbox

**User Story:** AS a planning-oriented player, I want to experiment with different action sequences without committing to them, so that I can optimize my strategy.

#### Acceptance Criteria

1. WHEN the player opens the Deduction Sandbox UI, the system SHALL display the current game state as the starting point.
2. WHEN the player adds a hypothetical action to the sandbox sequence, the system SHALL:
   - Simulate the action's immediate effects using the Causal Graph
   - Display predicted state changes with numerical values
   - Show uncertainty intervals for predictions influenced by hidden variables
   - Update the forecasted chain in real-time
3. WHILE the sandbox contains a sequence of actions, the system SHALL display:
   - A timeline view of predicted state changes
   - Key risk indicators (debt trajectory, fatigue accumulation, exam score forecast)
   - Potential emergent event triggers based on predicted states
4. IF the player chooses to commit the sandbox sequence, the system SHALL execute the actions in order as if the player had manually selected them.
5. IF the player closes the sandbox without committing, the system SHALL discard all sandbox state without affecting the actual game state.

### Requirement 6: Hidden Variable System

**User Story:** AS a curious player, I want to discover subtle patterns in how the game responds to my choices, creating a sense of mystery and depth.

#### Acceptance Criteria

1. WHEN the game initializes, the system SHALL create the following categories of hidden variables:
   - Emotional Residues: lingering effects from past decisions (e.g., "borrow trauma", "compliance fatigue")
   - Environmental Factors: world state not directly tied to player (e.g., "market saturation", "institutional scrutiny level")
   - NPC Attitudes: aggregated opinions of NPCs toward player
   - Narrative Momentum: story direction bias based on historical choices
2. WHILE the game runs, hidden variables SHALL influence gameplay through the following mechanisms:
   - Action outcome modifiers (±5-15% range, applied multiplicatively)
   - Event probability shifts (±10-30% relative change)
   - Narrative text variations (template selection based on variable states)
   - Unlock/lock conditions for specific event chains
3. WHEN a hidden variable changes, the system SHALL NOT display the change directly in the UI.
4. IF a hidden variable reaches an extreme threshold, the system SHALL provide subtle hints through:
   - Log entry text variations
   - NPC dialogue tone shifts
   - Environmental description changes
5. WHEN the player views their Personality Profile summary, the system SHALL reveal aggregated information about dominant hidden variable patterns without exposing exact numerical values.

### Requirement 7: Cross-Session Persistence

**User Story:** AS a dedicated player, I want my Emotional Memory Layer and Personality Profile to persist across devices and browser sessions.

#### Acceptance Criteria

1. WHEN the Emotional Memory Layer is updated, the system SHALL persist it to localStorage using the existing save system infrastructure.
2. WHEN the player exports their game data, the system SHALL include the Emotional Memory Layer in the export.
3. WHEN the player imports game data, the system SHALL merge the imported Emotional Memory Layer with the existing local data using a conflict resolution strategy (newest wins for overlapping sessions).
4. IF localStorage is unavailable or full, the system SHALL gracefully degrade by keeping the Emotional Memory Layer in memory for the current session only.
5. WHEN the Emotional Memory Layer reaches the maximum session count, the system SHALL prune oldest sessions using a weighted scoring function that considers session duration, outcome diversity, and recency.

## Non-Functional Requirements

1. Performance: The Causal Graph traversal for sandbox predictions SHALL complete within 100ms for sequences up to 21 actions (7 days × 3 slots).
2. Performance: The Social Network influence propagation SHALL complete within 50ms per propagation event.
3. Compatibility: All new systems SHALL integrate with the existing `useGame` composable and `gameEngine.ts` logic without breaking existing save files.
4. Maintainability: The Emergent Event Generator SHALL use a template system that allows non-programmers to contribute new event templates through JSON configuration.
5. Testability: Hidden variable effects SHALL be deterministic given the same seed and initial state, enabling reproducible test cases.
