import React, { useState } from "react"
// custom component to let a user change the reminder intervales for
// aList, bList, cList, dList, and fList contacts
function IntervalSettings({ extensionAPI }) {
    // Function to get initial settings from extensionAPI
    const getInitialSettings = (key, defaultValue) => {
        return extensionAPI.settings.get(key) || defaultValue
    }

    // State variables for each list with default values based on the README context
    const [aList, setAList] = useState(getInitialSettings("aList", 14)) // Two weeks
    const [bList, setBList] = useState(getInitialSettings("bList", 60)) // Two months
    const [cList, setCList] = useState(getInitialSettings("cList", 180)) // Six months
    const [dList, setDList] = useState(getInitialSettings("dList", 365)) // Once a year
    const [fList, setFList] = useState(getInitialSettings("fList", 0)) // Never contact

    // Function to handle change and update extensionAPI
    const handleChange = (setter, key) => (evt) => {
        const value = parseInt(evt.target.value, 10)
        setter(value)
        extensionAPI.settings.set(key, value)
    }

    return (
        <div className="crm-reminders-interval-input">
            <div>
                <label>A List: </label>
                <input
                    className="rm-settings-panel__value bp3-input"
                    style={{
                        width: "75px",
                        border: "1px #394B59 solid",
                        borderRadius: "5px",
                        padding: "7px 10px",
                        backgroundColor: "#182026",
                    }}
                    type="number"
                    min="1"
                    value={aList}
                    onChange={handleChange(setAList, "aList")}
                />
                Days
            </div>
            <div>
                <label>B List: </label>
                <input
                    className="rm-settings-panel__value bp3-input"
                    style={{
                        width: "75px",
                        border: "1px #394B59 solid",
                        borderRadius: "5px",
                        padding: "7px 10px",
                        backgroundColor: "#182026",
                    }}
                    type="number"
                    min="1"
                    value={bList}
                    onChange={handleChange(setBList, "bList")}
                />
                Days
            </div>
            <div>
                <label>C List: </label>
                <input
                    className="rm-settings-panel__value bp3-input"
                    style={{
                        width: "75px",
                        border: "1px #394B59 solid",
                        borderRadius: "5px",
                        padding: "7px 10px",
                        backgroundColor: "#182026",
                    }}
                    type="number"
                    min="1"
                    value={cList}
                    onChange={handleChange(setCList, "cList")}
                />
                Days
            </div>
            <div>
                <label>D List: </label>
                <input
                    className="rm-settings-panel__value bp3-input"
                    style={{
                        width: "75px",
                        border: "1px #394B59 solid",
                        borderRadius: "5px",
                        padding: "7px 10px",
                        backgroundColor: "#182026",
                    }}
                    type="number"
                    min="1"
                    value={dList}
                    onChange={handleChange(setDList, "dList")}
                />
                Days
            </div>
            <div>
                <label>F List: </label>
                <input
                    className="rm-settings-panel__value bp3-input"
                    style={{
                        width: "75px",
                        border: "1px #394B59 solid",
                        borderRadius: "5px",
                        padding: "7px 10px",
                        backgroundColor: "#182026",
                    }}
                    type="number"
                    min="0"
                    value={fList}
                    onChange={handleChange(setFList, "fList")}
                />
                Days
            </div>
        </div>
    )
}

export default IntervalSettings
