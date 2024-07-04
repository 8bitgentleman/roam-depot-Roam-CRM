import createBlock from "roamjs-components/writes/createBlock"
import createPage from "roamjs-components/writes/createPage"
import updateBlock from "roamjs-components/writes/updateBlock"
import { showToast } from "./components/toast"
import {
    getDictionaryWithKeyValue,
    getBlockUidByContainsTextOnPage,
    isSecondDateAfter,
    getExtensionAPISetting,
} from "./utils"

function checkBatchContactSetting(extensionAPI) {
    const userSetting = extensionAPI.settings.get("batch-contact-notification") || "No Batch"
    // if no batch is selected than always show the contact reminder
    if (userSetting === "No Batch") {
        return true
    }
    // Get the current day as a string
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" })

    // Compare the current day with the user's setting
    return today === userSetting
}

function getIntervalsFromSettings(extensionAPI) {
    // Retrieve the settings values asynchronously
    const aList = getExtensionAPISetting(extensionAPI, "aList", 14) // Two weeks
    const bList = getExtensionAPISetting(extensionAPI, "bList", 60) // Two months
    const cList = getExtensionAPISetting(extensionAPI, "cList", 180) // Six months
    const dList = getExtensionAPISetting(extensionAPI, "dList", 365) // Once a year
    const fList = getExtensionAPISetting(extensionAPI, "fList", 0) // Never contact

    // Convert intervals to milliseconds
    const intervals = {
        "A List": aList * 24 * 60 * 60 * 1000, // Every two weeks
        "B List": bList * 24 * 60 * 60 * 1000, // Roughly every two months
        "C List": cList * 24 * 60 * 60 * 1000, // Roughly every six months
        "D List": dList * 24 * 60 * 60 * 1000, // Once a year
        "F List": fList === 0 ? null : fList * 24 * 60 * 60 * 1000, // Never contact or custom interval
    }

    return intervals
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

export function getAllPageRefEvents(pages) {
    let query = `[:find
    (pull ?node [:block/string :node/title :block/uid :edit/time :block/page {:block/page [:node/title :block/uid]}])
    :in $ [?namespace ...]
  :where
    [?refs :node/title ?namespace]
    [?node :block/refs ?refs]
  ]`

    let result = window.roamAlphaAPI.q(query, pages).flat()
    const blockRefEvents = result.map((b) => {
        const dateObject = parseStringToDate(b.page.title)
        const timestamp = dateObject ? dateObject.getTime() : null
        return {
            type: "blockRef",
            date: timestamp !== null ? timestamp : b.time,
            string: b.string,
            ref: b.uid,
            page: b.page,
        }
    })
    return blockRefEvents
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
    let peopleList = extractElementsWithKeywords(results, keywords)
    const fixedPeopleList = peopleList.map(fixPersonJSON)
    return fixedPeopleList
}

function shouldContact(person, intervals) {
    // Define the current date
    const currentDate = new Date()

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
        const specificDays = [1, 7, 14]
        if (specificDays.includes(person.daysUntilBirthday)) {
            if (person.contact_list === "A List" || person.contact_list === "B List") {
                filteredUpcomingBirthdays = person
            }
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

            //  code here for when the property does not exist
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

function isModalEmpty(obj, excludeKey) {
    return Object.keys(obj)
        .filter((key) => key !== excludeKey)
        .every((key) => Array.isArray(obj[key]) && obj[key].length === 0)
}

function remindersSystem(people, lastBirthdayCheck, extensionAPI) {
    let birthdays = {
        aAndBBirthdaysToday: [],
        otherBirthdaysToday: [],
        filteredUpcomingBirthdays: [],
    }
    let toBeContacted = []
    // for each person extract the needed info
    let displayToBeContacted = checkBatchContactSetting(extensionAPI)
    // Get the list durations from
    const contactIntervals = getIntervalsFromSettings(extensionAPI)

    people.forEach((person) => {
        // check the last contact date compared to the contact list
        if (displayToBeContacted) {
            if (shouldContact(person, contactIntervals)) {
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
            order: "last",
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

//MARK:Agenda Addr
function removeTagFromBlock(blockString, tag) {
    // Create the regex pattern
    const varRegex = new RegExp(`#${tag}|#\\[\\[${tag}\\]\\]`, "g")

    // Replace all occurrences
    let replacedStr = blockString.replace(varRegex, "")
    // cleanup excess spaces
    replacedStr = replacedStr.replace(/\s+/g, " ").trim()

    return replacedStr
}

export async function parseAgendaPull(after, extensionAPI) {
    // Function to clean up the original block
    function cleanUpBlock(blockUID, blockString) {
        const cleanedString = blockString.replace(agendaRegex, "").trim()
        window.roamAlphaAPI.updateBlock({
            block: { uid: blockUID, string: cleanedString },
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

            filteredBlocks.forEach(async (block) => {
                // pull out the block string to create a source of truth through the changes
                let blockString = block[":block/string"]

                const relevantRefs = block[":block/refs"].filter(
                    (ref) => ref[":node/title"] !== "Agenda",
                )
                relevantRefs.forEach(async (ref) => {
                    const matchingPerson = getDictionaryWithKeyValue(
                        people,
                        "title",
                        ref[":node/title"],
                    )

                    if (matchingPerson) {
                        const personAgendaBlock = getBlockUidByContainsTextOnPage(
                            "Agenda::",
                            matchingPerson.title,
                        )
                        createTodoBlock(block[":block/uid"], personAgendaBlock)

                        if (
                            getExtensionAPISetting(extensionAPI, "agenda-addr-remove-names", false)
                        ) {
                            // remove people tags #john but not [[john]]
                            blockString = removeTagFromBlock(blockString, matchingPerson.title)
                            await window.roamAlphaAPI.updateBlock({
                                block: {
                                    uid: block[":block/uid"],
                                    string: blockString,
                                },
                            })
                        }
                        // remove the #Agenda block
                        cleanUpBlock(block[":block/uid"], blockString)
                    }
                })
            })
        }
    }
}
export default remindersSystem
