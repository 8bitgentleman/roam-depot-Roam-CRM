import {
    Button,
    Classes,
    Drawer,
    Dialog,
    Divider,
    Icon,
    Menu,
    MenuItem,
    Popover,
    Tooltip,
  } from "@blueprintjs/core";
import React, {
useState,
useMemo,
useEffect,
useCallback,
useRef,
} from "react";
import ReactDOM from "react-dom";
import renderOverlay, {
  RoamOverlayProps,
} from "roamjs-components/util/renderOverlay";
import remindersSystem from "../utils";

const BirthdayDrawer = ({ onClose, isOpen, lastBirthdayCheck}) => {
  const {
    aAndBBirthdaysToday,
    otherBirthdaysToday,
    filteredUpcomingBirthdays,
    toBeContacted
  } = remindersSystem(lastBirthdayCheck);
  console.log(remindersSystem(lastBirthdayCheck));
  
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
        style={{ background: "#565c70", paddingTop:"0px" }}
      >

        <h5
          style={{ fontWeight: "800" }}
        >
          Birthdays Today:
        </h5>    
        <p>
          <ul>
            {aAndBBirthdaysToday.map((person, index) => (
              <li key={index}>
                <a
                  style={{ color: "lightgrey" }}
                  onClick={() =>
                    window.roamAlphaAPI.ui.mainWindow.openPage({
                      page: { title: person.name },
                    })
                  }
                >{person.name}</a>
              </li>
            ))}
          </ul>
        </p>
        <h5 style={{ fontWeight: "800" }}>
              Upcoming Birthdays:
          </h5>
        <p>
          <ul>
            {filteredUpcomingBirthdays.map((person, index) => (
              <li key={index}>
                <a
                  style={{ color: "lightgrey" }}
                  onClick={() =>
                    window.roamAlphaAPI.ui.mainWindow.openPage({
                      page: { title: person.name },
                    })
                  }
                >{person.name}</a>
                 - {new Date(person.birthday).toLocaleDateString()} (in {person.daysUntilBirthday} days)
              </li>
            ))}
          </ul>
        </p>
        <h5
          style={{ fontWeight: "800" }}
        >
          Contact Reminders:
        </h5> 
        <p>
            
        </p>
      </div>
    </Drawer>
  );
};

const displayBirthdays = async (lastBirthdayCheck) => {
  console.log("display birthdays");
  
    if (!document.getElementById("crm-stats-drawer"))
      renderOverlay({
        Overlay: BirthdayDrawer,
        props: {lastBirthdayCheck},
      }
      );
  };

export default displayBirthdays