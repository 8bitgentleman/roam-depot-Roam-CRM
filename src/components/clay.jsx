import React, { useState, useEffect } from "react"
import renderOverlay from "roamjs-components/util/renderOverlay"
import {
    Dialog,
    Classes,
    Tab,
    Tabs,
    InputGroup,
    Button,
    Menu,
    MenuItem,
    Popover,
    Position,
    Icon,
    Tooltip,
} from "@blueprintjs/core"
import { getAllPageRefEvents } from "../utils_reminders"

const CRMDialog = ({ onClose, isOpen, people }) => {
    const [selectedPersonUID, setSelectedPersonUID] = useState(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [sortOption, setSortOption] = useState("firstName")
    const [sortOrder, setSortOrder] = useState("asc")
    const [selectedTabId, setSelectedTabId] = useState("people") // Default to "people" tab
    const [combinedEvents, setCombinedEvents] = useState([])
    
    useEffect(() => {
        const birthdayEvents = people
            .filter((b) => b.birthday) // Omit entries with null birthdays
            .map((b) => ({
                type: "birthday",
                date: new Date(b.birthday).getTime(),
                title: b.title,
                ref: b.uid,
            }))

        // const nameList = people.map((obj) => obj.title)
        const missingTitle = people.filter((obj) => obj.title === undefined)
        const nameList = people
            .filter((obj) => obj.title !== undefined) // Filter out objects without a title
            .map((obj) => obj.title) // Extract the titles

        const peopleRefEvents = getAllPageRefEvents(nameList)
        const data = [...birthdayEvents, ...peopleRefEvents]
        // sometimes there are multiple people referenced in a block. Strip out duplicates
        const uniqueRefs = new Set()
        const events = data.filter((item) => {
            if (uniqueRefs.has(item.ref)) {
                return false
            } else {
                uniqueRefs.add(item.ref)
                return true
            }
        })
        // Sort the combined list by date
        events.sort((a, b) => a.date - b.date)
        // reverse from most recent to last
        events.reverse()

        setCombinedEvents(events)
    }, [people])

    const getPersonTitle = (person) => {
        return person && person.title ? person.title.replace("PERSON: ", "") : "Unknown"
    }

    const getPersonFirstName = (person) => {
        return getPersonTitle(person).split(" ")[0]
    }

    const getPersonLastName = (person) => {
        const nameParts = getPersonTitle(person).split(" ")
        return nameParts[nameParts.length - 1]
    }

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value.toLowerCase())
        setSelectedPersonUID(null)
    }

    const handleSortChange = (option) => {
        setSortOption(option)
    }

    const handleSortOrderChange = (order) => {
        setSortOrder(order)
    }

    const sortPeople = (people) => {
        return [...people].sort((a, b) => {
            let comparison = 0

            if (sortOption === "firstName") {
                comparison = getPersonFirstName(a).localeCompare(getPersonFirstName(b))
            } else if (sortOption === "lastName") {
                comparison = getPersonLastName(a).localeCompare(getPersonLastName(b))
            } else if (sortOption === "lastContacted") {
                const dateA = new Date(a.last_contact)
                const dateB = new Date(b.last_contact)
                comparison = dateA - dateB
            }

            return sortOrder === "asc" ? comparison : -comparison
        })
    }

    const filteredPeople = sortPeople(
        people.filter((person) => getPersonTitle(person).toLowerCase().includes(searchQuery)),
    )

    const filteredEvents = combinedEvents.filter((event) =>
        (event.title || event.string).toLowerCase().includes(searchQuery),
    )

    const selectedPerson = people.find((person) => person.uid === selectedPersonUID)
    const selectedEvent = combinedEvents.find((event) => event.ref === selectedPersonUID)

    useEffect(() => {
        const blockContainer1 = document.getElementById("block-container-1")

        if (blockContainer1) {
            // Unmount previous blocks if they exist
            window.roamAlphaAPI.ui.components
                .unmountNode({
                    el: blockContainer1,
                })
                .then(() => {
                    if (selectedPerson || selectedEvent) {
                        // Render new block
                        const uid = selectedPerson ? selectedPerson.uid : selectedEvent.ref
                        window.roamAlphaAPI.ui.components.renderBlock({
                            uid,
                            el: blockContainer1,
                        })
                    }
                })
        }
    }, [selectedPerson, selectedEvent])

    const PeopleList = () => (
        <Menu className="main-section" style={{ flex: "1", overflowY: "auto", padding: "10px" }}>
            {filteredPeople.map((person) => (
                <MenuItem
                    key={person.uid}
                    text={getPersonTitle(person)}
                    active={person.uid === selectedPersonUID}
                    onClick={() => setSelectedPersonUID(person.uid)}
                />
            ))}
        </Menu>
    )

    const EventList = () => (
        <Menu className="main-section" style={{ flex: "1", overflowY: "auto", padding: "10px" }}>
            {filteredEvents.map((event, index) => {
                let icon
                if (event.type === "birthday") {
                    icon = "crown"
                } else if (event.string && event.string.toLowerCase().includes("call")) {
                    icon = "phone"
                } else if (event.string && event.string.toLowerCase().includes("meeting")) {
                    icon = "people" //I don't think this is available in roam's versino of blueprint
                } else if (event.string && event.string.toLowerCase().includes("1:1")) {
                    icon = "people"
                } else {
                    icon = "blank"
                }

                const eventText =
                    event.type === "birthday"
                        ? `${event.title || event.string}'s Birthday`
                        : event.title || event.string

                return (
                    <MenuItem
                        key={index}
                        icon={<Icon icon={icon} />}
                        text={`${new Date(event.date).toLocaleDateString()} - ${eventText}`}
                        onClick={() => setSelectedPersonUID(event.ref)}
                    />
                )
            })}
        </Menu>
    )

    const SortMenu = () => (
        <Menu>
            <MenuItem text="First Name" onClick={() => handleSortChange("firstName")} />
            <MenuItem text="Last Name" onClick={() => handleSortChange("lastName")} />
            <MenuItem text="Last Contacted" onClick={() => handleSortChange("lastContacted")} />
            <Menu.Divider />
            <MenuItem text="Ascending" onClick={() => handleSortOrderChange("asc")} />
            <MenuItem text="Descending" onClick={() => handleSortOrderChange("desc")} />
        </Menu>
    )

    return (
        <Dialog
            className="crm-dialog"
            isOpen={isOpen}
            onClose={onClose}
            canEscapeKeyClose={true}
            canOutsideClickClose={true}
            style={{
                width: "90vw",
                height: "80vh",
                maxWidth: "none",
                maxHeight: "none",
                paddingBottom: "0",
            }}
        >
            <div
                className={Classes.DIALOG_BODY}
                style={{ display: "flex", height: "100%", margin: "0" }}
            >
                <div
                    className="left-sidebar"
                    style={{ width: "200px", borderRight: "1px solid #e1e8ed", padding: "20px" }}
                >
                    <h4>CRM Workspace</h4>
                    <Tabs
                        id="tabs"
                        vertical
                        style={{ height: "calc(100% - 100px)" }}
                        selectedTabId={selectedTabId}
                        onChange={(newTabId) => setSelectedTabId(newTabId)}
                    >
                        <Tab id="home" title="Home" disabled />
                        <Tab id="people" title="People" />
                        <Tab id="events" title="Events" />
                    </Tabs>
                </div>

                {/* Center Section for List */}
                <div
                    className="list-section"
                    style={{
                        flex: "1",
                        padding: "0 10px 10px 10px",
                        overflowY: "auto",
                        position: "relative",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "10px",
                            position: "sticky",
                            top: "0",
                            borderBottom: "1px solid #e1e8ed",
                            backgroundColor: "#ebf1f5",
                            zIndex: "1",
                            padding: "30px 0 10px 0",
                        }}
                    >
                        <h4 style={{ margin: 0, flexShrink: 0 }}>
                            {(() => {
                                switch (selectedTabId) {
                                    case "home":
                                        return "Home"
                                    case "people":
                                        return "People"
                                    case "events":
                                        return "Events"
                                    default:
                                        return "Unknown Tab"
                                }
                            })()}
                        </h4>
                        <div
                            style={{
                                flex: 2,
                                display: "flex",
                                alignItems: "center",
                                marginLeft: "10px",
                                marginRight: "10px",
                            }}
                        >
                            <InputGroup
                                onChange={handleSearchChange}
                                leftIcon="search"
                                placeholder={(() => {
                                    switch (selectedTabId) {
                                        case "home":
                                            return "Search..."
                                        case "people":
                                            return `Search ${filteredPeople.length} people...`
                                        case "events":
                                            return `Search ${filteredEvents.length} events...`
                                        default:
                                            return "Search..."
                                    }
                                })()}
                                style={{ width: "1000 px" }}
                            />
                        </div>
                        {selectedTabId === "people" && (
                            <Popover content={<SortMenu />} position={Position.BOTTOM_RIGHT}>
                                <Button icon="sort" minimal style={{ flexShrink: 0 }} />
                            </Popover>
                        )}
                    </div>
                    {(() => {
                        switch (selectedTabId) {
                            case "home":
                                return <HomeContent />
                            case "people":
                                return <PeopleList />
                            case "events":
                                return <EventList />
                            default:
                                return <div>Unknown tab content</div>
                        }
                    })()}
                </div>
                {/* Right Details Section */}
                <div
                    className="details-section"
                    style={{ width: "300px", padding: "10px", overflowY: "auto", padding: "20px" }}
                >
                    {selectedPerson || selectedEvent ? (
                        <>
                            <h4
                                style={{
                                    marginTop: "10px",
                                    borderBottom: "1px solid rgb(225, 232, 237)",
                                    padding: "7px 0 10px 0",
                                }}
                            >
                                {selectedPerson
                                    ? getPersonTitle(selectedPerson)
                                    : selectedEvent.type === "birthday"
                                      ? `${selectedEvent.title || selectedEvent.string}'s Birthday`
                                      : selectedEvent.title || selectedEvent.page.title}
                            </h4>
                            <div id="block-container-1" style={{ marginTop: "10px" }}></div>
                        </>
                    ) : (
                        <div>Select a person or event to view details</div>
                    )}
                </div>
            </div>
        </Dialog>
    )
}

const displayCRMDialog = async (people) => {
    if (document.getElementsByClassName("crm-dialog").length === 0) {
        renderOverlay({
            Overlay: CRMDialog,
            props: { isOpen: true, people },
        })
    }
}

export default displayCRMDialog
