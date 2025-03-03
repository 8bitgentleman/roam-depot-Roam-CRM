import createBlock from "roamjs-components/writes/createBlock"
import updateBlock from "roamjs-components/writes/updateBlock"
import { showToast } from "./components/toast"
import { getExtensionAPISetting, getPageUID } from "./utils"

function extractEmailFromString(text) {
    // Regular expression for matching an email address
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/

    // Using match() to find the email in the text
    const found = text.match(emailRegex)

    // If an email is found, return it; otherwise, return null or an appropriate message
    return found ? found[0] : null
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
    if (summary.toLowerCase().includes(substring)) {
        return true
    } else {
        return false
    }
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

// MARK: eventInfo
// Main function to sync Google Calendar events with Roam
// Fetches events for the next 7 days and creates/updates corresponding blocks in Roam
export async function getEventInfo(people, extensionAPI, testing, isManualSync = false, triggerSource = 'unknown') {
    // Get previously stored calendar events from extension settings
    const storedEvents = getExtensionAPISetting(extensionAPI, "synced-cal-events", {})

    // Check if sync is in progress
    if (extensionAPI.settings.get("sync-in-progress")) {
        console.log('Sync already in progress')
        // if (!testing) {
        //     showToast("Calendar sync already in progress", "ALERT")
        // }
        return
    }
    console.log("Sync sources", isManualSync, triggerSource, testing);

    // Check cooldown only for automatic syncs
    if (!isManualSync) {
        const lastSyncTime = extensionAPI.settings.get("last-sync-time")
        const SYNC_COOLDOWN = 60 * 60 * 1000 // 1 hour
        const now = Date.now()
        if (lastSyncTime && (now - lastSyncTime < SYNC_COOLDOWN)) {
            const hoursAgo = Math.round((now - lastSyncTime) / 3600000 * 10) / 10 // Round to 1 decimal
            console.log(`Automatic sync skipped - last sync was ${hoursAgo} hours ago. Will sync after ${Math.round((SYNC_COOLDOWN - (now - lastSyncTime)) / 3600000 * 10) / 10} more hours.`)
            return
        }
        console.log(`Starting automatic sync - ${lastSyncTime ? `last sync was ${Math.round((now - lastSyncTime) / 3600000 * 10) / 10} hours ago` : 'first sync'}`)
    } else {
        console.log('Starting manual sync')
    }

    try {
        extensionAPI.settings.set("sync-in-progress", true)
        console.group(`Calendar Sync Start [${triggerSource}]:`, new Date().toISOString())
        console.log('Current stored events:', JSON.parse(JSON.stringify(storedEvents)))

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

        console.log(`Fetched ${results.length} events from Google Calendar`)
        console.log('Fetched events:', results);
       
        
        // Exit if no events or error message received
        if (!results || results[0]?.text === "No Events Scheduled for Selected Date(s)!") {
            console.log('No events to process')
            console.groupEnd()
            return
        }
        
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
            console.group('Deletion Detection Debugging')
            console.log('Current date window:', {
                today: today.toISOString(),
                pastStartDate: pastStartDate.toISOString(),
                futureEndDate: futureEndDate.toISOString()
            })
            console.log('All current event IDs from Google:', Array.from(allCurrentEventIds))
            console.log('All stored events:', storedEvents)
            
            // Process each stored event with detailed logging
            console.group('Examining each stored event:')
            Object.keys(storedEvents).forEach(eventId => {
                console.group(`Event ID: ${eventId}`)
                
                // Log the event data
                console.log('Stored data:', {
                    blockUID: storedEvents[eventId].blockUID,
                    summary: storedEvents[eventId].summary,
                    event_start: storedEvents[eventId].event_start,
                    hasEventStart: Boolean(storedEvents[eventId].event_start),
                    isAllDay: storedEvents[eventId].event_start && !storedEvents[eventId].event_start.includes('T')
                })
                
                // Check if in current calendar events
                const isInCurrentEvents = allCurrentEventIds.has(eventId)
                console.log('Is in current Google Calendar events?', isInCurrentEvents)
                
                // Show the detailed checks we'll perform
                if (!storedEvents[eventId].event_start) {
                    console.log('⚠️ Missing event_start data - will be skipped in detection')
                    console.groupEnd()
                    // Don't use 'return' here as we're in a forEach function
                    return; // This only exits the current iteration of forEach
                }
                
                // Check date window
                const eventStartDate = new Date(storedEvents[eventId].event_start)
                const isAllDay = storedEvents[eventId].event_start && !storedEvents[eventId].event_start.includes('T')
                
                console.log('Event start date details:', { 
                    raw: storedEvents[eventId].event_start,
                    parsed: eventStartDate.toISOString(),
                    isAllDay: isAllDay,
                    isValidDate: !isNaN(eventStartDate.getTime())
                })
                
                const isAfterStartWindow = eventStartDate >= pastStartDate
                const isBeforeEndWindow = eventStartDate <= futureEndDate
                console.log('Date window check:', { 
                    isAfterStartWindow, 
                    isBeforeEndWindow,
                    inWindow: isAfterStartWindow && isBeforeEndWindow
                })
                
                console.log('Final detection result:', {
                    shouldDetectAsDeleted: (isAfterStartWindow && isBeforeEndWindow && !isInCurrentEvents)
                })
                
                console.groupEnd()
            })
            console.groupEnd()
            
            // Now actually perform the detection
            deletedEventIds = Object.keys(storedEvents).filter(eventId => {
                const storedEvent = storedEvents[eventId];
                
                // Skip events without any start time info
                if (!storedEvent.event_start) {
                    console.log(`Event ${eventId} missing event_start - can't check for deletion`);
                    return false;
                }
                
                try {
                    // Parse the start date regardless of format
                    const eventStartDate = new Date(storedEvent.event_start);
                    
                    // Ensure we got a valid date
                    if (isNaN(eventStartDate.getTime())) {
                        console.log(`Event ${eventId} has invalid date format: ${storedEvent.event_start}`);
                        return false;
                    }
                    
                    // Check if it's in our deletion window
                    const isInDeletionWindow = eventStartDate >= pastStartDate && 
                                               eventStartDate <= futureEndDate;
                    
                    // Is it in our window and not in the current calendar?
                    return isInDeletionWindow && !allCurrentEventIds.has(eventId);
                } catch (err) {
                    console.error(`Error processing date for event ${eventId}:`, err);
                    return false;
                }
            })
            
            console.log(`Detected ${deletedEventIds.length} deleted events:`, deletedEventIds);
            
            // Log deleted events details
            if (deletedEventIds.length > 0) {
                console.group('Detected Deleted Events Details:')
                deletedEventIds.forEach(eventId => {
                    console.log({
                        eventId,
                        blockUid: storedEvents[eventId].blockUID,
                        summary: storedEvents[eventId].summary,
                        startDate: storedEvents[eventId].event_start
                    })
                })
                console.groupEnd()
            }
            console.groupEnd()
        }

        // Process events in reverse chronological order
        // Using for...of ensures sequential processing to avoid race conditions
        for (const result of results.reverse()) {
            try {
                // Make sure event and id exist before proceeding
                if (!result.event || !result.event.id) {
                    console.warn('⚠️ Skipping event with missing ID:', result)
                    continue;
                }
                
                const eventId = result.event.id
                
                // Skip processing past events (not in create/update window)
                if (eventId && !createUpdateEventIds.has(eventId)) {
                    continue;
                }
        
                // Log duplicate processing attempts
                if (processed_events.has(eventId)) {
                    console.warn('⚠️ Attempting to process same event twice in one sync:', {
                        eventId,
                        summary: result.event?.summary,
                        start: result.event?.start
                    })
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
        
                // Skip events with no or single attendee (likely personal events)
                let attendees = result.event.attendees || []
                if (attendees.length <= 1) {
                    // Skip logging for single-attendee events
                    no_update.add(eventId)
                    continue
                }
        
                // Process event updates or create new event blocks
                await updateEventBlocks(storedEvents[eventId], result, attendees, people, extensionAPI, storedEvents)
        
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
        await extensionAPI.settings.set("synced-cal-events", storedEvents)

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
        extensionAPI.settings.set("sync-in-progress", false)
        extensionAPI.settings.set("last-sync-time", Date.now())
        console.groupEnd()
    }
}

// Helper function to handle creation and updates of event blocks in Roam
// Separated from main function for better organization and readability
async function updateEventBlocks(storedEvent, result, attendees, people, extensionAPI, storedEvents) {
    // Ensure the event exists and has an ID
    if (!result.event || !result.event.id) {
        console.error('Missing event data in updateEventBlocks:', result)
        return
    }
    
    const eventId = result.event.id

    if (storedEvent) {
        // Check if the stored block still exists
        const blockExists = await window.roamAlphaAPI.q(`[:find ?e . :where [?e :block/uid "${storedEvent.blockUID}"]]`)

        if (!blockExists) {
            console.log('Cleaning up reference to deleted block:', JSON.stringify({
                eventId,
                blockUid: storedEvent.blockUID,
                summary: storedEvent.summary,
                action: "Block will be recreated"
            }, null, 2))

            // Remove just this one event from storage
            delete storedEvents[eventId]
            // Clear just this stored event reference
            storedEvent = null
            // No error thrown - we'll recreate the block
        }
    }

    // Only log if we're creating a new event
    if (!storedEvent) {
        console.log('Creating new event block:', JSON.stringify({
            eventId,
            summary: result.event.summary,
            start: result.event.start,
            attendees: attendees.map(a => a.email)
        }, null, 2))
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

        if (needsUpdate) {
            console.log('Updating event block:', JSON.stringify({
                eventId,
                blockUid: storedEvent.blockUID,
                changes
            }, null, 2));
        }

        // Update block if changes were detected
        if (needsUpdate) {
            // Generate new block content with updated information
            let { headerString, childrenBlocks } = createEventBlocks(
                result.event,
                attendees,
                people,
                extensionAPI
            )
            // Update the existing block text
            await updateBlock({
                uid: storedEvent.blockUID,
                text: headerString
            })

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

                console.log('Moved block to new date page:', JSON.stringify({
                    blockUid: storedEvent.blockUID,
                    newPage: parentBlockTitle
                }, null, 2))
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
                attendees: attendees
            }

            console.log('Updated stored event data:', JSON.stringify({
                eventId,
                blockUid: storedEvent.blockUID,
                newData: storedEvents[eventId]
            }, null, 2))
        }
    } else {
        // Creation logic for new events
        // Generate block content for new event
        console.log('Creating new event block')
        let { headerString, childrenBlocks } = createEventBlocks(
            result.event,
            attendees,
            people,
            extensionAPI
        )
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
        await createBlock({
            parentUid: pageUID,
            node: {
                text: headerString,
                open: false,
                children: childrenBlocks,
                uid: blockUID
            }
        })

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
            attendees: attendees
        }
    }
    console.groupEnd()
}

// MARK: create event block
function createEventBlocks(event, attendees, people, extensionAPI) {
    let calendar = event.calendar || null
    let headerString
    let childrenBlocks = [
        { text: "Notes::", children: [{ text: "" }] },
        { text: `Next Actions::`, children: [{ text: "" }] },
    ]
    const includeEventTitle = extensionAPI.settings.get("include-event-title") || false
    let attendeeNames = []
    let eventDatePage = window.roamAlphaAPI.util.dateToPageTitle(new Date(event.start.dateTime))

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
            // Add the new object to the start of the childrenBlocks list
            childrenBlocks.unshift({ text: "---" })
            childrenBlocks.unshift(newBlock)
        })
    }

    if (includeEventTitle === true) {
        if (checkStringForSubstring(event.summary, "1:1")) {
            headerString = `[[1:1]] with ${attendeeNames.join(" and ")} about ${event.summary}`
        } else if (checkStringForSubstring(event.summary, "dinner")) {
            headerString = `[[Dinner]] with ${attendeeNames.join(" and ")} about ${event.summary}`
        } else {
            headerString = `[[Call]] with ${attendeeNames.join(" and ")} about ${event.summary}`
        }
    } else {
        if (checkStringForSubstring(event.summary, "1:1")) {
            headerString = `[[1:1]] with ${attendeeNames.join(" and ")}`
        } else if (checkStringForSubstring(event.summary, "dinner")) {
            headerString = `[[Dinner]] with ${attendeeNames.join(" and ")}`
        } else {
            headerString = `[[Call]] with ${attendeeNames.join(" and ")}`
        }
    }
    return { headerString, childrenBlocks }
}
