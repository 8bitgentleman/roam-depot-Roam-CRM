import createBlock from "roamjs-components/writes/createBlock"
import updateBlock from "roamjs-components/writes/updateBlock"
import { showToast } from "./components/toast"
import { getExtensionAPISetting, getPageUID, getSmartblockWorkflows } from "./utils"

function extractEmailFromString(text) {
    // Regular expression for matching an email address
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/

    // Using match() to find the email in the text
    const found = text.match(emailRegex)

    // If an email is found, return it; otherwise, return null or an appropriate message
    return found ? found[0] : null
}

// Enhanced event fingerprinting for backup identification
function createEventFingerprint(event) {
    const date = event.start?.dateTime || event.start?.date || '';
    const summary = (event.summary || '').replace(/\|/g, '~'); // Sanitize pipe characters
    const organizer = (event.organizer?.email || '').replace(/\|/g, '~');
    const eventId = (event.id || '').substring(0, 8); // First 8 chars of ID for extra matching

    const fingerprint = `${date}|${summary}|${organizer}|${eventId}`.toLowerCase().trim();

    // Warn about potential collisions for debugging
    if (fingerprint.length < 10) {
        console.warn('Short event fingerprint generated:', fingerprint, 'for event:', event.summary);
    }

    return fingerprint;
}

// Backwards-compatible date parsing for stored events
function parseStoredEventDate(dateString) {
    if (!dateString) return null;

    try {
        // If it already has time info, use as-is
        if (dateString.includes('T') || dateString.includes(' ')) {
            return new Date(dateString);
        }

        // For all-day events stored as date-only strings like "2024-06-19"
        // Parse explicitly to avoid timezone issues
        const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
        if (year && month && day) {
            // Create date at midnight UTC to prevent timezone shifts
            return new Date(Date.UTC(year, month - 1, day));
        }

        // Fallback to standard parsing
        return new Date(dateString);
    } catch (error) {
        console.error('Error parsing stored event date:', dateString, error);
        return null;
    }
}

function findPersonByEmail(people, email) {
    const emailLower = email.toLowerCase() // Convert the search email to lowercase

    const result = people.filter((item) =>
        item.Email.some(
            (emailItem) => emailItem.string.toLowerCase().includes(emailLower), // Convert each email item to lowercase before comparison
        ),
    )

    return result
}

function findPersonNameByEmail(people, email) {
    const normalizedEmail = email.toLowerCase() // Normalize the input email to lower case

    const result = people
        .filter((item) =>
            item.Email.some((emailItem) =>
                emailItem.string.toLowerCase().includes(normalizedEmail),
            ),
        ) // Compare in lower case
        .map((item) => item.title)
    return result
}

function checkStringForSubstring(summary, substring) {
    // Improved function to handle edge cases better
    // Empty keyword always returns false (should use isDefault flag instead)
    if (substring === "") {
        console.warn('Empty substring - will not match any summary');
        return false;
    }

    // Null/undefined check
    if (summary == null || substring == null) {
        console.warn('Null or undefined values detected:', { summary, substring });
        return false;
    }

    try {
        // Convert both to lowercase for case-insensitive comparison
        // Use String() constructor to handle non-string types
        const normalizedSummary = String(summary).toLowerCase().trim();
        const normalizedSubstring = String(substring).toLowerCase().trim();

        // Check if the summary includes the substring
        const result = normalizedSummary.includes(normalizedSubstring);

        return result;
    } catch (error) {
        console.error('Error in string comparison:', error);
        return false;
    }
}

// Default keyword settings for event templates
const DEFAULT_EVENT_KEYWORDS = [
    {
        term: "1:1",
        requiresMultipleAttendees: true,
        template: "[[1:1]] with {attendees}",
        priority: 1
    },
    {
        term: "dinner",
        requiresMultipleAttendees: true,
        template: "[[Dinner]] with {attendees}",
        priority: 2
    },
    {
        term: "", // Empty term means this is the fallback/default
        requiresMultipleAttendees: true,
        template: "[[Call]] with {attendees}",
        priority: 999,
        isDefault: true
    }
];

// Helper to get keywords with backwards compatibility
function getEventKeywords(extensionAPI) {
    // Direct check of raw setting value
    const directValue = extensionAPI.settings.get("event-keywords");
    console.log('getEventKeywords - raw value:', directValue);

    // Use default if no saved settings
    if (!directValue) {
        console.warn('No saved keywords found, using defaults');
        console.warn('DEFAULT_EVENT_KEYWORDS:', DEFAULT_EVENT_KEYWORDS);
        return DEFAULT_EVENT_KEYWORDS;
    }

    // Check if any keywords have requiresMultipleAttendees=false
    const singlePersonKeywords = directValue.filter(k => !k.requiresMultipleAttendees);
    console.log('Single-person keywords found:', singlePersonKeywords.length);
    if (singlePersonKeywords.length > 0) {
        singlePersonKeywords.forEach(k =>
            console.log(`- Keyword "${k.term || '(default)'}" can match single-person events`)
        );
    } else {
        console.warn('WARNING: No keywords configured for single-person events');
    }

    return directValue;
}

// Helper to format a template with attendee names and optional title
function formatTemplate(template, attendeeNames, eventSummary, includeEventTitle) {
    let result = template;

    // Only replace {attendees} if it exists in the template
    if (template.includes("{attendees}")) {
        result = template.replace("{attendees}", attendeeNames.join(" and "));
    }

    if (includeEventTitle && eventSummary) {
        result += ` about ${eventSummary}`;
    }

    return result;
}

const compareLists = (list1, list2) => {
    if (list1.length !== list2.length) {
        return false
    }

    const sortedList1 = list1.slice().sort()
    const sortedList2 = list2.slice().sort()

    for (let i = 0; i < sortedList1.length; i++) {
        if (sortedList1[i] !== sortedList2[i]) {
            return false
        }
    }

    return true
}

function convertEventDateFormats(start) {
    // sometimes an event start time is an actual time
    // and sometimes it's a date (all day events)

    let date

    if (start.dateTime) {
        // Case where start has a dateTime property
        date = new Date(start.dateTime)
    } else if (start.date) {
        // Parse the date string 2024-06-19 ignoring the JS timezone offset
        let offsetdate = new Date(start.date)
        let userTimezoneOffset = offsetdate.getTimezoneOffset() * 60000
        date = new Date(offsetdate.getTime() + userTimezoneOffset)
    } else {
        throw new Error("Invalid start object: missing dateTime or date property")
    }

    return date
}

