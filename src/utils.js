import createBlock from "roamjs-components/writes/createBlock"
import createPage from "roamjs-components/writes/createPage"
import { showToast } from "./components/toast"

function isSecondDateAfter(firstDateString, secondDateString) {
    // Parse the dates from the strings
    const firstDate = new Date(firstDateString)
    const secondDate = new Date(secondDateString)

    // Compare the dates
    return secondDate > firstDate
}

// function getLastCalendarCheckDate(extensionAPI) {
//   return extensionAPI.settings.get('last-calendar-check-date') || "01-19-2024"
// }
function getLastCalendarCheckDate(extensionAPI) {
    const value = extensionAPI.settings.get("last-calendar-check-date") || {}
    if (typeof value === "string") {
        extensionAPI.settings.set("last-calendar-check-date", {})
        return {}
    } else {
        return value
    }
}

function checkBatchContactSetting(extensionAPI) {
    const userSetting = extensionAPI.settings.get("batch-contact-notification") || "No Batch"
    // if no batch is selected than always show the contact reminder
    if (userSetting === "No Batch") {
        return true;
    }
    // Get the current day as a string
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    // Compare the current day with the user's setting
    return today === userSetting;
}

function parseStringToDate(dateString) {
    const defaultYear = new Date().getFullYear() // Use the current year as default

    // Array of month names for parsing
    const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ]

    // Remove any st, nd, rd, th suffixes from day
    dateString = dateString.replace(/(\d+)(st|nd|rd|th)/, "$1")

    // Split the dateString into parts
    const parts = dateString.split(" ")

    let month, day, year

    // Check the length of parts to determine the format
    if (parts.length === 2) {
        // Format: Month Day
        month = monthNames.indexOf(parts[0])
        day = parseInt(parts[1], 10)
        year = defaultYear
    } else if (parts.length === 3) {
        // Try to parse the year first, as it's unambiguous
        year = parseInt(parts[2], 10)
        if (isNaN(year)) {
            // If the year isn't a number, assume it's a part of the day and use the default year
            day = parseInt(parts[1], 10)
            month = monthNames.indexOf(parts[0])
            year = defaultYear
        } else {
            // If the year is a number, parse the month and day
            month = monthNames.indexOf(parts[0])
            day = parseInt(parts[1], 10)
        }
    } else {
        // Invalid format
        console.error("Invalid date format")
        return null
    }

    // Check for invalid month or day
    if (month === -1 || isNaN(day) || isNaN(year)) {
        console.error("Invalid date components")
        return null
    }

    // Create a Date object
    const dateObject = new Date(year, month, day)

    return dateObject
}

export async function getAllPeople() {
    let query = `[:find (pull ?PAGE [:attrs/lookup
                                  :block/string
                                  :block/uid
                                  :node/title
                                  {:attrs/lookup [:block/string :block/uid]} ])
                :where 
                  [?Tags-Ref :node/title "Tags"]
                  [?person-Ref :node/title "people"]
                  [?PEOPLEdec :block/refs ?Tags-Ref]
                  [?PEOPLEdec :block/refs ?person-Ref]
                  [?PEOPLEdec :block/page ?PAGE]
                  (not
                    [?PAGE :node/title "roam/templates"]      
                  )
                  (not
                    [?PAGE :node/title "SmartBlock"]      
                  )
                ]`

    let results = await window.roamAlphaAPI.q(query).flat()

    function extractElementsWithKeywords(data, keywords) {
        return data.map((item) => {
            // Initialize an object to hold the categorized items with empty arrays
            const categorizedItems = keywords.reduce((acc, keyword) => {
                const propName = keyword.replace(/::/g, "")
                acc[propName] = [] // Initialize each property with an empty array
                return acc
            }, {})

            // Check if lookup exists and is an array
            if (Array.isArray(item.lookup)) {
                // Iterate over each keyword
                keywords.forEach((keyword) => {
                    // Filter the lookup array for items containing the current keyword
                    const filteredLookup = item.lookup.filter((lookupItem) => {
                        return lookupItem.string && lookupItem.string.includes(keyword)
                    })

                    // Assign the filtered array to the corresponding property
                    const propName = keyword.replace(/::/g, "")
                    categorizedItems[propName] = filteredLookup
                })
            }

            // Return the original item with the categorized items added
            return {
                ...item,
                ...categorizedItems,
            }
        })
    }

    // Define the attributes to extract for
    const keywords = [
        "Birthday::",
        "Contact Frequency::",
        "Last Contacted::",
        "Email::",
        "Relationship Metadata::",
    ]

    return extractElementsWithKeywords(results, keywords)
}

