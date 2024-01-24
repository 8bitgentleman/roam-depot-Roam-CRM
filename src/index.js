
import displayBirthdays from "./components/birthday_drawer"
import createBlock from "roamjs-components/writes/createBlock"
import { showToast } from './components/toast';

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

async function getAllPeople() {
    
  let query = `[:find 
    (pull ?PAGE [:attrs/lookup :block/string :block/uid :node/title {:attrs/lookup [:block/string :block/uid]} ])
   :where
    [?Template-Ref :node/title "roam/templates"]
    [?Tags-Ref :node/title "Tags"]
    [?person-Ref :node/title "people"]
    [?node :block/page ?PAGE]
    [?PEOPLEdec :block/parents ?PAGE]
    [?PEOPLEdec :block/refs ?Tags-Ref]
    [?PEOPLEdec :block/refs ?person-Ref]
    (not
      [?PAGE :node/title "roam/templates"]      
    )
    (not
      [?PAGE :node/title "SmartBlock"]      
    )
  ]`;

  let results = await window.roamAlphaAPI.q(query).flat();

  function extractElementsWithKeywords(data, keywords) {
  return data.map(item => {
    // Initialize an object to hold the categorized items with empty arrays
    const categorizedItems = keywords.reduce((acc, keyword) => {
      const propName = keyword.replace(/::/g, '');
      acc[propName] = []; // Initialize each property with an empty array
      return acc;
    }, {});

    // Check if lookup exists and is an array
    if (Array.isArray(item.lookup)) {
      // Iterate over each keyword
      keywords.forEach(keyword => {
        // Filter the lookup array for items containing the current keyword
        const filteredLookup = item.lookup.filter(lookupItem => {
          return lookupItem.string && lookupItem.string.includes(keyword);
        });

        // Assign the filtered array to the corresponding property
        const propName = keyword.replace(/::/g, '');
        categorizedItems[propName] = filteredLookup;
      });
    }

    // Return the original item with the categorized items added
    return {
      ...item,
      ...categorizedItems,
    };
  });
  }

  // Define the attributes to extract for
  const keywords = ["Birthday::", "Contact Frequency::", "Last Contacted::"];


 return extractElementsWithKeywords(results, keywords);
}

async function setDONEFilter(page) {
  var fRemoves = await window.roamAlphaAPI.ui.filters.getPageFilters({"page": {"title": page}})["removes"]
  // check if DONE is already filtered. if not add it
  const containsDONE = fRemoves.includes("DONE");
  console.log(fRemoves, containsDONE);
  
  if (!containsDONE) {
    fRemoves.push("DONE")
    await window.roamAlphaAPI.ui.filters.setPageFilters(
      {
        "page": {"title": page},
        "filters": {"removes": fRemoves}
      })
  } 
  
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
    // update last birthday check since it's already happened
    extensionAPI.settings.set(
      'last-birthday-check-date',
      window.roamAlphaAPI.util.dateToPageUid(new Date))

    const people = await getAllPeople()
    // always set people pages to hide DONE
    // TODO see if vlad wants more granulity
    people.forEach(async page =>  {
      await setDONEFilter(page.title)
    });

    // Command Palette Sidebar - Close first block
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
          const filteredBlocks = sidebarWindows.filter(obj => !obj["pinned?"]);
          if (filteredBlocks.length > 0) {
            filteredBlocks.sort((a, b) => a.order - b.order);
            await removeWindow(filteredBlocks[0])
          }

        }
      }
    )
    // Command Palette Sidebar - Cursor in first block
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

    
    if (!testing) {
      console.log(`load ${plugin_title} plugin`);
    }
  } else {
    showToast(`Failed to run an old version of ${plugin_title}.`, "DANGER");
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
