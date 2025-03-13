# Customizable Event Keywords Feature

## Overview
The Customizable Event Keywords feature allows you to customize how calendar events are imported into Roam based on keywords in the event title. This makes it possible to create different templates for different types of meetings.

## Current Implementation (Phase 1)
Phase 1 of this feature is now complete, which includes:

1. Default keyword settings that maintain backward compatibility with the existing system
2. Helper functions for accessing and managing keywords
3. Refactored template generation to use custom keywords
4. Debug logging to verify the system is working correctly

## How It Works

Events are matched against keywords in the following priority order:
1. The system looks for specific keywords in the event title (e.g., "1:1", "dinner")
2. If a match is found, it uses the corresponding template
3. If no match is found, it falls back to the default template (currently "Call")

Each keyword has these properties:
- `term`: The text to look for in the event title
- `requiresMultipleAttendees`: Whether this template requires multiple attendees
- `template`: The template string to use, with `{attendees}` as a placeholder
- `priority`: Determines which keyword takes precedence when multiple keywords match
- `isDefault`: Flag for the default template when no keywords match

## Testing Phase 1

There are two ways to test the keyword matching functionality:

### Method 1: Using the Command Palette
The easiest way to test is using the new command palette feature:

1. Open the Command Palette (Ctrl+P or Cmd+P)
2. Search for "Roam CRM - Test Calendar Template Matching"
3. Select it to run a test sync
4. Check the browser console for detailed logs about keyword matching

This method:
- Runs in test mode (doesn't save any changes)
- Forces processing of all events
- Shows detailed logs for each keyword comparison
- Provides a success toast when complete

### Method 2: Manual Testing
If you prefer, you can still test manually:

1. Compile the extension with these changes
2. Enable Google Calendar sync in the extension settings
3. Monitor the browser console during calendar sync
4. Look for logging messages that show keyword matching results

### Expected Behavior
- Events with "1:1" in the title should use the "[[1:1]] with..." template
- Events with "dinner" in the title should use the "[[Dinner]] with..." template
- All other events with multiple attendees should use the "[[Call]] with..." template
- The "about {event title}" portion should be included based on the "include-event-title" setting

### Example Console Output
```
Event template match: {
  eventSummary: "1:1 Meeting with Team",
  matchedKeyword: "1:1",
  generatedHeader: "[[1:1]] with [[Jane Smith]] and [[John Doe]]"
}
```

## Future Enhancements (Phase 2)
In the next phase, we'll add a user interface to allow customizing these keywords directly in the extension settings panel.

## Technical Notes
- The system uses a priority-based matching system, with lower numbers having higher priority
- Default templates have high priority numbers (e.g., 999) so specific matches take precedence
- The code is designed to be fully backward compatible with existing event data
- String comparison is case-insensitive and includes robust error handling
- Detailed debug logging helps diagnose any matching issues

### Troubleshooting
If events aren't matching the expected templates, check the browser console for:
- "Loaded event keywords:" - Shows all available keywords
- "Checking keyword match:" - Shows each comparison attempt
- "Event template match:" - Shows the final result

These logs will help identify if there are issues with keyword configuration or string matching.
