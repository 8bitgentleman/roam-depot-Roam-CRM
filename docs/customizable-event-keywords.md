# Customizable Event Keywords Feature

## Overview
The Customizable Event Keywords feature allows you to customize how calendar events are imported into Roam based on keywords in the event title. This makes it possible to create different templates for different types of meetings.

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

## Using the Settings UI

To customize your event keywords:

1. Open the Roam CRM settings panel
2. Scroll to the "Event Keywords Settings" section
3. Use the interface to:
   - View existing keywords and their templates
   - Add new keywords with custom templates
   - Edit existing keywords
   - Delete keywords you no longer need
   - Reset to default keywords if needed

### Adding a Keyword

1. Click the "Add Keyword" button
2. Enter the keyword term to match in event titles
3. Create a template with the `{attendees}` placeholder
4. Set priority (lower numbers take precedence)
5. Choose whether multiple attendees are required
6. Optionally mark as the default template
7. Click "Add" to save

### Important Template Guidelines

- Templates must include the `{attendees}` placeholder
- Default templates (with empty term) are used when no other keywords match
- The system ensures there's always one default template
- Keyword matching is case-insensitive

## Testing the Feature

There are two ways to test the keyword matching functionality:

### Method 1: Using the Command Palette
The easiest way to test is using the command palette:

1. Open the Command Palette (Ctrl+P or Cmd+P)
2. Search for "Roam CRM - Test Calendar Template Matching"
3. Select it to run a test sync
4. Check the browser console for detailed logs about keyword matching

This method:
- Runs in test mode (doesn't save any changes)
- Forces processing of all events
- Shows detailed logs for each keyword comparison

### Method 2: Manual Testing
If you prefer, you can still test manually:

1. Enable the "Testing Mode" switch in settings
2. Enable Google Calendar sync
3. Monitor the browser console during calendar sync
4. Look for logging messages that show keyword matching results

### Example Console Output
```
Event template match: {
  eventSummary: "1:1 Meeting with Team",
  matchedKeyword: "1:1",
  generatedHeader: "[[1:1]] with [[Jane Smith]] and [[John Doe]]"
}
```

## Troubleshooting
If events aren't matching the expected templates, check the browser console for:
- "Loaded event keywords:" - Shows all available keywords
- "Checking keyword match:" - Shows each comparison attempt
- "Event template match:" - Shows the final result

These logs will help identify if there are issues with keyword configuration or string matching.
