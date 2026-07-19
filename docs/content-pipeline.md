# Content Pipeline

All crops, NPCs, quests, items, recipes, dialogue, events, achievements, and world objects should be authored as versioned data with JSON Schema validation, stable IDs, localization keys, preview thumbnails, balance tags, and test fixtures. Non-programmer workflow: edit spreadsheet/form -> export JSON -> validate schema -> run content tests -> preview in editor/storybook -> submit PR -> CI checks IDs, references, economy impact, localization, and save compatibility. Add registries that load content by type and expose read-only definitions to gameplay capsules.
