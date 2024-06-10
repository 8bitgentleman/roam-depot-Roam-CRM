import createBlock from "roamjs-components/writes/createBlock"
import updateBlock from "roamjs-components/writes/updateBlock"
import { showToast } from "./components/toast"
import { isSecondDateAfter, getExtensionAPISetting } from "./utils"

function extractEmailFromString(text) {
    // Regular expression for matching an email address
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/

    // Using match() to find the email in the text
    const found = text.match(emailRegex)

    // If an email is found, return it; otherwise, return null or an appropriate message
    return found ? found[0] : null
}

function findPersonByEmail(people, email) {
    const emailLower = email.toLowerCase();  // Convert the search email to lowercase

    const result = people.filter((item) =>
        item.Email.some((emailItem) =>
            emailItem.string.toLowerCase().includes(emailLower)  // Convert each email item to lowercase before comparison
        ),
    );

    return result;
}

function findPersonNameByEmail(people, email) {
    const normalizedEmail = email.toLowerCase(); // Normalize the input email to lower case

    const result = people
        .filter((item) => item.Email.some((emailItem) => emailItem.string.toLowerCase().includes(normalizedEmail))) // Compare in lower case
        .map((item) => item.title);
    return result;
}

function getLastCalendarCheckDate(extensionAPI) {
    const value = extensionAPI.settings.get("last-calendar-check-date") || {}
    // update old schema
    if (typeof value === "string") {
        extensionAPI.settings.set("last-calendar-check-date", {})
        return {}
    } else {
        return value
    }
}

function checkStringForSubstring(summary, substring) {
    if (summary.toLowerCase().includes(substring)) {
        return true
    } else {
        return false
    }
}

// check if events have been fetched yet today
export function checkAndFetchEvents(people, extensionAPI, testing) {
    const lastFetchDate = getLastCalendarCheckDate(extensionAPI) || {};
    const today = window.roamAlphaAPI.util.dateToPageUid(new Date())
    

    // Iterate over all email addresses and check if a fetch is needed
    // TODO what happens when an email is removed from the google extension?
    // the last checked date will always be old so the events will fetch every hour...
    for (const email in lastFetchDate) {
      if (lastFetchDate[email] !== today) {
        getEventInfo(people, extensionAPI, testing)
        break;
      } 
    }
  }

export async function testEventInfo(people, extensionAPI, testing) {
    console.log("test event info");
    
    const syncedEvents = getExtensionAPISetting(extensionAPI, "synced-cal-events", {})
    await window.roamjs.extension.google
        .fetchGoogleCalendar({
            startDatePageTitle: window.roamAlphaAPI.util.dateToPageTitle(new Date()),
        })
        .then(async (results) => {
            console.log("Events: ", results)
            // reverse results so they come in the correct order
            results.reverse()
            results.forEach(async (result) => {
                let attendees = result.event.attendees || 0
                let calendar = result.event.calendar || null
                if (attendees.length > 1) {
                    let childrenBlocks = [
                        { text: "Notes::", children: [{ text: "" }] },
                        { text: `Next Actions::`, children: [{ text: "" }]},
                    ]
                    let attendeeNames = []
                    let dt = window.roamAlphaAPI.util.dateToPageTitle(new Date())
                    // filter out self from attendees 
                    attendees = attendees.filter(attendee => attendee.email !== calendar);
                    let headerString = `[[Call]] with ${attendees.join(" and ")} about ${result.event.summary}`
                    let blockUID = window.roamAlphaAPI.util.generateUID()
                    let parentBlockUID = window.roamAlphaAPI.util.dateToPageUid(new Date())
                    // syncedEvents[result.event.id] = 
                    let test =
                    {
                        blockUID:blockUID,
                        summary:result.event.summary,
                        event_updated:result.event.updated,
                        event_start:result.event.start
                    }
                    createBlock({
                        parentUid: parentBlockUID,
                        node: {
                            text: headerString,
                            open: false,
                            children: childrenBlocks,
                            uid:blockUID
                        },
                    })
                    console.log(test);
                    
                }
            })
        })
}