function findPersonNameByEmail(people, email) {
    const normalizedEmail = email.toLowerCase(); // Normalize the input email to lower case
    const result = people
        .filter((item) => item.Email.some((emailItem) => emailItem.string.toLowerCase().includes(normalizedEmail))) // Compare in lower case
        .map((item) => item.title);
    return result;
}

function findPersonByEmail(people, email) {
    const result = people.filter((item) =>
        item.Email.some((emailItem) => emailItem.string.includes(email)),
    )

    return result
}
function extractEmailFromString(text) {
    // Regular expression for matching an email address
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/

    // Using match() to find the email in the text
    const found = text.match(emailRegex)

    // If an email is found, return it; otherwise, return null or an appropriate message
    return found ? found[0] : null
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
            // console.log("Events: ", results)
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
                            // console.log("email issue: ", errorEmail, prevent_update)
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
                                let attendeeNames = []
                                attendees.forEach((a) => {
                                    let name = findPersonNameByEmail(people, a.email)
                                    if (name.length > 0) {
                                        // push the formatted person page name
                                        attendeeNames.push(`[[${name[0]}]]`)
                                    } else {
                                        attendeeNames.push(a.email)
                                    }
                                })
                                const includeEventTitle = extensionAPI.settings.get("include-event-title") || false
                                let headerString;
                                if (includeEventTitle === true) {
                                    headerString = `[[Call]] with ${attendeeNames.join(" and ")} about ${result.event.summary}`
                                } else {
                                    headerString = `[[Call]] with ${attendeeNames.join(" and ")}`
                                }
                                
                                

                                const blockJSON = [
                                    {
                                        string: headerString,
                                        children: [
                                            {
                                                string: "Next Actions::",
                                                children: [{ string: "" }],
                                            },
                                            { string: "Notes::", children: [{ string: "" }] },
                                        ],
                                        open:false,
                                    },
                                ]
                                createBlock({
                                    parentUid: newBlockUID,
                                    node: {
                                        text: headerString,
                                        open: false,
                                        children: [
                                            {
                                                text: `Next Actions::`,
                                                children: [{ text: "" }],
                                            },
                                            { text: "Notes::", children: [{ text: "" }] },
                                        ],
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
            console.log("new values ", await extensionAPI.settings.get("last-calendar-check-date"))
        })
        .catch((error) => {
            console.error(error)
        })
}

export async function getPageUID(page) {
    // Perform Roam Research datalog pull
    const result = window.roamAlphaAPI.data.pull(
        "[:node/title :block/uid]",
        `[:node/title "${page}"]`,
    )

    if (result && result[":block/uid"]) {
        // If data exists, return the existing block UID
        return result[":block/uid"]
    } else {
        const newPageUid = window.roamAlphaAPI.util.generateUID()
        createPage({ title: page, uid: newPageUid })
        return newPageUid
    }
}

// const blockJSON = [
//   {
//     string: "**Birthdays Today**", children:
//       [
//           { string: "[Person Name](birthday_UID)" },
//         ...
//         ]
//   }
// ]

function shouldContact(person) {
    // Define the current date
    const currentDate = new Date()

    // Define the intervals in milliseconds
    const intervals = {
        "A List": 14 * 24 * 60 * 60 * 1000, // Every two weeks
        "B List": 2 * 30 * 24 * 60 * 60 * 1000, // Roughly every two months
        "C List": 6 * 30 * 24 * 60 * 60 * 1000, // Roughly every six months
        "D List": 365 * 24 * 60 * 60 * 1000, // Once a year
        "F List": null, //never contact
    }

    // Extract the relevant properties from the person object
    const { contact_list, last_contact, name } = person

    // Check if the person is on the "F List"
    if (contact_list === "F List") {
        // If so, return false as we never contact these individuals
        return false
    }

    // Convert the last_contact string to a Date object
    const lastContactDate = new Date(last_contact)

    // Calculate the next contact date based on the last_contact date and the interval for the contact_list
    const nextContactDate = new Date(lastContactDate.getTime() + intervals[contact_list])

    // Determine if the current date is past the next contact date
    return currentDate >= nextContactDate
}

function checkBirthdays(person) {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalize today's date to start of day for comparison

    let aAndBBirthdaysToday
    let otherBirthdaysToday
    let filteredUpcomingBirthdays

    const personBirthday = new Date(person.birthday)
    const currentYear = today.getFullYear()

    personBirthday.setFullYear(currentYear) // Set birthday year to current year for comparison
    personBirthday.setHours(0, 0, 0, 0) // Normalize birthday to start of day for comparison

    const timeDiff = personBirthday - today
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24)

    if (daysDiff === 0) {
        // Separate today's birthdays into two categories
        // A & Bs will be in the notification
        // C & Ds will be block ref'd to the DNP
        if (person.contact_list === "A List" || person.contact_list === "B List") {
            aAndBBirthdaysToday = person
        } else if (person.contact_list !== "F List") {
            otherBirthdaysToday = person
        }
    } else if (daysDiff > 0 && daysDiff <= 14) {
        person["daysUntilBirthday"] = Math.ceil(daysDiff)
        if (person.contact_list === "A List" || person.contact_list === "B List") {
            filteredUpcomingBirthdays = person
        }
    }

    return {
        aAndBBirthdaysToday,
        otherBirthdaysToday,
        filteredUpcomingBirthdays,
    }
}

