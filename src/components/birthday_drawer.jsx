import {
    Drawer,
    Classes,
    Tooltip,
    AnchorButton,
    Collapse,
    Button,
    TextArea,
    Checkbox,
} from "@blueprintjs/core"
import React, { useState, useEffect } from "react"
import renderOverlay from "roamjs-components/util/renderOverlay"
import remindersSystem from "../utils_reminders"
import { calculateAge } from "../utils_reminders"
import { getEventInfo } from "../utils_gcal"
import updateBlock from "roamjs-components/writes/updateBlock"
import createBlock from "roamjs-components/writes/createBlock"
import displayCRMDialog from "./clay"

const BirthdayDrawer = ({ onClose, isOpen, people, lastBirthdayCheck, extensionAPI }) => {
    // State to store the reminders data
    const [reminders, setReminders] = useState({
        aAndBBirthdaysToday: [],
        otherBirthdaysToday: [],
        filteredUpcomingBirthdays: [],
        toBeContacted: [],
    })

    // State to track which contacts have been checked
    const [checkedContacts, setCheckedContacts] = useState([])

    // State to track which accordions are open
    const [openIndexes, setOpenIndexes] = useState([])

    // State to track the messages for each person
    const [messages, setMessages] = useState({})

    // Fetch the reminders data only once when the component mounts
    useEffect(() => {
        const data = remindersSystem(people, lastBirthdayCheck, extensionAPI)
        setReminders(data)
    }, [lastBirthdayCheck])

    // Handler for checkbox change
    const handleCheckboxChange = (contactName) => {
        let dt = window.roamAlphaAPI.util.dateToPageTitle(new Date())
        // update the attribute when the checkbox is clicked
        updateBlock({
            uid: contactName.last_contact_uid,
            text: `Last Contacted:: [[${dt}]]`,
        })

        setCheckedContacts((prev) => {
            if (prev.includes(contactName)) {
                return prev.filter((name) => name !== contactName)
            } else {
                return [...prev, contactName]
            }
        })
    }

    // Toggle accordion state
    const toggleAccordion = (index) => {
        setOpenIndexes((prevOpenIndexes) =>
            prevOpenIndexes.includes(index)
                ? prevOpenIndexes.filter((i) => i !== index)
                : [...prevOpenIndexes, index],
        )
    }

    // Handle message change
    const handleMessageChange = (index, value) => {
        setMessages((prevMessages) => ({
            ...prevMessages,
            [index]: value,
        }))
    }

    const handleSendMessage = (index, person) => {
        const today = window.roamAlphaAPI.util.dateToPageTitle(new Date())
        const message = `${messages[index]} [[${today}]]`
        if (message) {
            console.log(`Message to ${reminders.toBeContacted[index].name}: ${message}`)
            createBlock({
                parentUid: person.uid,
                node: {
                    text: message,
                    open: false,
                },
                order: "last",
            })
        }
    }
    // Check if the relevant reminders arrays are empty
    const areRelevantRemindersEmpty =
        reminders.aAndBBirthdaysToday.length === 0 &&
        reminders.filteredUpcomingBirthdays.length === 0 &&
        reminders.toBeContacted.length === 0

    // If all relevant reminders are empty, do not render the Drawer
    if (areRelevantRemindersEmpty) {
        return null
    }

    return (
        <Drawer
            onClose={onClose}
            isOpen={isOpen}
            title={
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <span>Roam CRM</span>
                    <div style={{  justifyContent: 'flex-end' }}>
                        <Tooltip content="WIP" position="bottom">
                        <AnchorButton
                                icon="fullscreen"
                                minimal={true}
                                // disabled={true}
                                onClick={() => {
                                    onClose(); // Close the Drawer
                                    displayCRMDialog(people); // Display the CRM dialog
                                }}
                            />
                        </Tooltip>
                        <Tooltip content="Sync Calendar" position="bottom">
                            <AnchorButton
                                icon="cloud-download"
                                minimal={true}
                                disabled={false}
                                onClick={() => getEventInfo(people, extensionAPI, false)}
                                // TODO add a toast if there are no changes or updates
                            />
                        </Tooltip>
                    </div>
                </div>
            }
            position={"right"}
            hasBackdrop={false}
            canOutsideClickClose={false}
            style={{ width: 400, maxHeight: "80vh", overflowY: "auto" }}
            portalClassName={"pointer-events-none"}
            className={"crm-reminders-drawer pointer-events-auto"}
            enforceFocus={false}
            autoFocus={false}
        >
            <div className={`${Classes.DRAWER_BODY} p-5`}>
                {/* only show if there are birthdays today */}
                {reminders.aAndBBirthdaysToday.length > 0 && (
                    <>
                        <div className="reminder-section">
                            <h5>Birthdays Today</h5>
                            <ul>
                                {reminders.aAndBBirthdaysToday.map((person, index) => (
                                    <li key={index}>
                                        <a
                                            onClick={() =>
                                                window.roamAlphaAPI.ui.mainWindow.openPage({
                                                    page: { title: person.name },
                                                })
                                            }
                                        >
                                            {person.name} is {calculateAge(person.birthday)} years
                                            old
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}

                {reminders.filteredUpcomingBirthdays.length > 0 && (
                    <>
                        <div className="reminder-section">
                            <h5>Upcoming Birthdays </h5>
                            <ul>
                                {reminders.filteredUpcomingBirthdays.map((person, index) => (
                                    <li key={index}>
                                        <a
                                            onClick={() =>
                                                window.roamAlphaAPI.ui.mainWindow.openPage({
                                                    page: { title: person.name },
                                                })
                                            }
                                        >
                                            {person.name}{" "}
                                        </a>
                                        {new Date(person.birthday).toLocaleDateString()} (in{" "}
                                        {person.daysUntilBirthday}{" "}
                                        {person.daysUntilBirthday === 1 ? "day" : "days"})
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}

                {reminders.toBeContacted.length > 0 && (
                    <>
                        <div className="reminder-section">
                            <h5>Time to reach out to</h5>
                            <ul className="multi-column-list">
                                {reminders.toBeContacted.map(
                                    (person, index) =>
                                        !checkedContacts.includes(person) && (
                                            <div key={index}>
                                                <li>
                                                    <Button
                                                        onClick={() => toggleAccordion(index)}
                                                        icon={
                                                            openIndexes.includes(index)
                                                                ? "chevron-up"
                                                                : "chevron-down"
                                                        }
                                                        minimal
                                                        small
                                                        style={{
                                                            padding: "5px",
                                                            margin: "0 5px ",
                                                        }}
                                                    />
                                                    <Checkbox
                                                        checked={checkedContacts.includes(person)}
                                                        onChange={() =>
                                                            handleCheckboxChange(person)
                                                        }
                                                    />
                                                    <a
                                                        onClick={() =>
                                                            window.roamAlphaAPI.ui.mainWindow.openPage(
                                                                {
                                                                    page: { title: person.name },
                                                                },
                                                            )
                                                        }
                                                    >
                                                        {person.name}
                                                    </a>
                                                </li>
                                                <li style={{ gridColumn: "span 2" }}>
                                                    <Collapse isOpen={openIndexes.includes(index)}>
                                                        <TextArea
                                                            placeholder={`Type a message to ${person.name}`}
                                                            growVertically={true}
                                                            fill={true}
                                                            value={messages[index] || ""}
                                                            onChange={(e) =>
                                                                handleMessageChange(
                                                                    index,
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                        <Button
                                                            intent="primary"
                                                            // icon="send-message"
                                                            text="Send to Person's Page"
                                                            onClick={() =>
                                                                handleSendMessage(index, person)
                                                            }
                                                            style={{ margin: "10px 0" }}
                                                        ></Button>
                                                    </Collapse>
                                                </li>
                                            </div>
                                        ),
                                )}
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </Drawer>
    )
}

const displayBirthdays = async (people, lastBirthdayCheck, extensionAPI) => {
    // only show the modal if there isn't already one shown
    if (document.getElementsByClassName("crm-reminders-drawer").length === 0)
        renderOverlay({
            Overlay: BirthdayDrawer,
            props: { people, lastBirthdayCheck, extensionAPI },
        })
}

export default displayBirthdays
