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

const BirthdayDrawer = ({ onClose, isOpen }) => {
  return (
    <Drawer
      onClose={onClose}
      isOpen={isOpen}
      title={"Graph Database stats"}
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
        style={{ background: "#565c70" }}
      >

        <p>
          Pages:{" "}
          {
            window.roamAlphaAPI.q(
              "[:find (count ?p) :where [?p :node/title _]]"
            )[0]
          }
        </p>
        <p>
          Text Blocks / Words / Characters: <br />
          
        </p>
        <p>
          <a
            style={{ color: "lightgrey" }}
            onClick={() =>
              window.roamAlphaAPI.ui.mainWindow.openPage({
                page: { title: ">" },
              })
            }
          >
            Block Quotes
          </a>{" "}
          / Words / Characters: <br />
          
        </p>
        <p>
          Code Blocks / Characters:
          <br />
          
        </p>
        <p>
          Interconnections (refs):
          {window.roamAlphaAPI.q(
            "[:find (count ?r) . :with ?e :where [?e :block/refs ?r] ]]"
          )}
        </p>
        <p className="flex flex-col">
          {[
            "TODO",
            "DONE",
            "query",
            "embed",
            "table",
            "kanban",
            "video",
            "roam/js",
          ].map((tag) => (
            <span key={tag}>
              <a
                style={{ color: "lightgrey" }}
                onClick={() =>
                  window.roamAlphaAPI.ui.mainWindow.openPage({
                    page: { title: tag },
                  })
                }
              >
                {tag}
              </a>
              :{" "}
              {window.roamAlphaAPI.q(
                `[:find (count ?be) . :where [?e :node/title "${tag}"][?be :block/refs ?e]]`
              ) || 0}
            </span>
          ))}
        </p>
        
      </div>
    </Drawer>
  );
};

const displayBirthdays = async () => {
  console.log("display birthdays");
  
    if (!document.getElementById("crm-stats-drawer"))
      renderOverlay({
        Overlay: BirthdayDrawer,
      }
      );
  };

export default displayBirthdays