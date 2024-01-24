
import displayBirthdays from "./components/birthday_drawer"
import createBlock from "roamjs-components/writes/createBlock"

const testing = true

const plugin_title = "Roam CRM"
const ts2 = 1707159407000
const panelConfig = {
  tabTitle: plugin_title,
  settings: [
    // {
    //   id: "button-setting",
    //   name: "Button test",
    //   description: "tests the button",
    //   action: {
    //     type: "button",
    //     onClick: (evt) => { console.log("Button clicked!"); },
    //     content: "Button"
    //   }
    // },
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
  ]
};

function getPeople(extensionAPI) {
  return extensionAPI.settings.get('people') || {}
}

function getLastBirthdayCheckDate(extensionAPI) {
  return extensionAPI.settings.get('last-birthday-check-date') || '01-19-2024'
}

async function onload({ extensionAPI }) {
  extensionAPI.settings.panel.create(panelConfig);
  const ts1 = new Date().getTime();

  if (ts1 < ts2) {

    if (testing) {
      displayBirthdays('01-19-2024')
    } else {
      displayBirthdays(getLastBirthdayCheckDate(extensionAPI))
    }

    extensionAPI.ui.commandPalette.addCommand(
      {
        label: 'Sidebar - Close first block',
        "disable-hotkey": false,
        callback: async () => {
          async function removeWindow(w) {
            window.roamAlphaAPI.ui.rightSidebar.removeWindow(
              {
                "window":
                {
                  "type": w['type'],
                  "block-uid": w['block-uid'] || w['page-uid'] || w['mentions-uid']
                }
              }
            )
          }

          let sidebarWindows = window.roamAlphaAPI.ui.rightSidebar.getWindows();

          if (sidebarWindows.length > 0) {
            sidebarWindows.sort((a, b) => a.order - b.order);
            await removeWindow(sidebarWindows[0])
          }

        }
      }
    )
    extensionAPI.ui.commandPalette.addCommand(
      {
        label: 'Sidebar - Cursor in first block',
        "disable-hotkey": false,
        callback: async () => {
          let sidebarWindows = window.roamAlphaAPI.ui.rightSidebar.getWindows();

          if (sidebarWindows.length > 0) {
            let first = sidebarWindows[0];
            if (first.type == "block") {
              window.roamAlphaAPI.ui.setBlockFocusAndSelection(
                {
                  location: {
                    "block-uid": first['block-uid'],
                    "window-id": first['window-id']
                  }
                })
            } else if (first.type == "outline") {
              let query = `[:find (pull ?e [:block/string :block/uid :block/children :block/order {:block/children ...}])
                              :in $ ?uid
                              :where 
                    [?e :block/uid ?uid]
                    ]`;

              let result = window.roamAlphaAPI.q(query, first['page-uid']).flat();
              const selectedObject = result[0].children.find(obj => obj.order === 0);
              window.roamAlphaAPI.ui.setBlockFocusAndSelection(
                {
                  location: {
                    "block-uid": selectedObject['uid'],
                    "window-id": first['window-id']
                  }
                })
            }
          }

        }
      }
    )
    // update last birthday check since it's already happened
    extensionAPI.settings.set(
      'last-birthday-check-date',
      window.roamAlphaAPI.util.dateToPageUid(new Date))
    if (!testing) {
      console.log(`load ${plugin_title} plugin`);
    }
  }

}

function onunload() {
  if (!testing) {
    console.log(`unload ${plugin_title} plugin`);
  }

}

export default {
  onload,
  onunload
};
