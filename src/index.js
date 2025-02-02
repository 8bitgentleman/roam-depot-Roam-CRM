import displayBirthdays from "./components/birthday_drawer"
import { showToast } from "./components/toast"
import { getAllPeople, parseAgendaPull } from "./utils_reminders"
import { getPageUID, isSecondDateAfter, getExtensionAPISetting } from "./utils"
import { getEventInfo } from "./utils_gcal"
import {
    createLastWeekCalls,
    createLastMonthCalls,
    createPersonTemplates,
    createCallTemplates,
} from "./components/call_templates"
import IntervalSettings from "./components/list_intervals"
import displayCRMDialog from "./components/clay"
import { moveFocus, getLastBlockAndFocus } from './utils';

const testing = false
const version = "v2.8.7"

const plugin_title = "Roam CRM"

var runners = {
    intervals: [],
    eventListeners: [],
    pullFunctions: [],
}

let googleLoadedHandler

const pullPattern =
    "[:block/_refs :block/uid :node/title {:block/_refs [{:block/refs[:node/title]} :node/title :block/uid :block/string]}]"
const entity = '[:node/title "Agenda"]'

function versionTextComponent() {
    return React.createElement("div", {}, version)
}

function headerTextComponent() {
    return React.createElement("h1", {})
}

//MARK: config panel
function createPanelConfig(extensionAPI, pullFunction) {
    const wrappedIntervalConfig = () => IntervalSettings({ extensionAPI })
    return {
        tabTitle: plugin_title,
        settings: [
            {
                id: "version-text",
                name: "Version",
                action: { type: "reactComponent", component: versionTextComponent },
            },
            {
                id: "modal-header",
                name: "Modal Settings",
                action: { type: "reactComponent", component: headerTextComponent },
            },
            {
                id: "batch-contact-notification",
                name: "Batch Contact Reminders",
                description:
                    "If a day is selected 'Time to reach out to' reminders will be batched and only shown on that day.",
                action: {
                    type: "select",
                    items: [
                        "No Batch",
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                        "Sunday",
                    ],
                },
            },
            {
                id: "interval-settings",
                name: "Contact Frequency Intervals",
                description:
                    "Set custom contact frequency durations. See the README for more info.",
                className: "crm-reminders-interval-setting",
                action: { type: "reactComponent", component: wrappedIntervalConfig },
            },
            {
                id: "sidebar-button",
                name: "Left Sidebar Button",
                description: "Add a button to the left sidebar to quickly launch the CRM",
                action: {
                    type: "switch",
                    onChange: (evt) => {
                        if (evt.target.checked) {
                            crmbutton(extensionAPI)
                        } else {
                            var crmDiv = document.getElementById("crmDiv")
                            crmDiv.remove()
                        }
                    },
                },
            },
            {
                id: "trigger-modal",
                name: "Trigger modal at start of day",
                description:
                    "In addition to triggering on load this will also trigger the modal at the start of each day. This will be most useful for people who leave Roam open for extended periods.",
                action: {
                    type: "switch",
                    onChange: async (evt) => {
                        // TODO is this ever removed?
                    },
                },
            },
            {
                id: "trigger-modal-on-load",
                name: "Prevent modal triggering on load",
                description:
                    "This prevents the CRM Modal opening when Roam is first opened.",
                action: {
                    type: "switch",
                    onChange: async (evt) => {
                        // TODO is this ever removed?
                    },
                },
            },
            {
                id: "dnp-all-birthdays",
                name: "Include A/B List birthdays on Daily Notes",
                description: "When enabled, birthdays for A/B List contacts will appear on Daily Notes pages alongside other birthdays. By default, A/B List birthdays only appear in the CRM drawer. F List birthdays are always excluded.",
                action: {
                    type: "switch",
                },
            },
            {
                id: "calendar-header",
                name: "Calendar Settings",
                action: { type: "reactComponent", component: headerTextComponent },
            },
            {
                id: "calendar-setting",
                name: "Import Today's Calender Events On Load",
                description:
                    "Imports today's call events from a linked google calendar. Requires the Google extension from Roam Depot to be installed and a reload of the Roam tab to start. See the README",
                action: {
                    type: "switch",
                    onChange: async (evt) => { },
                },
            },

            {
                id: "include-event-title",
                name: "Include event title ",
                description:
                    "When events import, include the events title in the call template header text",
                action: {
                    type: "switch",
                    onChange: (evt) => { },
                },
            },
            {
                id: "agenda-header",
                name: "Agenda Addr Settings",
                action: { type: "reactComponent", component: headerTextComponent },
            },

            {
                id: "agenda-addr-setting",
                name: "Run the Agenda Addr",
                description:
                    "When you make a block anywhere that has as persons name `[[Bill Gates]]` and add the hashtag `#Agenda` Roam CRM will automatically nest a block-ref of that block on Bill's page under an Agenda attribute.",
                action: {
                    type: "switch",
                    onChange: async (evt) => {
                        if (evt.target.checked) {
                            await parseAgendaPull(
                                window.roamAlphaAPI.pull(pullPattern, entity),
                                extensionAPI,
                            )
                            // agenda addr pull watch
                            window.roamAlphaAPI.data.addPullWatch(pullPattern, entity, pullFunction)
                        } else {
                            window.roamAlphaAPI.data.removePullWatch(
                                pullPattern,
                                entity,
                                pullFunction,
                            )
                        }
                    },
                },
            },
            {
                id: "agenda-addr-remove-names",
                name: "Remove #tagged names in Agenda Addr blocks",
                description:
                    "In a block tagged [[Agenda]] (and when the Agenda Addr is turned on) If a person's name is tagged with a hashtag ( #[[Steve Jobs]] ), then the tagged name will be auto removed after the Agenda Addr is run.",
                action: { type: "switch" },
            },
            {
                id: "templates-header",
                name: "Setup Templates",
                description:
                    "Below are the templates that facilitate Roam CRM. Each button only needs to be hit once the first time you setup the extension in a graph. See the README for more information.",
                action: { type: "reactComponent", component: headerTextComponent },
            },
            {
                id: "person-template",
                name: "Imports Person Metadata Template",
                description:
                    "Imports the person metadata template into your roam/templates page. This template structure is important for Roam CRM to work.",
                action: {
                    type: "button",
                    onClick: async () => {
                        const templatePageUID = await getPageUID("roam/templates")
                        createPersonTemplates(templatePageUID)
                        showToast(`Template Added.`, "SUCCESS")
                    },
                    content: "Import",
                },
            },
            {
                id: "call-rollup-query",
                name: "Import Call Rollup Queries",
                description:
                    "Imports the rollup query templates to your `[[Call]]` page. These can be referenced or added to templates as needed.",
                action: {
                    type: "button",
                    onClick: async () => {
                        const callPageUID = await getPageUID("Call")
                        createLastMonthCalls(callPageUID)
                        createLastWeekCalls(callPageUID)

                        showToast(`Templates Added.`, "SUCCESS")
                    },
                    content: "Import",
                },
            },
            {
                id: "call-template",
                name: "Import Call Template",
                description:
                    "Imports the call template into your roam/templates page. This template structure is important for the rollup queries to work.",
                action: {
                    type: "button",
                    onClick: async () => {
                        const templatePageUID = await getPageUID("roam/templates")
                        createCallTemplates(templatePageUID)
                        showToast(`Template Added.`, "SUCCESS")
                    },
                    content: "Import",
                },
            },
        ],
    }
}