// MARK: check for empty call template
export function isEmptyCallTemplate(blockUid, storedEvent) {
    try {
        
        // If this is from a SmartBlock template, we should be more cautious
        if (storedEvent && storedEvent.useSmartblock && storedEvent.smartblockUid) {
            console.log('Event was created with a SmartBlock template - preventing automatic deletion');
            return { result: false, reason: "SmartBlock templates are preserved by default" };
        }
        
        // Get the block and its children
        const blockData = window.roamAlphaAPI.data.pull(
            "[:block/string :block/children {:block/children ...}]",
            [":block/uid", blockUid]
        );
        
        // Safety check for missing data
        if (!blockData) {
            console.warn(`CHECK 1 FAILED: No block data found for UID: ${blockUid}`);
            return { result: false, reason: "No block data found" };
        }

        // Check if this is a call block - we'll use a more flexible approach here
        // to support custom templates
        const blockString = blockData[":block/string"] || "";
        if (storedEvent && (storedEvent.templateType || storedEvent.templateString)) {

        } else {
            // Fallback for backward compatibility with old stored events
            if (!blockString.includes("[[Call]]") && 
                !blockString.includes("[[1:1]]") && 
                !blockString.includes("[[Meeting]]") && 
                !blockString.includes("[[Dinner]]")) {
                console.warn(`CHECK 2 FAILED: Not a recognized event template. Block string: "${blockString}"`);
                return { result: false, reason: "Not a recognized event template" };
            }
        }

        // Find the Notes and Next Actions sections
        const children = blockData[":block/children"] || [];
        
        let notesBlock = null;
        let nextActionsBlock = null;
        let invalidBlocks = [];

        // Find the Notes and Next Actions blocks and validate other blocks
        for (const child of children) {
            if (!child || typeof child !== 'object') {
                console.warn('CHECK 3 FAILED: Invalid child block', child);
                invalidBlocks.push("Invalid child object");
                continue;
            }

            const childString = child[":block/string"] || "";
            
            if (childString.startsWith("Notes::")) {
                notesBlock = child;
            } else if (childString.startsWith("Next Actions::")) {
                nextActionsBlock = child;
            } else if (childString === "---" || childString.trim() === "---") {
                // Ignore separator blocks
            } else if (!childString.startsWith("Attachment::") && !childString.startsWith("Notion::")) {
                // Any non-template block means this isn't default
                console.warn(`CHECK 3 FAILED: Found non-template block: "${childString}"`);
                invalidBlocks.push(childString);
            }
        }

        // Check if both required sections exist
        if (!notesBlock) {
            console.warn('CHECK 4 FAILED: Notes block not found');
            return { result: false, reason: "Notes block not found" };
        }
        if (!nextActionsBlock) {
            console.warn('CHECK 4 FAILED: Next Actions block not found');
            return { result: false, reason: "Next Actions block not found" };
        }
        if (invalidBlocks.length > 0) {
            console.warn('CHECK 4 FAILED: Found invalid blocks:', invalidBlocks);
            return { result: false, reason: "Found non-template blocks: " + invalidBlocks.join(", ") };
        }

        // More robust empty bullet check for Notes
        const notesChildren = notesBlock[":block/children"] || [];

        const notesEmpty = isEmptyBulletList(notesChildren);
        if (!notesEmpty.result) {
            console.warn('CHECK 5 FAILED: Notes section is not an empty bullet list', notesEmpty.reason);
            return { result: false, reason: "Notes section is not empty: " + notesEmpty.reason };
        }

        // More robust empty bullet check for Next Actions
        const nextActionsChildren = nextActionsBlock[":block/children"] || [];

        const nextActionsEmpty = isEmptyBulletList(nextActionsChildren);
        if (!nextActionsEmpty.result) {
            console.warn('CHECK 6 FAILED: Next Actions section is not an empty bullet list', nextActionsEmpty.reason);
            return { result: false, reason: "Next Actions section is not empty: " + nextActionsEmpty.reason };
        }

        // If we got here, it's an empty call template
        return { result: true, reason: "All checks passed" };
    } catch (error) {
        console.error(`Error checking call template (${blockUid}):`, error);
        return { result: false, reason: "Error: " + error.message };
    }
}

// Helper function to check if a list contains only one empty bullet 
function isEmptyBulletList(children) {
    // Should have exactly one child
    if (children.length !== 1) {
        return { result: false, reason: `Expected 1 child, found ${children.length}` };
    }

    const child = children[0];
    // Child should exist and have an empty string
    if (!child || (child[":block/string"] || "").trim() !== "") {
        return { result: false, reason: "Child block has content" };
    }

    // Check if the child has any children itself (if it does, it's not a simple empty bullet)
    const grandchildren = child[":block/children"] || [];
    if (grandchildren.length > 0) {
        return { result: false, reason: "Child block has children" };
    }
    
    return { result: true, reason: "Empty bullet" };
}

// MARK: eventInfo
// Main function to sync Google Calendar events with Roam
// Fetches events for the next 7 days and creates/updates corresponding blocks in Roam
/**
 * Syncs Google Calendar events with Roam
 * 
 * @param {Array} people - Array of people objects from getAllPeople
 * @param {Object} extensionAPI - The Roam extension API
 * @param {boolean} testing - When true, runs in test mode (logs only, no data saved)
 *                          - Set to true by "Test Calendar Template Matching" command
 *                          - Set to false by "Sync Calendar" button in modal
 *                          - Otherwise uses the global testing variable
 * @param {boolean} isManualSync - When true, ignores cooldown period
 *                               - True for manual button clicks, false for automatic syncs
 * @param {string} triggerSource - Identifies what triggered the sync (for logging)
 * 
 * Note: Single-person events will only be processed if they match a keyword
 * with requiresMultipleAttendees=false, regardless of testing mode.
 */