export async function getEventInfo(people, extensionAPI, testing) {
    const lastCalendarCheck = getLastCalendarCheckDate(extensionAPI)
    const todaysDNPUID = window.roamAlphaAPI.util.dateToPageUid(new Date())

    let prevent_update = new Set()
    let to_update = new Set()
    await window.roamjs.extension.google
        .fetchGoogleCalendar({
            startDatePageTitle: window.roamAlphaAPI.util.dateToPageTitle(new Date()),
        })
        .then(async (results) => {
            console.log("Events: ", results)
            // reverse results so they come in the correct order
            results.reverse()
            if (results[0].text !== "No Events Scheduled for Selected Date(s)!") {
                // get the uid for today's DNP
                let newBlockUID = window.roamAlphaAPI.util.dateToPageUid(new Date())
                
                results.forEach(async (result) => {
                    // check if there are logged in errors
                    if (
                        result.text.includes("Error: Must log in") ||
                        result.text.includes("Error for calendar")
                    ) {
                        const errorEmail = extractEmailFromString(result.text)
                        prevent_update.add(errorEmail)

                        if (!testing) {
                            showToast(result.text, "DANGER")
                        }

                    } else {
                        let attendees = result.event.attendees || 0
                        let calendar = result.event.calendar || null
                        // add calendar date check
                        let checkDate
                        if (testing) {
                            checkDate = "01-19-2024"
                        } else {
                            checkDate = lastCalendarCheck[calendar] || "01-19-2024"
                        }
                        let toCheck = isSecondDateAfter(checkDate, todaysDNPUID)
                        if (toCheck) {
                            to_update.add(calendar)
                            // only process events with more than 1 confirmed attendee
                            if (attendees.length > 1) {
                                let childrenBlocks = [
                                    { text: "Notes::", children: [{ text: "" }] },
                                    { text: `Next Actions::`, children: [{ text: "" }]},
                                ]
                                let attendeeNames = []
                                let dt = window.roamAlphaAPI.util.dateToPageTitle(new Date())
                                // filter out self from attendees 
                                attendees = attendees.filter(attendee => attendee.email !== calendar);
                                attendees.forEach((a) => {
                                    let name = findPersonNameByEmail(people, a.email)

                                    if (name.length > 0) {
                                        // push the formatted person page name
                                        attendeeNames.push(`[[${name[0]}]]`)
                                        // update each person's last contacted
                                        let person = findPersonByEmail(people, a.email)
                                        updateBlock({
                                            uid: person[0].last_contact_uid,
                                            text: `Last Contacted:: [[${dt}]]`,
                                        })
                                    } else {
                                        attendeeNames.push(a.email)
                                    }
                                })
                                if (result.event.attachments && result.event.attachments.length > 0) {
                                    result.event.attachments.forEach(attachment => {
                                        let resultString;
                                        if (attachment.fileUrl.includes("www.notion.so")) {
                                            resultString = `Notion:: [${attachment.title}](${attachment.fileUrl})`;
                                        } else {
                                            resultString = `Attachment:: [${attachment.title}](${attachment.fileUrl})`;
                                        }
                                        // Create the new object
                                        let newBlock = { text: resultString};
                                        // Add the new object to the start of the childrenBlocks list
                                        childrenBlocks.unshift({ text: "---"});
                                        childrenBlocks.unshift(newBlock);
                                    });
                                }
                                const includeEventTitle = extensionAPI.settings.get("include-event-title") || false
                                let headerString;
                                if (includeEventTitle === true) {
                                    if (checkStringForSubstring(result.event.summary, '1:1')) {
                                        headerString = `[[1:1]] with ${attendeeNames.join(" and ")} about ${result.event.summary}`
                                    } else if (checkStringForSubstring(result.event.summary, 'dinner')) {
                                        headerString = `[[Dinner]] with ${attendeeNames.join(" and ")} about ${result.event.summary}`
                                    } else {
                                        headerString = `[[Call]] with ${attendeeNames.join(" and ")} about ${result.event.summary}`
                                    }
                                } else {
                                    if (checkStringForSubstring(result.event.summary, '1:1')) {
                                        headerString = `[[1:1]] with ${attendeeNames.join(" and ")}`
                                    } else if (checkStringForSubstring(result.event.summary, 'dinner')) {
                                        headerString = `[[Dinner]] with ${attendeeNames.join(" and ")}`
                                    } else {
                                        headerString = `[[Call]] with ${attendeeNames.join(" and ")}`
                                    }
                                }

                                createBlock({
                                    parentUid: newBlockUID,
                                    node: {
                                        text: headerString,
                                        open: false,
                                        children: childrenBlocks,
                                    },

                                })

                            }
                        }
                    }
                })
            }

            // keep in mind when editing 'last-calendar-check-date' I have to get the whole object,
            // edit the values I need and then set 'last-calendar-check-date' to the new object
            if (to_update.size > 0) {
                let new_calendar_check_date = lastCalendarCheck
                for (const value of to_update) {
                    new_calendar_check_date[value] = todaysDNPUID
                }
                await extensionAPI.settings.set("last-calendar-check-date", new_calendar_check_date)
            }
        })
        .catch((error) => {
            console.error(error)
        })
}