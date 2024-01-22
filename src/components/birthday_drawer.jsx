import { Drawer, Classes } from "@blueprintjs/core";
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import renderOverlay from "roamjs-components/util/renderOverlay";
import remindersSystem from "../utils";
import updateBlock from "roamjs-components/writes/updateBlock"

const BirthdayDrawer = ({ onClose, isOpen, lastBirthdayCheck }) => {
  // State to store the reminders data
  const [reminders, setReminders] = useState({
    aAndBBirthdaysToday: [],
    otherBirthdaysToday: [],
    filteredUpcomingBirthdays: [],
    toBeContacted: []
  });

  // State to track which contacts have been checked
  const [checkedContacts, setCheckedContacts] = useState([]);

  // Fetch the reminders data only once when the component mounts
  useEffect(() => {
    const data = remindersSystem(lastBirthdayCheck);
    setReminders(data);
    
  }, [lastBirthdayCheck]);
  
  // Handler for checkbox change
  const handleCheckboxChange = (contactName) => {
    let dt = window.roamAlphaAPI.util.dateToPageTitle(new Date())
    // update the attribute when the checkbox is clicked
    updateBlock({
      uid:contactName.last_contact_uid,
      text: `Last Contacted:: [[${dt}]]`
    })
    
    setCheckedContacts((prev) => {
      if (prev.includes(contactName)) {
        return prev.filter((name) => name !== contactName);
      } else {
        return [...prev, contactName];
      }
    });
  };

  // Check if the relevant reminders arrays are empty
  const areRelevantRemindersEmpty = (
    reminders.aAndBBirthdaysToday.length === 0 &&
    reminders.filteredUpcomingBirthdays.length === 0 &&
    reminders.toBeContacted.length === 0
  );

  // If all relevant reminders are empty, do not render the Drawer
  if (areRelevantRemindersEmpty) {
    return null;
  }
  
  return (
    <Drawer
      onClose={onClose}
      isOpen={isOpen}
      title={"Roam CRM Reminders"}
      position={"right"}
      hasBackdrop={false}
      canOutsideClickClose={false}
      style={{ width: 400, height: 400 }}
      portalClassName={"pointer-events-none"}
      className={"crm-stats-drawer pointer-events-auto"}
      enforceFocus={false}
      autoFocus={false}
    >
      <div
        className={`${Classes.DRAWER_BODY} p-5 text-white text-opacity-70`}
        style={{ background: "#565c70", paddingTop: "0px" }}
      >
        {/* only show if there are birthdays today */}
        {reminders.aAndBBirthdaysToday.length > 0 && (
          <>
            <h5 style={{ fontWeight: "800" }}>Birthdays Today:</h5>
            <p>
              <ul>
                {reminders.aAndBBirthdaysToday.map((person, index) => (
                  <li key={index}>
                    <a
                      style={{ color: "lightgrey" }}
                      onClick={() =>
                        window.roamAlphaAPI.ui.mainWindow.openPage({
                          page: { title: person.name },
                        })
                      }
                    >
                      {person.name}
                    </a>
                  </li>
                ))}
              </ul>
            </p>
          </>
        )}

        {reminders.filteredUpcomingBirthdays.length > 0 && (
          <>
            <h5 style={{ fontWeight: "800" }}>Upcoming Birthdays:</h5>
            <p>
              <ul>
                {reminders.filteredUpcomingBirthdays.map((person, index) => (
                  <li key={index}>
                    <a
                      style={{ color: "lightgrey" }}
                      onClick={() =>
                        window.roamAlphaAPI.ui.mainWindow.openPage({
                          page: { title: person.name },
                        })
                      }
                    >
                      {person.name}
                    </a>
                    - {new Date(person.birthday).toLocaleDateString()} (in {person.daysUntilBirthday} days)
                  </li>
                ))}
              </ul>
            </p>
          </>
        )}

        {reminders.toBeContacted.length > 0 && (
          <>
            <h5 style={{ fontWeight: "800" }}>Time to reach out to:</h5>
            <ul>
              {reminders.toBeContacted.map((person, index) => (
                !checkedContacts.includes(person) && (
                  <li key={index}  >
                    <label>
                      <input
                        type="checkbox"
                        checked={checkedContacts.includes(person)}
                        onChange={() => handleCheckboxChange(person)}
                        style={{ marginRight: "10px" }}
                      />
                      
                    </label>
                    <a
                      style={{ color: "lightgrey" }}
                      onClick={() =>
                        window.roamAlphaAPI.ui.mainWindow.openPage({
                          page: { title: person.name },
                        })
                      }
                    >
                      {person.name}
                    </a>
                    
                  </li>
                )
              ))}
            </ul>
          </>
        )}

      </div>
    </Drawer>
  );
};

const displayBirthdays = async (lastBirthdayCheck) => {
// only show the modal if there isn't already one shown  
  if (document.getElementsByClassName("crm-stats-drawer").length===0)
    renderOverlay({
      Overlay: BirthdayDrawer,
      props: { lastBirthdayCheck },
    });
};

export default displayBirthdays;