export async function getEventInfo(people, extensionAPI, testing, isManualSync = false, triggerSource = 'unknown') {
    console.log(`getEventInfo called: testing=${testing}, isManualSync=${isManualSync}, triggerSource=${triggerSource}`);

    // Get previously stored calendar events from extension settings
    const storedEvents = getExtensionAPISetting(extensionAPI, "synced-cal-events", {})

    // Log detailed sync state for debugging
    console.log(`Calendar sync requested - Settings state:`, {
        syncInProgress: getExtensionAPISetting(extensionAPI, "sync-in-progress", false),
        lastSyncTime: new Date(getExtensionAPISetting(extensionAPI, "last-sync-time", 0)),
        syncStartTime: getExtensionAPISetting(extensionAPI, "sync-start-time", null) ? 
            new Date(getExtensionAPISetting(extensionAPI, "sync-start-time", 0)) : null,
        testingMode: testing,
        manualSync: isManualSync,
        triggerSource
    });

    // Check for stale sync flag (more than 10 minutes old)
    const currentSyncStarted = getExtensionAPISetting(extensionAPI, "sync-start-time", null);
    const now = Date.now();
    if (getExtensionAPISetting(extensionAPI, "sync-in-progress", false) && currentSyncStarted) {
        const syncDuration = now - currentSyncStarted;
        // If sync has been "in progress" for more than 10 minutes, it's likely stuck
        if (syncDuration > 10 * 60 * 1000) {
            console.warn(`Stale sync detected (running for ${Math.round(syncDuration/60000)} minutes). Resetting sync status.`);
            extensionAPI.settings.set("sync-in-progress", false);
        }
    }

    // Check if sync is in progress
    if (getExtensionAPISetting(extensionAPI, "sync-in-progress", false)) {
        console.error('Sync already in progress')
        return
    }

    // Check cooldown only for automatic syncs
    if (!isManualSync) {
        const lastSyncTime = extensionAPI.settings.get("last-sync-time")
        const SYNC_COOLDOWN = 60 * 60 * 1000 // 1 hour
        const now = Date.now()
        if (lastSyncTime && (now - lastSyncTime < SYNC_COOLDOWN)) {
            const hoursAgo = Math.round((now - lastSyncTime) / 3600000 * 10) / 10 // Round to 1 decimal
            console.warn(`Automatic sync skipped - last sync was ${hoursAgo} hours ago. Will sync after ${Math.round((SYNC_COOLDOWN - (now - lastSyncTime)) / 3600000 * 10) / 10} more hours.`)
            return
        }
    } 

    try {
        extensionAPI.settings.set("sync-in-progress", true)
        extensionAPI.settings.set("sync-start-time", Date.now())
        console.group(`Calendar Sync Start [${triggerSource}]:`, new Date().toISOString())

        // Track emails with auth issues and events that don't need updates
        let prevent_update = new Set()
        let no_update = new Set() //TODO add a toast if there are no updates
        let processed_events = new Set()

        // Calculate wider date range for calendar fetch (7 days ago to 7 days ahead)
        const today = new Date()
        const pastStartDate = new Date()
        pastStartDate.setDate(today.getDate() - 7)
        const futureEndDate = new Date()
        futureEndDate.setDate(today.getDate() + 7)

        // Convert dates to Roam page title format (e.g., "January 1st, 2024")
        const startDatePageTitle = window.roamAlphaAPI.util.dateToPageTitle(pastStartDate)
        const endDatePageTitle = window.roamAlphaAPI.util.dateToPageTitle(futureEndDate)
        // Fetch calendar events from Google Calendar
        const results = await window.roamjs.extension.google.fetchGoogleCalendar({
            startDatePageTitle: startDatePageTitle,
            endDatePageTitle: endDatePageTitle,
        })

        // Exit if no events or error message received
        if (!results || results[0]?.text === "No Events Scheduled for Selected Date(s)!") {
            console.warn('No events to process')
            console.groupEnd()
            return
        }

        // Log all received events for debugging
        console.log('=== ALL RECEIVED EVENTS DEBUG ===')
        console.log(`Total events received: ${results.length}`)
        
        // Group events by calendar for easier analysis
        const eventsByCalendar = {}
        results.forEach((result, index) => {
            const calendar = result.event?.calendar || 'unknown'
            const eventId = result.event?.id || 'no-id'
            const summary = result.event?.summary || 'no-summary'
            const organizer = result.event?.organizer?.email || 'no-organizer'
            
            if (!eventsByCalendar[calendar]) {
                eventsByCalendar[calendar] = []
            }
            
            eventsByCalendar[calendar].push({
                index,
                eventId,
                summary,
                organizer,
                attendeeCount: result.event?.attendees?.length || 0
            })
        })
        
        // Log summary by calendar
        Object.keys(eventsByCalendar).forEach(calendar => {
            console.log(`📅 Calendar: ${calendar} (${eventsByCalendar[calendar].length} events)`)
            eventsByCalendar[calendar].forEach(event => {
                console.log(`  - "${event.summary}" (ID: ${event.eventId}, Organizer: ${event.organizer}, Attendees: ${event.attendeeCount})`)
            })
        })
        console.log('=== END RECEIVED EVENTS DEBUG ===');

        // Build sets of current event IDs from the fetched events
        const allCurrentEventIds = new Set()
        const createUpdateEventIds = new Set()

        // First pass: categorize events and collect IDs
        for (const result of results) {
            const eventId = result.event?.id

            if (eventId) {
                allCurrentEventIds.add(eventId)

                // Check if event is in create/update window (today or future)
                if (result.event?.start) {
                    const eventStart = convertEventDateFormats(result.event.start)
                    const isCreateUpdateCandidate = eventStart >= today

                    if (isCreateUpdateCandidate) {
                        createUpdateEventIds.add(eventId)
                    }
                }
            }
        }

        // Initialize variables for deletion detection
        let deletedEventIds = [];

        // Only run deletion detection if enabled in settings
        if (getExtensionAPISetting(extensionAPI, "detect-deleted-events", false)) {
            console.group('=== DELETION DETECTION DEBUG ===');
            console.log('Fetch window:', { pastStartDate, futureEndDate });
            console.log('Total fetched events:', results.length);
            console.log('All current event IDs from Google:', Array.from(allCurrentEventIds))
            console.log('All stored events:', storedEvents)

            // Enhanced calendar-specific error tracking
            const calendarErrors = new Map();
            results.forEach(result => {
                if (result.text?.includes("Error for calendar") || result.text?.includes("Must log in")) {
                    const calendar = extractEmailFromString(result.text) || 'unknown-calendar';
                    calendarErrors.set(calendar, result.text);
                }
            });

            // Don't delete events from calendars with errors
            if (calendarErrors.size > 0) {
                console.warn('🚫 Calendars with authentication/access errors:', Array.from(calendarErrors.keys()));
                calendarErrors.forEach((error, calendar) => {
                    console.warn(`  - ${calendar}: ${error}`);
                });

                // Filter out events from problematic calendars before building current event IDs
                const safeEventIds = new Set();
                results.forEach(result => {
                    if (result.event?.id && !calendarErrors.has(result.event?.calendar)) {
                        safeEventIds.add(result.event.id);
                    }
                });

                // Replace allCurrentEventIds with safe event IDs only
                allCurrentEventIds.clear();
                safeEventIds.forEach(id => allCurrentEventIds.add(id));

                console.log('📧 Using filtered event IDs (excluding problematic calendars):', Array.from(allCurrentEventIds));
            }

            // Process each stored event with detailed logging
            // for debugging ponly
            console.group('Examining each stored event:')
            Object.keys(storedEvents).forEach(eventId => {
                console.group(`Event ID: ${eventId}`)

                // Check if in current calendar events
                const isInCurrentEvents = allCurrentEventIds.has(eventId)

                // Show the detailed checks we'll perform
                if (!storedEvents[eventId].event_start) {
                    console.warn('⚠️ Missing event_start data - will be skipped in detection')
                    console.groupEnd()
                    return; // This only exits the current iteration of forEach
                }

                // Check date window
                const eventStartDate = new Date(storedEvents[eventId].event_start)
                const isAllDay = storedEvents[eventId].event_start && !storedEvents[eventId].event_start.includes('T')

                const isAfterStartWindow = eventStartDate >= pastStartDate
                const isBeforeEndWindow = eventStartDate <= futureEndDate

                console.groupEnd()
            })
            console.groupEnd()

            // Enhanced deletion detection with event fingerprinting and ID reconciliation
            const deletionCandidates = [];
            const reconciledEvents = [];

            Object.keys(storedEvents).forEach(eventId => {
                const storedEvent = storedEvents[eventId];

                // Skip events without any start time info
                if (!storedEvent.event_start) {
                    console.log(`Event ${eventId} missing event_start - can't check for deletion`);
                    return;
                }

                try {
                    // Use improved date parsing
                    const eventStartDate = parseStoredEventDate(storedEvent.event_start);

                    // Ensure we got a valid date
                    if (!eventStartDate || isNaN(eventStartDate.getTime())) {
                        console.warn(`Event ${eventId} has invalid date format: ${storedEvent.event_start}`);
                        return;
                    }

                    // Check if it's in our deletion window
                    const isInDeletionWindow = eventStartDate >= pastStartDate &&
                        eventStartDate <= futureEndDate;

                    if (isInDeletionWindow && !allCurrentEventIds.has(eventId)) {
                        // Try to find by fingerprint before marking for deletion
                        const storedFingerprint = createEventFingerprint({
                            start: { dateTime: storedEvent.event_start, date: storedEvent.event_start },
                            summary: storedEvent.summary,
                            organizer: { email: storedEvent.organizer_email || '' },
                            id: eventId // Use the stored event ID
                        });

                        const matchByFingerprint = results.find(r => {
                            if (!r.event) return false;
                            const fetchedFingerprint = createEventFingerprint(r.event);
                            return fetchedFingerprint === storedFingerprint;
                        });

                        if (matchByFingerprint) {
                            console.log(`📝 Event ID reconciliation: "${storedEvent.summary}" found with new ID`);
                            console.log(`  Old ID: ${eventId}`);
                            console.log(`  New ID: ${matchByFingerprint.event.id}`);

                            // Update the stored event with new ID
                            storedEvents[matchByFingerprint.event.id] = storedEvents[eventId];
                            delete storedEvents[eventId];
                            reconciledEvents.push({
                                oldId: eventId,
                                newId: matchByFingerprint.event.id,
                                summary: storedEvent.summary
                            });
                        } else {
                            // No fingerprint match found - candidate for deletion
                            deletionCandidates.push(eventId);
                        }
                    }
                } catch (err) {
                    console.error(`Error processing date for event ${eventId}:`, err);
                }
            });

            if (reconciledEvents.length > 0) {
                console.log(`🔄 Successfully reconciled ${reconciledEvents.length} events with changed IDs`);
                reconciledEvents.forEach(event => {
                    console.log(`  - "${event.summary}": ${event.oldId} → ${event.newId}`);
                });
            }

            deletedEventIds = deletionCandidates;


            // Enhanced deletion processing with confirmation modal
            if (deletedEventIds.length > 0) {
                console.group('🗑️ Detected Deleted Events:');

                // Create detailed deletion candidates list
                const pendingDeletions = deletedEventIds.map(eventId => {
                    const storedEvent = storedEvents[eventId];
                    return {
                        id: eventId,
                        summary: storedEvent.summary || 'Unknown Event',
                        date: storedEvent.event_start || 'Unknown Date',
                        blockUID: storedEvent.blockUID,
                        calendar: storedEvent.calendar || 'Unknown Calendar'
                    };
                });

                // Log each deletion candidate
                pendingDeletions.forEach(event => {
                    console.log(`📅 "${event.summary}" on ${event.date} (ID: ${event.id})`);
                });

                console.groupEnd();

                // Check if deletion confirmation modal is enabled
                const useConfirmationModal = getExtensionAPISetting(extensionAPI, "deletion-confirmation-modal", false);

                if (useConfirmationModal) {
                    // Store deletion candidates for manual review
                    await extensionAPI.settings.set("pending-deletions", pendingDeletions);
                    await extensionAPI.settings.set("pending-deletions-timestamp", Date.now());

                    // Show user-friendly notification with option to review
                    if (!testing) {
                        showToast(
                            `${deletedEventIds.length} calendar events appear to be deleted. Click Settings → Review Pending Deletions to confirm.`,
                            "WARNING"
                        );
                    }

                    console.log(`💾 Stored ${deletedEventIds.length} events for manual review in extension settings`);
                } else {
                    // Legacy auto-deletion behavior
                    console.group('🔄 Processing Auto-Deletions:');

                    deletedEventIds.forEach(eventId => {
                        const storedEvent = storedEvents[eventId];
                        if (!storedEvent || !storedEvent.blockUID) {
                            console.warn(`No stored block for event: ${eventId}`);
                            return;
                        }
                        const blockUid = storedEvents[eventId].blockUID;

                        // Check if this is an empty call template before deleting
                        // Pass the stored event data to help with SmartBlock detection
                        const emptyTemplateCheck = isEmptyCallTemplate(blockUid, storedEvent);
                        if (emptyTemplateCheck.result) {
                            // Delete the block
                            if (!testing) {
                                console.log(`🗑️ Auto-deleting empty template: "${storedEvent.summary}"`);
                                window.roamAlphaAPI.data.block.delete({
                                    block: {
                                        uid: blockUid
                                    }
                                });
                                // Remove from stored events
                                delete storedEvents[eventId];
                            } else {
                                console.log(`🧪 TEST MODE: Would delete empty template: "${storedEvent.summary}"`);
                            }
                        } else {
                            console.log(`📝 Preserving block with content: "${storedEvent.summary}" (${emptyTemplateCheck.reason})`);
                            // Note: Could add a "DELETED EVENT" marker here in the future
                        }
                    });

                    console.groupEnd();
                }
            } else {
                console.log('✅ No events detected as deleted');
            }

            console.groupEnd(); // Close deletion detection debug group
            console.groupEnd()
        }

        // Process events in reverse chronological order
        // Using for...of ensures sequential processing to avoid race conditions
        for (const result of results.reverse()) {
            try {
                // Make sure event and id exist before proceeding
                if (!result.event || !result.event.id) {
                    console.log('⚠️ Skipping event: missing event or id')
                    continue;
                }

                const eventId = result.event.id
                const eventSummary = result.event.summary || 'no-summary'

                console.log(`🔍 Processing event: "${eventSummary}" (ID: ${eventId})`)

                // Skip processing past events (not in create/update window)
                // But always process events in testing mode
                if (eventId && !createUpdateEventIds.has(eventId) && !testing) {
                    console.log(`⏭️ Skipping past event: "${eventSummary}" (not in create/update window)`)
                    continue;
                }

                // Log duplicate processing attempts
                if (processed_events.has(eventId)) {
                    console.log(`⏭️ Skipping duplicate: "${eventSummary}" (already processed)`)
                    continue
                }
                processed_events.add(eventId)

                // Log authentication errors
                if (result.text.includes("Error: Must log in") || result.text.includes("Error for calendar")) {
                    const errorEmail = extractEmailFromString(result.text)
                    prevent_update.add(errorEmail)
                    console.error('🚫 Calendar auth error:', {
                        email: errorEmail,
                        error: result.text
                    })
                    if (!testing) {
                        showToast(result.text, "DANGER")
                    }
                    continue
                }

                // Get event attendees
                let attendees = result.event.attendees || []

                // Check if this is a single person event (just the organizer)
                // Critically: Google Calendar doesn't explicitly include the organizer in all cases
                const isSingleAttendeeEvent = attendees.length === 0 || 
                                            attendees.every(a => a.self === true || a.organizer === true);

                // Log single-attendee events for reference
                if (isSingleAttendeeEvent) {
                    // We'll let the keyword system determine whether to process this event based on
                    // the requiresMultipleAttendees setting for each keyword
                }

                // Process event updates or create new event blocks
                await updateEventBlocks(storedEvents[eventId], result, attendees, people, extensionAPI, storedEvents, testing)

            } catch (err) {
                // Handle individual event processing errors without failing entire sync
                console.error('❌ Error processing event:', {
                    eventId: result.event?.id,
                    summary: result.event?.summary,
                    error: err.message,
                    stackTrace: err.stack
                })
                if (!testing) {
                    showToast(`Error processing event: ${err.message}`, "DANGER")
                }
            }
        }

        console.log('Sync Statistics:', {
            totalEvents: results.length,
            processed: processed_events.size,
            prevented: prevent_update.size,
            skipped: no_update.size,
            deleted: deletedEventIds.length
        })

        // Save all updates to extension settings after successful processing
        // This ensures atomic updates and prevents partial saves
        // Skip saving if in testing mode
        if (!testing) {
            await extensionAPI.settings.set("synced-cal-events", storedEvents)
        } else {
            console.log('Testing mode: skipping save of event data')
        }

    } catch (err) {
        // Handle overall sync process errors
        console.error('❌ Fatal sync error:', {
            error: err.message,
            stackTrace: err.stack
        })
        if (!testing) {
            showToast(`Error syncing calendar: ${err.message}`, "DANGER")
        }
    } finally {
        // Make sure this always runs, even if there are nested errors
        try {
            extensionAPI.settings.set("sync-in-progress", false)
            extensionAPI.settings.set("last-sync-time", Date.now())
            console.log('Sync completed, flags reset successfully')
        } catch (finallyError) {
            console.error("Error while resetting sync status:", finallyError)
            // Last resort - try using direct API to reset flag
            try {
                // Try first with roamAlphaAPI approach
                window.roamAlphaAPI.data.graph.settings.set(
                    "ext/roam-crm/sync-in-progress", 
                    false
                )
                console.log('Sync flags reset using direct API method')
            } catch (e) {
                console.error("Critical failure resetting sync flag with primary method:", e)
                
                // Ultimate fallback - try localStorage
                try {
                    const graphName = window.roamAlphaAPI.graph.name || "unknown-graph";
                    const localStorageKey = `roam/depot/roam-crm/${graphName}/sync-in-progress`;
                    localStorage.setItem(localStorageKey, "false");
                    console.log('Emergency sync flag reset using localStorage');
                } catch (finalError) {
                    console.error("All sync flag reset methods failed:", finalError);
                }
            }
        }
        console.groupEnd()
    }
}

