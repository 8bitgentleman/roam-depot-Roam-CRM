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
export function getExtensionAPISetting(extensionAPI, key, defaultValue) {
    const value = extensionAPI?.settings?.get(key)
    return value !== null ? value : defaultValue
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

export function getDictionaryWithKeyValue(list, key, value) {
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

export function getBlockUidByContainsTextOnPage(text, page) {
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

export function isSecondDateAfter(firstDateString, secondDateString) {
    // Parse the dates from the strings
    const firstDate = new Date(firstDateString)
    const secondDate = new Date(secondDateString)

    // Compare the dates
    return secondDate > firstDate
}

// Helper function to parse the "Last Contacted" date
export function parseLastContactedDate(person) {
    const lastContacted = person["Last Contacted"]
    if (lastContacted && lastContacted.length > 0) {
        const dateString = lastContacted[0].string.match(/\[\[(.*?)\]\]/)[1]

        return window.roamAlphaAPI.util.pageTitleToDate(dateString)
    }
    return null
}
// Filter people with "Last Contacted" date within the last 3 months
export function filterLastContactedWithin3Months(people) {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    return people.filter((person) => {
        const lastContactedDate = parseLastContactedDate(person)
        console.log("lastContacted", lastContactedDate)

        return lastContactedDate && lastContactedDate >= threeMonthsAgo
    })
}
// Sort people by "Last Contacted" date
export function sortByLastContacted(people) {
    return people.sort((a, b) => {
        const dateA = parseLastContactedDate(a)
        const dateB = parseLastContactedDate(b)
        return dateB - dateA // Sort in descending order (most recent first)
    })
}