async function crmbutton(extensionAPI) {
    //creates a new left sidebar log button below Daily Notes

    if (!document.getElementById("crmDiv")) {
        var divCRM = document.createElement("div")
        divCRM.classList.add("log-button")
        divCRM.innerHTML = "Roam CRM"
        divCRM.id = "crmDiv"
        var spanCRM = document.createElement("span")
        spanCRM.classList.add("bp3-icon", "bp3-icon-people", "icon")
        divCRM.prepend(spanCRM)
        var sidebarcontent = document.querySelector(
            "#app > div.roam-body > div.roam-app > div.roam-sidebar-container.noselect > div",
        ),
            sidebartoprow = sidebarcontent.childNodes[1]
        if (sidebarcontent && sidebartoprow) {
            sidebartoprow.parentNode.insertBefore(divCRM, sidebartoprow.nextSibling)
        }
        divCRM.onclick = async () => {
            const allPeople = await getAllPeople()
            displayCRMDialog(allPeople)
        }
    }
}

async function setDONEFilter(page) {
    // sets a page filter to hide DONE tasks
    var fRemoves = await window.roamAlphaAPI.ui.filters.getPageFilters({ page: { title: page } })[
        "removes"
    ]
    // check if DONE is already filtered. if not add it
    const containsDONE = fRemoves.includes("DONE")

    if (!containsDONE) {
        fRemoves.push("DONE")
        await window.roamAlphaAPI.ui.filters.setPageFilters({
            page: { title: page },
            filters: { removes: fRemoves },
        })
    }
}