// Helper function to handle creation and updates of event blocks in Roam
// Separated from main function for better organization and readability

async function updateEventBlocks(storedEvent, result, attendees, people, extensionAPI, storedEvents, testing = false) {
    // Ensure the event exists and has an ID
    if (!result.event || !result.event.id) {
        console.error('Missing event data in updateEventBlocks:', result)
        return
    }

    const eventId = result.event.id
    // Use the testing parameter passed from getEventInfo
    // This ensures consistency between test command and other calls

    // In testing mode, force template generation and logging without actual updates
    if (testing) {
        console.log('=== TESTING MODE: Force template generation ===');

        // Determine if this is a single-person event
        const isSingleAttendeeEvent = attendees.length === 0 || 
                                      attendees.every(a => a.self === true || a.organizer === true);

        // Check if this is a birthday event or all-day event
        const isBirthdayEvent = result.event.summary &&
            result.event.summary.toLowerCase().includes('birthday');
        const isAllDayEvent = result.event.start && result.event.start.date && !result.event.start.dateTime;

        console.log('Testing event:', {
            id: eventId,
            summary: result.event.summary,
            attendeesInfo: attendees.map(a => ({ email: a.email, self: a.self, organizer: a.organizer })),
            isSinglePerson: isSingleAttendeeEvent,
            isBirthday: isBirthdayEvent,
            isAllDay: isAllDayEvent
        });

        let { headerString, childrenBlocks, useSmartblock, smartblockUid, matchedKeyword } = createEventBlocks(
            result.event,
            attendees,
            people,
            extensionAPI
        );

        console.log('=== TESTING RESULT ===');
        console.log('Generated template:', {
            eventId,
            summary: result.event.summary,
            isSinglePerson: isSingleAttendeeEvent,
            headerString,
            childrenCount: childrenBlocks.length,
            useSmartblock: useSmartblock,
            smartblockUid: smartblockUid
        });
        return;
    }

    if (storedEvent) {
        // Check if the stored block still exists
        const blockExists = await window.roamAlphaAPI.q(`[:find ?e . :where [?e :block/uid "${storedEvent.blockUID}"]]`)

        if (!blockExists) {

            // Remove just this one event from storage
            delete storedEvents[eventId]
            // Clear just this stored event reference
            storedEvent = null
            // No error thrown - we'll recreate the block
        }
    }

    if (storedEvent) {
        let needsUpdate = false;
        let changes = {};

        // Extract the proper date value for checking
        let eventStartValue = null;
        if (result.event.start) {
            if (result.event.start.dateTime) {
                eventStartValue = result.event.start.dateTime;
            } else if (result.event.start.date) {
                eventStartValue = result.event.start.date;
            }
        }

        // Check for changes and build change log
        if (storedEvent.summary !== result.event.summary) {
            changes.summary = {
                old: storedEvent.summary,
                new: result.event.summary
            };
            needsUpdate = true;
        }
        if (storedEvent.event_start !== eventStartValue) {
            changes.date = {
                old: storedEvent.event_start,
                new: eventStartValue
            };
            needsUpdate = true;
        }
        if (!compareLists(storedEvent.attendees, attendees)) {
            changes.attendees = {
                old: storedEvent.attendees,
                new: attendees.map(a => a.email)
            };
            needsUpdate = true;
        }

        // Update block if changes were detected
        if (needsUpdate) {
            // Generate new block content with updated information
            let { headerString, childrenBlocks, useSmartblock, smartblockUid, matchedKeyword } = createEventBlocks(
                result.event,
                attendees,
                people,
                extensionAPI
            );

            // If headerString is empty, it's a signal to skip updating this block
            if (!headerString) {
                console.log(`Skipping block update for "${result.event.summary}" (empty header string)`);
                return;
            }

            // Update the existing block text
            await updateBlock({
                uid: storedEvent.blockUID,
                text: headerString
            });

            // Special handling for SmartBlock when the template changes
            if (useSmartblock && smartblockUid) {
                // First, check if we should trigger the SmartBlock
                // We'll only trigger it if:
                // 1. The block doesn't already have SmartBlock content, or
                // 2. The block was previously created with a different SmartBlock
                const blockData = await window.roamAlphaAPI.data.pull(
                    "[:block/string :block/children {:block/children ...}]",
                    [":block/uid", storedEvent.blockUID]
                );

                // Store info about previous SmartBlock if it exists
                const hadSmartblock = storedEvent.useSmartblock && storedEvent.smartblockUid;
                const smartblockChanged = hadSmartblock && storedEvent.smartblockUid !== smartblockUid;

                // Check if we should run the SmartBlock (if it's new or changed)
                if (!hadSmartblock || smartblockChanged) {

                    // First, create a child block to run the SmartBlock in
                    const childUid = window.roamAlphaAPI.util.generateUID();
                    await window.roamAlphaAPI.data.block.create({
                        location: {
                            "parent-uid": storedEvent.blockUID,
                            order: 0
                        },
                        block: {
                            uid: childUid,
                            string: ""
                        }
                    });

                    // Now trigger the SmartBlock on this child
                    if (window.roamjs?.extension?.smartblocks) {
                        try {
                            await window.roamjs.extension.smartblocks.triggerSmartblock({
                                srcUid: smartblockUid,
                                targetUid: childUid,
                            });
                        } catch (err) {
                            console.error(`Error triggering SmartBlock: ${err.message}`);
                        }
                    } else {
                        console.warn("SmartBlocks extension not found or not initialized");
                    }
                } 
            }

            // Handle date changes
            if (changes.date) {
                // Calculate new date and get corresponding Roam page
                let startDate = convertEventDateFormats(result.event.start)
                let parentBlockTitle = window.roamAlphaAPI.util.dateToPageTitle(startDate)
                let pageUID = await getPageUID(parentBlockTitle)

                // Ensure page exists before moving block
                if (!pageUID) {
                    throw new Error(`Failed to get/create page: ${parentBlockTitle}`)
                }

                // Move block to new date page
                await window.roamAlphaAPI.moveBlock({
                    location: { "parent-uid": pageUID, order: 0 },
                    block: { uid: storedEvent.blockUID }
                })

            }

            // Update stored event data
            let eventStartValue = null;
            if (result.event.start) {
                // Extract the proper date value depending on event type
                if (result.event.start.dateTime) {
                    // For events with specific times
                    eventStartValue = result.event.start.dateTime;
                } else if (result.event.start.date) {
                    // For all-day events
                    eventStartValue = result.event.start.date;
                }
            }

            storedEvents[eventId] = {
                blockUID: storedEvent.blockUID,
                summary: result.event.summary,
                event_updated: result.event.updated,
                event_start: eventStartValue,
                attendees: attendees,
                useSmartblock: useSmartblock,
                smartblockUid: smartblockUid,
                templateType: matchedKeyword ? (matchedKeyword.term || "default") : "unknown",
                templateString: headerString
            }
            console.log('~~check out the template check', JSON.stringify({
                blockUID: storedEvent.blockUID,
                summary: result.event.summary,
                event_updated: result.event.updated,
                event_start: eventStartValue,
                attendees: attendees,
                useSmartblock: useSmartblock,
                smartblockUid: smartblockUid,
                templateType: matchedKeyword ? (matchedKeyword.term || "default") : "unknown",
                templateString: headerString
            }, null, 2))

        }
    } else {
        // Creation logic for new events
        // Generate block content for new event
        let { headerString, childrenBlocks, useSmartblock, smartblockUid, matchedKeyword } = createEventBlocks(
            result.event,
            attendees,
            people,
            extensionAPI
        );

        // If headerString is empty, it's a signal to skip creating this block
        if (!headerString) {
            console.warn(`⏭️ Skipping block creation for "${result.event.summary}" (empty header string)`);
            return;
        }

        console.log(`✅ Creating new block for "${result.event.summary}"`);

        // Generate unique ID for new block
        let blockUID = window.roamAlphaAPI.util.generateUID()
        // Calculate event date and get corresponding Roam page
        let startDate = convertEventDateFormats(result.event.start)
        let parentBlockTitle = window.roamAlphaAPI.util.dateToPageTitle(startDate)
        let pageUID = await getPageUID(parentBlockTitle)

        // Ensure page exists before creating block
        if (!pageUID) {
            throw new Error(`Failed to get/create page: ${parentBlockTitle}`)
        }

        // Create new block with event information
        if (useSmartblock && smartblockUid) {
            // For SmartBlock, we create the parent with no children initially
            await createBlock({
                parentUid: pageUID,
                node: {
                    text: headerString,
                    open: true, // Keep open to show SmartBlock content
                    uid: blockUID
                }
            });

            // Then create a child block to trigger the SmartBlock
            const childUid = window.roamAlphaAPI.util.generateUID();
            await window.roamAlphaAPI.data.block.create({
                location: {
                    "parent-uid": blockUID,
                    order: 0
                },
                block: {
                    uid: childUid,
                    string: ""
                }
            });

            // Now trigger the SmartBlock on this child
            if (window.roamjs?.extension?.smartblocks) {
                try {
                    await window.roamjs.extension.smartblocks.triggerSmartblock({
                        srcUid: smartblockUid,
                        targetUid: childUid,
                    });
                } catch (err) {
                    console.error(`Error triggering SmartBlock: ${err.message}`);
                }
            } else {
                console.warn("SmartBlocks extension not found or not initialized");
            }
        } else {
            // For regular templates, create with the standard children blocks
            await createBlock({
                parentUid: pageUID,
                node: {
                    text: headerString,
                    open: false,
                    children: childrenBlocks,
                    uid: blockUID
                }
            });
        }

        // Store new event data
        let eventStartValue = null;
        if (result.event.start) {
            // Extract the proper date value depending on event type
            if (result.event.start.dateTime) {
                // For events with specific times
                eventStartValue = result.event.start.dateTime;
            } else if (result.event.start.date) {
                // For all-day events
                eventStartValue = result.event.start.date;
            }
        }

        storedEvents[eventId] = {
            blockUID: blockUID,
            summary: result.event.summary,
            event_updated: result.event.updated,
            event_start: eventStartValue,
            attendees: attendees,
            useSmartblock: useSmartblock,
            smartblockUid: smartblockUid,
            templateType: matchedKeyword ? (matchedKeyword.term || "default") : "unknown",
            templateString: headerString
        }
        console.log('~~check out the Stored new event data', JSON.stringify({
            blockUID: blockUID,
            summary: result.event.summary,
            event_updated: result.event.updated,
            event_start: eventStartValue,
            attendees: attendees,
            useSmartblock: useSmartblock,
            smartblockUid: smartblockUid,
            templateType: matchedKeyword ? (matchedKeyword.term || "default") : "unknown",
            templateString: headerString
        }, null, 2))
    }
    console.groupEnd()
}

