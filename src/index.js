import displayBirthdays from "./components/birthday_drawer"
import { showToast } from "./components/toast"
import { getAllPeople, parseAgendaPull} from "./utils_reminders"
import { getPageUID, isSecondDateAfter } from "./utils"
import { checkAndFetchEvents, getEventInfo } from "./utils_gcal"
import {
    createLastWeekCalls,
    createLastMonthCalls,
    createPersonTemplates,
    createCallTemplates,
} from "./components/call_templates"
import TimeButton from "./components/time_button"

const testing = false
const version = "v1.2.4"

const plugin_title = "Roam CRM"

var runners = {
    intervals: [],
    eventListeners: [],
  };

let googleLoadedHandler

const pullPattern =
    "[:block/_refs :block/uid :node/title {:block/_refs [{:block/refs[:node/title]} :node/title :block/uid :block/string]}]"
const entity = '[:node/title "Agenda"]'
const pullFunction = async function a(before, after) {
    await parseAgendaPull(after)
}

function versionTextComponent() {
    return React.createElement("div", {}, version)
}

function headerTextComponent() {
    return React.createElement("h1", {})
}
//MARK: config panel
function createPanelConfig(extensionAPI) {
    const wrappedTimeConfig = () => TimeButton({ extensionAPI });
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
            {id:	 "a-list",
            name:   "A-List duration",
            description: "",
            action: {type:	 "reactComponent",
                      component: wrappedTimeConfig}},
            {
                id: "trigger-modal",
                name: "Trigger Modal at start of Day",
                description: "In addition to triggering on load this will also trigger the modal at the start of each day. This will be most useful for people who leave Roam open for extended periods.",
                action: {
                type: "switch",
                onChange: async (evt) => { 
                    
                }
                }},
            {id:     "batch-contact-notification",
            name:   "Batch Contact Reminders",
            description: "If a day is selected 'Time to reach out to' reminders will be batched and only shown on that day.",
            action: {type:     "select",
                    items:    ["No Batch", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                    onChange: (evt) => { console.log("Select Changed!", evt); }}},
            {
                id: "calendar-header",
                name: "Calendar Settings",
                action: { type: "reactComponent", component: headerTextComponent },
            },
            {
            id: "calendar-setting",
            name: "Import Today's Calender Events On Load",
            description: "Imports today's call events from a linked google calendar. Requires the Google extension from Roam Depot to be installed and a reload of the Roam tab to start. See the README",
            action: {
                type: "switch",
                onChange: async (evt) => { 
                    
                }
            }},
            
            {
            id: "include-event-title",
            name: "Include event title ",
            description: "When events import, include the events title in the call template header text",
            action: {
                type: "switch",
                onChange: (evt) => {  }
            }},
            {
                id: "agenda-header",
                name: "Agenda Addr Settings",
                action: { type: "reactComponent", component: headerTextComponent },
            },
            {
                id: "agenda-addr-setting",
                name: "Run the Agenda Addr",
                description: "When you make a block anywhere that has as persons name `[[Bill Gates]]` and add the hashtag `#Agenda` Roam CRM will automatically nest a block-ref of that block on Bill's page under an Agenda attribute.",
                action: {
                    type: "switch",
                    onChange: async (evt) => { 
                        if (evt.target.checked) {
                            await parseAgendaPull(window.roamAlphaAPI.pull(pullPattern, entity))
                            // agenda addr pull watch
                            window.roamAlphaAPI.data.addPullWatch(pullPattern, entity, pullFunction)
                        } else {
                            window.roamAlphaAPI.data.removePullWatch(pullPattern, entity, pullFunction)
                        }

                    }
            }},
            
            {
                id: "templates-header",
                name: "Setup Templates",
                description: "These are the templates that facilitate Roam CRM. Each button only needs to be hit once the first time you setup the extension in a graph. See the README for more information.",
                action: { type: "reactComponent", component: headerTextComponent },
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
                    "Imports the call template into your roam/templates page. This template structure is important for the rolloup queries to work.",
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
            {
                id: "person-template",
                name: "Imports Person Metadata Template",
                description:
                    "Imports the persom metadata template into your roam/templates page. This template structure is important for Roam CRM to work.",
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
            // {
            //   id: "switch-setting",
            //   name: "Switch Test",
            //   description: "Test switch component",
            //   action: {
            //     type: "switch",
            //     onChange: (evt) => { console.log("Switch!", evt); }
            //   }
            // },
            // {
            //   id: "input-setting",
            //   name: "Input test",
            //   action: {
            //     type: "input",
            //     placeholder: "placeholder",
            //     onChange: (evt) => { console.log("Input Changed!", evt); }
            //   }
            // },
            // {
            //   id: "select-setting",
            //   name: "Select test",
            //   action: {
            //     type: "select",
            //     items: ["one", "two", "three"],
            //     onChange: (evt) => { console.log("Select Changed!", evt); }
            //   }
            // }
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
            const lastBirthdayCheckDate = getLastBirthdayCheckDate(extensionAPI)

            displayBirthdays(allPeople, lastBirthdayCheckDate, extensionAPI)
        }
    }
}

function getLastBirthdayCheckDate(extensionAPI) {
    return extensionAPI.settings.get("last-birthday-check-date") || "01-19-2024"
}

function getCalendarSetting(extensionAPI) {
    return extensionAPI.settings.get("calendar-setting") || false
}

function getAgendaAddrSetting(extensionAPI) {
    return extensionAPI.settings.get("agenda-addr-setting") || false
}

function getDailyTriggerSetting(extensionAPI) {
    return extensionAPI.settings.get("trigger-modal") || false
}

async function setDONEFilter(page) {
    // sets a page filter to hide DONE tasks
    var fRemoves = await window.roamAlphaAPI.ui.filters.getPageFilters({ page: { title: page } })[
        "removes"
    ]
    // check if DONE is already filtered. if not add it
    const containsDONE = fRemoves.includes("DONE")
    // console.log(fRemoves, containsDONE);

    if (!containsDONE) {
        // console.log(`Set DONE filter for: ${page}`);
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
    target.addEventListener(event, callback);
    runners.eventListeners.push({ target, event, callback });
}

//MARK: Onload function
async function onload({ extensionAPI }) {
    const panelConfig = createPanelConfig(extensionAPI);
    extensionAPI.settings.panel.create(panelConfig)
    const ts1 = new Date().getTime()

    const people = await getAllPeople()
    // add left sidebar button
    crmbutton(extensionAPI)
    if (testing) {
        displayBirthdays(people, "01-19-2024", extensionAPI)
    } else {
        displayBirthdays(people, getLastBirthdayCheckDate(extensionAPI), extensionAPI)
    }

    // update last birthday check since it's already happened
    extensionAPI.settings.set(
        "last-birthday-check-date",
        window.roamAlphaAPI.util.dateToPageUid(new Date()),
    )
    if (getCalendarSetting(extensionAPI)) {
        // bring in the events, this should rely on getLastBirthdayCheckDate to avoid duplicates
        // listen for the google extension to be loaded
        if (window.roamjs?.extension?.google) {
            await getEventInfo(people, extensionAPI, testing)
        } else {
            googleLoadedHandler = createGoogleLoadedHandler(people, extensionAPI)
            document.body.addEventListener("roamjs:google:loaded", googleLoadedHandler)
        }
        // Set an interval to run the check and fetch google events every hour
        const intervalId = setInterval(() => checkAndFetchEvents(people, extensionAPI, testing), 60 * 60 * 1000);
        runners.intervals.push(intervalId);

        // set a listener to run the calendar check on visibility change. 
        // This is so the check runs right when your laptop is openend 
        addEventListener(document, 'visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                checkAndFetchEvents(people, extensionAPI, testing)
            }
        });
    }
    
    if (getDailyTriggerSetting(extensionAPI)) {
        // This is so the check runs right when your laptop is openend 
        addEventListener(document, 'visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                const todaysDNPUID = window.roamAlphaAPI.util.dateToPageUid(new Date())
                const lastBirthdayCheckDate = getLastBirthdayCheckDate(extensionAPI)
                if (isSecondDateAfter(lastBirthdayCheckDate, todaysDNPUID)) {
                    // is this redundant code?
                    displayBirthdays(people, lastBirthdayCheckDate, extensionAPI)
                    extensionAPI.settings.set(
                        "last-birthday-check-date",
                        window.roamAlphaAPI.util.dateToPageUid(new Date()),
                    )
                }
            }
        });
    }
    
    // always set people pages to hide DONE
    // TODO see if they want more granulity
    people.forEach(async (page) => {
        await setDONEFilter(page.title)
    })

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

            let sidebarWindows = window.roamAlphaAPI.ui.rightSidebar.getWindows()
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
    // Command Palette Sidebar - Close first block
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
            const focusedBlock = roamAlphaAPI.ui.getFocusedBlock();

            if (focusedBlock && focusedBlock['window-id'].startsWith('sidebar-')) {
                const sidebarWindows = window.roamAlphaAPI.ui.rightSidebar.getWindows();

                // Find the window in the sidebar that matches the window-id of the focused block
                const matchingWindow = sidebarWindows.find(window => window['window-id'] === focusedBlock['window-id']);

                if (matchingWindow) {
                    // toggle pin/unpin accordingly
                    if (matchingWindow['pinned?']) {
                        // If the window is pinned, unpin it
                        window.roamAlphaAPI.ui.rightSidebar.unpinWindow({
                            window: {
                                type: matchingWindow.type,
                                'block-uid': matchingWindow["block-uid"] || matchingWindow["page-uid"] || matchingWindow["mentions-uid"]
                            }
                        });
                    } else {
                        // If the window is not pinned, pin it
                        window.roamAlphaAPI.ui.rightSidebar.pinWindow({
                            window: {
                                type: matchingWindow.type,
                                'block-uid': matchingWindow["block-uid"] || matchingWindow["page-uid"] || matchingWindow["mentions-uid"]
                            }
                        });
                    }
                }
            } else {
                // block is not in the sidebar
                await window.roamAlphaAPI.ui.rightSidebar.addWindow(
                    {window:{type:'block', 'block-uid':focusedBlock['block-uid']}})
                await window.roamAlphaAPI.ui.rightSidebar.pinWindow({
                    window: {
                    type:'block', 
                    'block-uid':focusedBlock['block-uid']
                    }
                });
            }
        },
    })
    // Command Roam CRM - Open Modal
    extensionAPI.ui.commandPalette.addCommand({
        label: "Roam CRM - Open Modal",
        "disable-hotkey": false,
        callback: async () => {
            const allPeople = await getAllPeople()
            const lastBirthdayCheckDate = getLastBirthdayCheckDate(extensionAPI)

            displayBirthdays(allPeople, lastBirthdayCheckDate, extensionAPI)
        },
    })

    if (getAgendaAddrSetting(extensionAPI)) {
        // run the initial agenda addr
        await parseAgendaPull(window.roamAlphaAPI.pull(pullPattern, entity), extensionAPI)

        // agenda addr pull watch
        window.roamAlphaAPI.data.addPullWatch(pullPattern, entity, pullFunction)
    }
    
    if (!testing) {
        console.log(`load ${plugin_title} plugin`)
    }
}

function onunload() {
    document.body.removeEventListener("roamjs:google:loaded", googleLoadedHandler)

    window.roamAlphaAPI.data.removePullWatch(pullPattern, entity, pullFunction)
    var crmDiv = document.getElementById("crmDiv")
    crmDiv.remove()

    // make sure to remove the google calendar check
    for (let i = 0; i < runners.intervals.length; i++) {
        clearInterval(runners.intervals[i]);
      }
    runners.intervals = []; // Clear the array after stopping all intervals
    // now remove listeners
    for (let i = 0; i < runners.eventListeners.length; i++) {
        const { target, event, callback } = runners.eventListeners[i];
        target.removeEventListener(event, callback);
      }
    runners.eventListeners = []; // Clear the array after removing all event listeners

    if (!testing) {
        console.log(`unload ${plugin_title} plugin`)
    }
}

export default {
    onload,
    onunload,
}