function fixPersonJSON(person) {
    // parse through raw strings and extract important info
    const birthdayDateString =
        person["Birthday"].length > 0
            ? person["Birthday"][0].string.split("::", 2)[1].replace(/\[|\]/g, "") || ""
            : ""
    const birthday = parseStringToDate(birthdayDateString.trim()) || null
    let contactDateString
    let last_contact
    let contactUIDString
    let newRelationshipUID

    // Check if person["Last Contacted"] is not empty
    if (person["Last Contacted"].length > 0) {
        contactDateString =
            person["Last Contacted"][0].string.split("::", 2)[1].replace(/\[|\]/g, "") || null
        if (contactDateString === null) {
            last_contact = new Date()
        } else {
            last_contact = parseStringToDate(contactDateString.trim())
        }
        contactUIDString = person["Last Contacted"][0].uid || null
    } else {
        // there is no "last contacted" attribute so let's create one
        contactUIDString = window.roamAlphaAPI.util.generateUID()
        contactDateString = roamAlphaAPI.util.dateToPageTitle(new Date())
        last_contact = parseStringToDate(contactDateString.trim()) || new Date()

        // Check if Relationship Metadata and property exist
        if (person && person["Relationship Metadata"] && person["Relationship Metadata"][0]) {
            // If the object and property exist, create a child
            createBlock({
                node: {
                    text: `Last Contacted:: [[${contactDateString}]]`,
                    uid: contactUIDString,
                },
                parentUid: person["Relationship Metadata"][0].uid,
            })
        } else {
            // If the object or property does not exist, create both the parent and the child
            newRelationshipUID = window.roamAlphaAPI.util.generateUID()
            createBlock({
                node: {
                    text: `Relationship Metadata::`,
                    uid: newRelationshipUID,
                    children: [
                        {
                            text: `Last Contacted:: [[${contactDateString}]]`,
                            uid: contactUIDString,
                        },
                    ],
                },
                parentUid: person.uid,
            })
            person["Relationship Metadata"].push({
                string: "Relationship Metadata::",
                uid: newRelationshipUID,
            })
            person["Last Contacted"].push({ string: "Last Contacted::", uid: contactUIDString })

            // Your code here for when the property does not exist
        }
    }

    let contact

    // set the contact list
    if (person["Contact Frequency"].length === 0) {
        // there is no contact frequency node so add one
        const contactFrequenceUID = window.roamAlphaAPI.util.generateUID()
        createBlock({
            node: {
                text: `Contact Frequency:: #[[C List]]: Contact every six months`,
                uid: contactFrequenceUID,
            },
            parentUid: person["Relationship Metadata"][0].uid,
        })
        person["Contact Frequency"].push({
            string: `Contact Frequency:: #[[C List]]: Contact every six months`,
            uid: contactFrequenceUID,
        })
        contact = "C List"
    } else if (person["Contact Frequency"][0].string.includes("C List")) {
        contact = "C List"
    } else if (person["Contact Frequency"][0].string.includes("A List")) {
        contact = "A List"
    } else if (person["Contact Frequency"][0].string.includes("B List")) {
        contact = "B List"
    } else if (person["Contact Frequency"][0].string.includes("D List")) {
        contact = "D List"
    } else if (person["Contact Frequency"][0].string.includes("F List")) {
        contact = "F List"
    } else {
        // Default value if none of the keywords are found
        contact = "C List"
    }
    person.birthday = birthday
    person.contact_list = contact
    person.birthday_UID = person?.Birthday?.[0]?.uid || null
    person.last_contact = last_contact
    person.last_contact_uid = contactUIDString
    person.name = person.title

    return person
}