// MARK: create event block

function createEventBlocks(event, attendees, people, extensionAPI) {
    console.log(`📝 createEventBlocks called for: "${event.summary}" (Calendar: ${event.calendar})`)
    console.log('Attendees passed to createEventBlocks:', attendees.map(a => ({ email: a.email, self: a.self, organizer: a.organizer })))
    
    let calendar = event.calendar || null
    let headerString
    let childrenBlocks = []
    const includeEventTitle = extensionAPI.settings.get("include-event-title") || false
    let attendeeNames = []
    let eventDatePage = window.roamAlphaAPI.util.dateToPageTitle(new Date(event.start.dateTime || event.start.date))
    let useSmartblock = false
    let smartblockUid = null

    console.log('=== RAW EVENT DEBUGGING ===');
    console.log('Event data:', event);
    
    // Preserve original attendees for accurate single-person detection
    // This fixes the bug where invited events were misclassified as single-person events
    const originalAttendees = [...attendees];
    
    // Filter out calendar owner for processing attendee names and notifications
    attendees = attendees.filter((attendee) => attendee.email !== calendar)
    attendees.forEach((a) => {
        let name = findPersonNameByEmail(people, a.email)

        if (name.length > 0) {
            // push the formatted person page name
            attendeeNames.push(`[[${name[0]}]]`)
            // update each person's last contacted
            let person = findPersonByEmail(people, a.email)

            updateBlock({
                uid: person[0]["Last Contacted"][0].uid,
                text: `Last Contacted:: [[${eventDatePage}]]`,
            })
        } else {
            attendeeNames.push(a.email)
        }
    })

    // Handle event attachments
    if (event.attachments && event.attachments.length > 0) {
        event.attachments.forEach((attachment) => {
            let resultString
            if (attachment.fileUrl.includes("www.notion.so")) {
                resultString = `Notion:: [${attachment.title}](${attachment.fileUrl})`
            } else {
                resultString = `Attachment:: [${attachment.title}](${attachment.fileUrl})`
            }
            // Create the new object
            let newBlock = { text: resultString }
            // Add the new object to the list
            childrenBlocks.push({ text: "---" })
            childrenBlocks.push(newBlock)
        })
    }

    // Debug area for keyword matching
    console.log('=== KEYWORD MATCHING DEBUGGING ===');
    if (event.summary && typeof event.summary === 'string') {
        const summary = event.summary.toLowerCase();
    } 

    // Use the keyword matching system
    const keywords = getEventKeywords(extensionAPI);
    console.log('Loaded event keywords:', keywords);
    let matchedKeyword = null;

    // First, let's identify the default keyword upfront for clarity
    let defaultKeyword = keywords.find(k => k.isDefault || k.term === "");

    // Determine if this is a single-person event (just me/myself)
    // Google Calendar API quirk: if it's just you, attendees might be empty or have just you
    // FIXED: Use original attendees before filtering to correctly classify invited events
    // An event is single-person if:
    // 1. No attendees at all, OR
    // 2. Exactly 1 attendee who is self or organizer, OR  
    // 3. All attendees are the same person (both self AND organizer)
    const isSinglePersonEvent = originalAttendees.length === 0 ||
        (originalAttendees.length === 1 && (originalAttendees[0].self === true || originalAttendees[0].organizer === true)) ||
        originalAttendees.every(a => a.self === true && a.organizer === true);

    console.log('=== SINGLE-PERSON EVENT DETECTION DEBUG ===');
    console.log('Original attendees count:', originalAttendees.length);
    console.log('Filtered attendees count:', attendees.length);
    console.log('Classified as single-person event:', isSinglePersonEvent);
    console.log('Event summary:', event.summary);

    // For single-person events, we need to find at least one matching keyword
    // that is specifically configured to work with single-person events
    if (isSinglePersonEvent) {
        // Check if there's a keyword specifically for single-person events that matches
        const hasMatchingSinglePersonKeyword = keywords.some(k =>
            !k.requiresMultipleAttendees &&
            !k.isDefault &&
            k.term &&
            checkStringForSubstring(event.summary, k.term)
        );

        // If there's no matching keyword for single-person events, skip this event
        if (!hasMatchingSinglePersonKeyword) {
            console.log(`Skipping single-person event with no matching keywords: "${event.summary}"`);
            // Return an empty header string to signal that we don't want to create this block
            headerString = '';
            return { headerString, childrenBlocks, useSmartblock, smartblockUid, matchedKeyword };

        } else {
            console.log(`Processing single-person event with matching keywords: "${event.summary}"`);
        }
    }

    // Find matching keyword by priority (properly sorted)
    const sortedKeywords = [...keywords].sort((a, b) => a.priority - b.priority);

    for (const keyword of sortedKeywords) {
        // Skip keywords requiring multiple attendees for single-person events
        if (keyword.requiresMultipleAttendees && isSinglePersonEvent) {
            continue;
        }

        // Conversely, skip keywords meant for single-person events when we have multiple people
        if (!keyword.requiresMultipleAttendees && !isSinglePersonEvent) {
            continue;
        }

        // Handle default template (empty term or isDefault flag)
        if (keyword.term === "" || keyword.isDefault) {
            // Only save this as a default if it matches our single/multi person requirement
            // Default keywords should still respect the requiresMultipleAttendees flag
            if (!matchedKeyword) {
                matchedKeyword = keyword;
            }
            continue; // Save default but keep looking for better matches
        }

        // Check if event summary contains this keyword
        const isMatch = checkStringForSubstring(event.summary, keyword.term);

        if (isMatch) {
            console.log(`Found matching keyword: '${keyword.term}'`);
            matchedKeyword = keyword;
            break; // Found a specific match, stop looking
        }
    }

    // If no match found, use a proper fallback
    if (!matchedKeyword) {
        // For single-person events with no match, we already returned early
        // This is only for multi-person events
        if (defaultKeyword && !isSinglePersonEvent) {
            console.log('Using default template for multi-person event');
            matchedKeyword = defaultKeyword;
        } else {
            // Ultimate fallback for multi-person events
            console.log('No matching keyword or default - using hardcoded multi-person template');
            headerString = formatTemplate("[[Call]] with {attendees}", attendeeNames, event.summary, includeEventTitle);
        }
    }

    // Format the template with actual values if we have a matched keyword
    if (matchedKeyword && !headerString) {

        // Check if this keyword uses a SmartBlock
        if (matchedKeyword.useSmartblock && matchedKeyword.smartblockUid) {
            useSmartblock = true;
            smartblockUid = matchedKeyword.smartblockUid;

            // Even with SmartBlock, we still need a header for the parent block
            headerString = formatTemplate(matchedKeyword.template, attendeeNames, event.summary, includeEventTitle);

            // For SmartBlock keywords, we'll add Notes and Next Actions blocks later in the process
            // after the parent block is created, so we can leave childrenBlocks empty here
            // We'll trigger the SmartBlock in updateEventBlocks
        } else {
            // Regular template formatting without SmartBlock
            headerString = formatTemplate(matchedKeyword.template, attendeeNames, event.summary, includeEventTitle);

            // Add the standard Notes and Next Actions blocks for regular templates
            childrenBlocks = [
                { text: "Notes::", children: [{ text: "" }] },
                { text: `Next Actions::`, children: [{ text: "" }] },
            ];
        }
    }

    // Log what keyword matched for debugging purposes
    console.log('Event template match:', {
        eventSummary: event.summary,
        matchedKeyword: matchedKeyword ? matchedKeyword.term || '(default)' : 'none',
        generatedHeader: headerString,
        useSmartblock: useSmartblock,
        smartblockUid: smartblockUid
    });
    console.log("")

    console.log(`📤 createEventBlocks returning for "${event.summary}":`, {
        hasHeaderString: !!headerString,
        headerString: headerString || '(empty)',
        childrenCount: childrenBlocks.length,
        useSmartblock,
        smartblockUid,
        matchedKeyword: matchedKeyword?.term || 'none'
    });

    return { headerString, childrenBlocks, useSmartblock, smartblockUid };
}
