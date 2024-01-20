
import displayBirthdays from "./components/birthday_drawer"


const plugin_title = "Roam CRM"

const panelConfig = {
  tabTitle: plugin_title,
  settings: [
      {id:          "button-setting",
       name:        "Button test",
       description: "tests the button",
       action:      {type:    "button",
                     onClick: (evt) => { console.log("Button clicked!"); },
                     content: "Button"}},
      {id:          "switch-setting",
       name:        "Switch Test",
       description: "Test switch component",
       action:      {type:     "switch",
                     onChange: (evt) => { console.log("Switch!", evt); }}},
      {id:     "input-setting",
       name:   "Input test",
       action: {type:        "input",
                placeholder: "placeholder",
                onChange:    (evt) => { console.log("Input Changed!", evt); }}},
      {id:     "select-setting",
       name:   "Select test",
       action: {type:     "select",
                items:    ["one", "two", "three"],
                onChange: (evt) => { console.log("Select Changed!", evt); }}}
  ]
};

function getPeople(extensionAPI) {
  return extensionAPI.settings.get('people') || {}
}

function getLastBirthdayCheckDate(extensionAPI) {
  return extensionAPI.settings.get('last-birthday-check-date') || '01-19-2024'
}

async function onload({extensionAPI}) {
  extensionAPI.settings.panel.create(panelConfig);
  
  displayBirthdays(getLastBirthdayCheckDate(extensionAPI))
  // update last birthday check since it's already happened
  extensionAPI.settings.set(
    'last-birthday-check-date',
     window.roamAlphaAPI.util.dateToPageUid(new Date))
  
  console.log(`load ${plugin_title} plugin`);
}

function onunload() {
  console.log(`unload ${plugin_title} plugin`);
}

export default {
onload,
onunload
};