export function calculateAge(birthdate) {
    const today = new Date()
    const birthDate = new Date(birthdate)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
    }

    return age
}

function remindersSystem(people, lastBirthdayCheck, extensionAPI) {
    let birthdays = {
        aAndBBirthdaysToday: [],
        otherBirthdaysToday: [],
        filteredUpcomingBirthdays: [],
    }
    let toBeContacted = []
    // for each person extract the needed info
    // TODO fetch the extensionAPI and check if batching is enabled
    let displayToBeContacted = checkBatchContactSetting(extensionAPI)
    people.forEach((person) => {
        // fix the json
        person = fixPersonJSON(person)

        // check the last contact date compared to the contact list
        if(displayToBeContacted){
            if (shouldContact(person)) {
                toBeContacted.push(person)
            }
        }
        let filteredBirthdays = checkBirthdays(person)
        if (filteredBirthdays.aAndBBirthdaysToday) {
            birthdays.aAndBBirthdaysToday.push(filteredBirthdays.aAndBBirthdaysToday)
        }
        if (filteredBirthdays.otherBirthdaysToday) {
            birthdays.otherBirthdaysToday.push(filteredBirthdays.otherBirthdaysToday)
        }
        if (filteredBirthdays.filteredUpcomingBirthdays) {
            birthdays.filteredUpcomingBirthdays.push(filteredBirthdays.filteredUpcomingBirthdays)
        }
    })

    // check if there are lower priority birthdays and create on DNP
    const todaysDNPUID = window.roamAlphaAPI.util.dateToPageUid(new Date())

    if (
        isSecondDateAfter(lastBirthdayCheck, todaysDNPUID) &
        (birthdays.otherBirthdaysToday.length > 0)
    ) {
        // block ref other today birthdays to the DNP
        createBlock({
            parentUid: todaysDNPUID,
            node: {
                text: `((${getBlockUidByContainsTextOnPage("Birthdays Today", "roam/templates")}))`,
                children: birthdays.otherBirthdaysToday.map((p) => ({
                    text: `[${p.name} is ${calculateAge(p.birthday)} years old](((${p.birthday_UID})))`,
                })),
            },
            
        })
    }

    const mergedReminders = {
        ...birthdays,
        toBeContacted: toBeContacted,
    }

    return mergedReminders
}

