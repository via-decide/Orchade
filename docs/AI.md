# AI

NPC AI follows a reusable pipeline: Sensors -> Stimulus Filtering -> Memory Update -> Need Update -> Goal Evaluation -> Utility -> GOAP Planner -> Behavior Tree -> Action Execution -> Feedback.

## Components

- Memory stores ticked records with strength.
- Perception stores vision and hearing stimuli.
- Blackboard binds behavior tree state.
- Utility scoring chooses between competing goals.
- GOAP planner searches available actions by preconditions, effects, and cost.
- Behavior trees provide selectors, sequences, conditions, cooldown decorators, and interrupts.
