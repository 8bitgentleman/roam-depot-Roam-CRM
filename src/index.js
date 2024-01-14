const panelConfig = {
  tabTitle: "Test Ext 1",
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

async function onload({extensionAPI}) {
  // set defaults if they dont' exist
  if (!extensionAPI.settings.get('data')) {
      await extensionAPI.settings.set('data', "01");
  }
  extensionAPI.settings.panel.create(panelConfig);

  console.log("load example plugin");
}

function onunload() {
  console.log("unload example plugin");
}

export default {
onload,
onunload
};