function normalizeString(str) {
    return (
        str
            // Convert to lowercase
            .toLowerCase()
            // Trim leading and trailing whitespace
            .trim()
    )
}

function getDictionaryWithKeyValue(list, key, value) {
    return list.find(function (dict) {
        if (typeof dict[key] !== "string") {
            return false
        }
        // Normalize and standardize both the dictionary value and the search value
        const normalizedDictValue = normalizeString(dict[key])
        const normalizedSearchValue = normalizeString(value)

        return normalizedDictValue === normalizedSearchValue
    })
}

function getBlockUidByContainsTextOnPage(text, page) {
    let query = `[:find
    (pull ?node [:block/uid])
    :in $ ?pageTitle ?string
    :where
    [?sourcePage :node/title ?pageTitle]
    [?node :block/page ?sourcePage]
    (or [?node :block/string ?node-String]
        [?node :node/title ?node-String])
    [(clojure.string/includes? ?node-String ?string)]
  ]`

    let result = window.roamAlphaAPI.q(query, page, text).flat()

    if (result.length === 0) {
        // Agenda:: block doesn't exist on the person's page so we need to make it
        const newUID = window.roamAlphaAPI.util.generateUID()
        const pageUID = window.roamAlphaAPI.data.pull("[:block/uid]", `[:node/title \"${page}\"]`)[
            ":block/uid"
        ]

        // create Agenda:: block
        window.roamAlphaAPI.createBlock({
            location: { "parent-uid": pageUID, order: "last" },
            block: { string: text, uid: newUID },
        })

        return newUID
    } else {
        // Return the uid of the first block that contains Agenda::
        return result[0].uid
    }
}
//MARK:Agenda Addr
export async function parseAgendaPull(after) {
    // Function to clean up the original block
    function cleanUpBlock(block) {
        const cleanedString = block[":block/string"].replace(agendaRegex, "").trim()
        window.roamAlphaAPI.updateBlock({
            block: { uid: block[":block/uid"], string: cleanedString },
        })
    }
    // Precompile the regex
    const agendaRegex = /\[\[Agenda\]\]|\#Agenda|\#\[\[Agenda\]\]/g

    // Function to create a TODO block
    function createTodoBlock(sourceUID, personAgendaBlock) {
        const newBlockString = `{{[[TODO]]}} ((${sourceUID}))`

        window.roamAlphaAPI.createBlock({
            location: { "parent-uid": personAgendaBlock, order: 0 },
            block: { string: newBlockString },
        })
    }

    if (":block/_refs" in after) {
        const agendaBlocks = after[":block/_refs"]

        const filteredBlocks = agendaBlocks.filter((block) => {
            // Check if ":block/refs" key exists and has at least 2 refs
            const hasRefs = block[":block/refs"] && block[":block/refs"].length >= 2
            // Check if ":block/string" does not start with "Agenda::"
            const doesNotStartWithAgenda = !block[":block/string"].startsWith("Agenda::")

            // Return true if both conditions are met
            return hasRefs && doesNotStartWithAgenda
        })
        if (filteredBlocks.length > 0) {
            const people = await getAllPeople()
            console.log(filteredBlocks)

            filteredBlocks.forEach((block) => {
                const relevantRefs = block[":block/refs"].filter(
                    (ref) => ref[":node/title"] !== "Agenda",
                )
                relevantRefs.forEach((ref) => {
                    const matchingPerson = getDictionaryWithKeyValue(
                        people,
                        "title",
                        ref[":node/title"],
                    )
                    console.log("match", matchingPerson)

                    if (matchingPerson) {
                        const personAgendaBlock = getBlockUidByContainsTextOnPage(
                            "Agenda::",
                            matchingPerson.title,
                        )
                        createTodoBlock(block[":block/uid"], personAgendaBlock)
                        cleanUpBlock(block)
                    }
                })
            })
        }
    }
}
export default remindersSystem