function createGoogleLoadedHandler(people, extensionAPI) {
    // handler for loading events once the google extension has finished loading
    return async function handleGoogleLoaded() {
        if (window.roamjs?.extension.smartblocks) {
            await getEventInfo(people, extensionAPI, testing)
        }
    }
}

// Function to add an event listener and store its reference
function addEventListener(target, event, callback) {
    target.addEventListener(event, callback)
    runners.eventListeners.push({ target, event, callback })
}

//MARK: onload
async function onload({ extensionAPI }) {
    const pullFunction = async function a(before, after) {
        await parseAgendaPull(after, extensionAPI)
    }
    // add to runners so it can be removed later
    runners.pullFunctions.push(pullFunction)

    const panelConfig = createPanelConfig(extensionAPI, pullFunction)
    extensionAPI.settings.panel.create(panelConfig)
    const ts1 = new Date().getTime()

    const people = await getAllPeople()
    // add left sidebar button
    // sidebar-button
    if (getExtensionAPISetting(extensionAPI, "sidebar-button", false)) {
        crmbutton(extensionAPI)
    }

    if (testing) {
        displayCRMDialog(people)
        // displayBirthdays(people, "01-19-2024", extensionAPI)
    } else {
        if (!getExtensionAPISetting(extensionAPI, "trigger-modal-on-load", false)) {
            displayBirthdays(
                people,
                getExtensionAPISetting(extensionAPI, "last-birthday-check-date", "01-19-2024"),
                extensionAPI,
            )
        }

    }

    // update last birthday check since it's already happened
    extensionAPI.settings.set(
        "last-birthday-check-date",
        window.roamAlphaAPI.util.dateToPageUid(new Date()),
    )

    if (getExtensionAPISetting(extensionAPI, "calendar-setting", false)) {
        // bring in the events
        // listen for the google extension to be loaded
        if (window.roamjs?.extension?.google) {
            await getEventInfo(people, extensionAPI, testing)
        } else {
            googleLoadedHandler = createGoogleLoadedHandler(people, extensionAPI)
            document.body.addEventListener("roamjs:google:loaded", googleLoadedHandler)
        }
        // Set an interval to fetch google events every hour
        const intervalId = setInterval(
            () => getEventInfo(people, extensionAPI, testing),
            60 * 60 * 1000,
        )
        runners.intervals.push(intervalId)

        // set a listener to run the calendar check on visibility change.
        // This is so the check runs right when your laptop is openend
        addEventListener(document, "visibilitychange", () => {
            if (document.visibilityState === "visible") {
                getEventInfo(people, extensionAPI, testing)
            }
        })
    }

    if (getExtensionAPISetting(extensionAPI, "trigger-modal", false)) {
        // This is so the check runs right when your laptop is openend
        addEventListener(document, "visibilitychange", () => {
            if (document.visibilityState === "visible") {
                const todaysDNPUID = window.roamAlphaAPI.util.dateToPageUid(new Date())
                const lastBirthdayCheckDate = getExtensionAPISetting(
                    extensionAPI,
                    "last-birthday-check-date",
                    "01-19-2024",
                )
                if (isSecondDateAfter(lastBirthdayCheckDate, todaysDNPUID)) {
                    // is this redundant code?
                    displayBirthdays(people, lastBirthdayCheckDate, extensionAPI)
                    extensionAPI.settings.set(
                        "last-birthday-check-date",
                        window.roamAlphaAPI.util.dateToPageUid(new Date()),
                    )
                }
            }
        })
    }

    // always set people pages to hide DONE
    // TODO put this behind a flag
    people.forEach(async (page) => {
        await setDONEFilter(page.title)
    })

    //MARK: command palette
    // Command Palette Sidebar - Close first block
    extensionAPI.ui.commandPalette.addCommand({
        label: "Sidebar - Close first block",
        "disable-hotkey": false,
        callback: async () => {
            async function removeWindow(w) {
                window.roamAlphaAPI.ui.rightSidebar.removeWindow({
                    window: {
                        type: w["type"],
                        "block-uid": w["block-uid"] || w["page-uid"] || w["mentions-uid"],
                    },
                })
            }

            const focusedBlock = window.roamAlphaAPI.ui.getFocusedBlock()
            const sidebarWindows = window.roamAlphaAPI.ui.rightSidebar.getWindows()

            // Check if cursor is in sidebar
            const isInSidebar = focusedBlock && focusedBlock["window-id"].startsWith('sidebar-')
            
            if (isInSidebar) {
                // Find the window that matches the focused block
                const focusedWindow = sidebarWindows.find(
                    window => window["window-id"] === focusedBlock["window-id"]
                )

                // If cursor is in a pinned or superpinned block, close it
                if (focusedWindow && (focusedWindow["pinned?"] || focusedWindow["pinned-to-top?"])) {
                    await removeWindow(focusedWindow)
                    return
                }
            }

            // Default behavior: close first non-pinned block
            const filteredBlocks = sidebarWindows.filter((obj) => !obj["pinned?"])
            if (filteredBlocks.length > 0) {
                filteredBlocks.sort((a, b) => a.order - b.order)
                await removeWindow(filteredBlocks[0])
            }
        },
    })
    // Command Palette Sidebar - Cursor in first block
    extensionAPI.ui.commandPalette.addCommand({
        label: "Sidebar - Cursor in first block",
        "disable-hotkey": false,
        callback: async () => {
            let sidebarWindows = window.roamAlphaAPI.ui.rightSidebar.getWindows()

            if (sidebarWindows.length > 0) {
                let first = sidebarWindows[0]
                if (first.type == "block") {
                    window.roamAlphaAPI.ui.setBlockFocusAndSelection({
                        location: {
                            "block-uid": first["block-uid"],
                            "window-id": first["window-id"],
                        },
                    })
                } else if (first.type == "outline") {
                    let query = `[:find (pull ?e [:block/string :block/uid :block/children :block/order {:block/children ...}])
                            :in $ ?uid
                            :where 
                  [?e :block/uid ?uid]
                  ]`

                    let result = window.roamAlphaAPI.q(query, first["page-uid"]).flat()
                    const selectedObject = result[0].children.find((obj) => obj.order === 0)
                    window.roamAlphaAPI.ui.setBlockFocusAndSelection({
                        location: {
                            "block-uid": selectedObject["uid"],
                            "window-id": first["window-id"],
                        },
                    })
                }
            }
        },
    })
    // Command Palette Sidebar - Toggle first sidebar window open/close
    extensionAPI.ui.commandPalette.addCommand({
        label: "Sidebar - Toggle first sidebar window open/close",
        "disable-hotkey": false,
        callback: async () => {
            async function toggleWindowCollapse(w) {
                if (w["collapsed?"] === true) {
                    window.roamAlphaAPI.ui.rightSidebar.expandWindow({
                        window: {
                            type: w["type"],
                            "block-uid": w["block-uid"] || w["page-uid"] || w["mentions-uid"],
                        },
                    })
                } else if (w["collapsed?"] === false) {
                    window.roamAlphaAPI.ui.rightSidebar.collapseWindow({
                        window: {
                            type: w["type"],
                            "block-uid": w["block-uid"] || w["page-uid"] || w["mentions-uid"],
                        },
                    })
                }
            }

            let sidebarWindows = window.roamAlphaAPI.ui.rightSidebar.getWindows()

            if (sidebarWindows.length > 0) {
                sidebarWindows.sort((a, b) => a.order - b.order)
                await toggleWindowCollapse(sidebarWindows[0])
            }
        },
    })
    // Command Palette Sidebar - Pin focused block or page
    extensionAPI.ui.commandPalette.addCommand({
        label: "Sidebar - Pin focused block or page",
        "disable-hotkey": false,
        callback: async () => {
            const focusedBlock = roamAlphaAPI.ui.getFocusedBlock()
            // If no block is focused, do nothing
            if (!focusedBlock) return

            if (focusedBlock["window-id"].startsWith("sidebar-")) {
                const sidebarWindows = window.roamAlphaAPI.ui.rightSidebar.getWindows()

                // Find the window in the sidebar that matches the window-id of the focused block
                const matchingWindow = sidebarWindows.find(
                    (window) => window["window-id"] === focusedBlock["window-id"],
                )

                if (matchingWindow) {
                    // toggle pin/unpin accordingly
                    if (matchingWindow["pinned?"]) {
                        // If the window is pinned, unpin it
                        window.roamAlphaAPI.ui.rightSidebar.unpinWindow({
                            window: {
                                type: matchingWindow.type,
                                "block-uid":
                                    matchingWindow["block-uid"] ||
                                    matchingWindow["page-uid"] ||
                                    matchingWindow["mentions-uid"],
                            },
                        })
                    } else {
                        // If the window is not pinned, pin it
                        window.roamAlphaAPI.ui.rightSidebar.pinWindow({
                            window: {
                                type: matchingWindow.type,
                                "block-uid":
                                    matchingWindow["block-uid"] ||
                                    matchingWindow["page-uid"] ||
                                    matchingWindow["mentions-uid"],
                            },
                        })
                    }
                }
            } else {
                // block is not in the sidebar
                // Let's first add it to the sidebar
                await window.roamAlphaAPI.ui.rightSidebar.addWindow({
                    window: { type: "block", "block-uid": focusedBlock["block-uid"] },
                })
                
                // Get updated sidebar windows to find our newly added window
                const updatedSidebarWindows = window.roamAlphaAPI.ui.rightSidebar.getWindows()
                const newWindow = updatedSidebarWindows.find(
                    window => window.type === "block" && 
                             window["block-uid"] === focusedBlock["block-uid"]
                )

                if (newWindow) {
                    if (newWindow["pinned?"]) {
                        // If already pinned, unpin it
                        window.roamAlphaAPI.ui.rightSidebar.unpinWindow({
                            window: {
                                type: "block",
                                "block-uid": focusedBlock["block-uid"],
                            },
                        })
                    } else {
                        // If not pinned, pin it
                        window.roamAlphaAPI.ui.rightSidebar.pinWindow({
                            window: {
                                type: "block",
                                "block-uid": focusedBlock["block-uid"],
                            },
                        })
                    }
                }
            }
        },
    })
    // Command Palette Sidebar - Super Pin (pin to top) focused block or page
    extensionAPI.ui.commandPalette.addCommand({
        label: "Sidebar - Pin focused block or page to top",
        "disable-hotkey": false,
        callback: async () => {
            const focusedBlock = roamAlphaAPI.ui.getFocusedBlock()
            // If no block is focused, do nothing
            if (!focusedBlock) return

            if (focusedBlock["window-id"].startsWith("sidebar-")) {
                const sidebarWindows = window.roamAlphaAPI.ui.rightSidebar.getWindows()

                // Find the window in the sidebar that matches the window-id of the focused block
                const matchingWindow = sidebarWindows.find(
                    (window) => window["window-id"] === focusedBlock["window-id"],
                )

                if (matchingWindow) {
                    // toggle pin/unpin accordingly
                    if (matchingWindow["pinned?"]) {
                        // If the window is pinned, unpin it
                        window.roamAlphaAPI.ui.rightSidebar.unpinWindow({
                            window: {
                                type: matchingWindow.type,
                                "block-uid":
                                    matchingWindow["block-uid"] ||
                                    matchingWindow["page-uid"] ||
                                    matchingWindow["mentions-uid"],
                            },
                        })
                    } else {
                        // If the window is not pinned, pin it
                        window.roamAlphaAPI.ui.rightSidebar.pinWindow({
                            window: {
                                type: matchingWindow.type,
                                "block-uid":
                                    matchingWindow["block-uid"] ||
                                    matchingWindow["page-uid"] ||
                                    matchingWindow["mentions-uid"],
                            },
                            "pin-to-top?": true,
                        })
                    }
                }
            } else {
                // block is not in the sidebar
                // Let's first add it to the sidebar
                await window.roamAlphaAPI.ui.rightSidebar.addWindow({
                    window: { type: "block", "block-uid": focusedBlock["block-uid"] },
                })
                
                // Get updated sidebar windows to find our newly added window
                const updatedSidebarWindows = window.roamAlphaAPI.ui.rightSidebar.getWindows()
                const newWindow = updatedSidebarWindows.find(
                    window => window.type === "block" && 
                             window["block-uid"] === focusedBlock["block-uid"]
                )

                if (newWindow) {
                    if (newWindow["pinned-to-top?"]) {
                        // If already pinned to top, unpin it
                        window.roamAlphaAPI.ui.rightSidebar.unpinWindow({
                            window: {
                                type: "block",
                                "block-uid": focusedBlock["block-uid"],
                            },
                        })
                    } else {
                        // If not pinned to top, pin it
                        window.roamAlphaAPI.ui.rightSidebar.pinWindow({
                            window: {
                                type: "block",
                                "block-uid": focusedBlock["block-uid"],
                            },
                            "pin-to-top?": true,
                        })
                    }
                }
            }
        },
    })
    // Command Palette Sidebar - Nav Up open sidebar windows
    extensionAPI.ui.commandPalette.addCommand({
        label: 'Sidebar - Navigate Up',
        callback: () => moveFocus('up'),
        "disable-hotkey": false,
    });
    // Command Palette Sidebar - Nav Down open sidebar windows
    extensionAPI.ui.commandPalette.addCommand({
        label: 'Sidebar - Navigate Down',
        callback: () => moveFocus('down'),
        "disable-hotkey": false,
    });

    // Command Roam CRM - Open Modal
    extensionAPI.ui.commandPalette.addCommand({
        label: "Roam CRM - Open Modal",
        "disable-hotkey": false,
        callback: async () => {
            const allPeople = await getAllPeople()
            const lastBirthdayCheckDate = getExtensionAPISetting(
                extensionAPI,
                "last-birthday-check-date",
                "01-19-2024",
            )

            displayBirthdays(allPeople, lastBirthdayCheckDate, extensionAPI)
        },
    })
    // Command Roam CRM - Open Full Page UI
    extensionAPI.ui.commandPalette.addCommand({
        label: "Roam CRM - Open Full Workspace UI", //TODO come up with a better name for this
        "disable-hotkey": false,
        callback: async () => {
            const allPeople = await getAllPeople()
            displayCRMDialog(allPeople)
        },
    })
    // Command Palette Quick Capture - Create a new DNP block and focus it in the sidebar
    extensionAPI.ui.commandPalette.addCommand({
        label: "Sidebar - Create new DNP block and focus it in the sidebar",
        callback: async () => {
            const todayDate = new Date();
            const dailyNoteUid = window.roamAlphaAPI.util.dateToPageUid(todayDate);
            const blockUid = window.roamAlphaAPI.util.generateUID();

            // Create the new block
            await window.roamAlphaAPI.data.block.create({
                location: {
                    "parent-uid": dailyNoteUid,
                    order: "last"
                },
                block: {
                    uid: blockUid,
                    string: ""
                }
            });

            // Open in sidebar and get window info
            await window.roamAlphaAPI.ui.rightSidebar.addWindow({
                window: {
                    type: "block",
                    "block-uid": blockUid
                }
            });

            // Find the window ID
            const windows = window.roamAlphaAPI.ui.rightSidebar.getWindows();
            const newWindow = windows.find(win =>
                win.type === "block" && win["block-uid"] === blockUid
            );

            if (newWindow) {
                // Set focus to the new block
                window.roamAlphaAPI.ui.setBlockFocusAndSelection({
                    location: {
                        "block-uid": blockUid,
                        "window-id": newWindow["window-id"]
                    }
                });
            }
        },
        "default-hotkey": "ctrl-shift-n"
    });
    // Command Palette Roam Navigation - Go to last block on page
    extensionAPI.ui.commandPalette.addCommand({
        label: "Navigation - Go to last block on page", 
        callback: getLastBlockAndFocus,
        "disable-hotkey": false,
    });
    //MARK: agenda addr
    if (getExtensionAPISetting(extensionAPI, "agenda-addr-setting", false)) {
        // run the initial agenda addr
        await parseAgendaPull(window.roamAlphaAPI.pull(pullPattern, entity), extensionAPI)

        // agenda addr pull watch
        window.roamAlphaAPI.data.addPullWatch(pullPattern, entity, pullFunction)
    }

    if (!testing) {
        console.log(`load ${plugin_title} plugin`)
    }
}
// MARK: unload
function onunload() {
    document.body.removeEventListener("roamjs:google:loaded", googleLoadedHandler)

    // remove pull watches
    for (let i = 0; i < runners.pullFunctions.length; i++) {
        window.roamAlphaAPI.data.removePullWatch(pullPattern, entity, runners.pullFunctions[i])
    }
    runners.pullFunctions = [] // Clear the array after stopping all intervals

    // remove the sidebar button
    var crmDiv = document.getElementById("crmDiv")
    if (crmDiv) {
        crmDiv.remove()
    }

    // make sure to remove the google calendar check
    for (let i = 0; i < runners.intervals.length; i++) {
        clearInterval(runners.intervals[i])
    }
    runners.intervals = [] // Clear the array after stopping all intervals

    //\ remove listeners
    for (let i = 0; i < runners.eventListeners.length; i++) {
        const { target, event, callback } = runners.eventListeners[i]
        target.removeEventListener(event, callback)
    }
    runners.eventListeners = [] // Clear the array after removing all event listeners

    if (!testing) {
        console.log(`unload ${plugin_title} plugin`)
    }
}

export default {
    onload,
    onunload,
}
