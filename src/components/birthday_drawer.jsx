import { Drawer, Classes, Tooltip, AnchorButton } from "@blueprintjs/core"
import React, { useState, useEffect } from "react"
import renderOverlay from "roamjs-components/util/renderOverlay"
import remindersSystem from "../utils_reminders"
import { calculateAge } from "../utils_reminders"
import updateBlock from "roamjs-components/writes/updateBlock"

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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Roam CRM</span>
                    <Tooltip content="Coming Soon..." position="bottom">
                        <AnchorButton
                            icon="fullscreen"
                            minimal={true}
                            disabled={true}
                        />
                    </Tooltip>
                </div>
            }
            position={"right"}
            hasBackdrop={false}
            canOutsideClickClose={false}
            style={{ width: 400, maxHeight: '80vh', overflowY: 'auto' }}
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
                                        {person.daysUntilBirthday} {person.daysUntilBirthday === 1 ? "day" : "days"})
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
                                            <li key={index}>
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={checkedContacts.includes(person)}
                                                        onChange={() =>
                                                            handleCheckboxChange(person)
                                                        }
                                                    />
                                                </label>
                                                <a
                                                    onClick={() =>
                                                        window.roamAlphaAPI.ui.mainWindow.openPage({
                                                            page: { title: person.name },
                                                        })
                                                    }
                                                >
                                                    {person.name}
                                                </a>
                                            </li>
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
