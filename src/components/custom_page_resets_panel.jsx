import { Button, Divider } from "@blueprintjs/core"
import React, { useState, useEffect } from "react"
import PageInput from "roamjs-components/components/PageInput"
import { getExtensionAPISetting } from "../utils"

// Define the component as a function that takes extensionAPI as a prop
const LastContactedPanel = ({ extensionAPI }) => {
    const [pageNames, setPageNames] = useState(new Set())
    const [value, setValue] = useState("")
    const [inputKey, setInputKey] = useState(0) // Add a key state to force re-render

    const handleConfirm = () => {
        setPageNames((prevPageNames) => {
            const newPageNames = new Set(prevPageNames).add(value)
            extensionAPI.settings.set("custom-contact-reset-page-set", Array.from(newPageNames))
            return newPageNames
        })
        setValue("") // Clear the input after adding
        setInputKey((prevKey) => prevKey + 1) // Update the key to force re-render
    }

    const handleDelete = (name) => {
        setPageNames((prevPageNames) => {
            const newPageNames = new Set(prevPageNames)
            newPageNames.delete(name)
            extensionAPI.settings.set("custom-contact-reset-page-set", Array.from(newPageNames))
            return newPageNames
        })
    }

    useEffect(() => {
        const fetchPageNames = async () => {
            const initialPageNames = await getExtensionAPISetting(
                extensionAPI,
                "custom-contact-reset-page-set",
                [],
            )
            setPageNames(new Set(initialPageNames))
        }

        fetchPageNames()
    }, [extensionAPI]) // Add extensionAPI as a dependency

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <div>
                {[...pageNames].map((name) => (
                    <div key={name} style={{ display: "flex", alignItems: "center" }}>
                        <span>{name}</span>
                        <Button icon="trash" minimal onClick={() => handleDelete(name)} />
                    </div>
                ))}
            </div>
            <Divider />
            <div style={{ paddingLeft: "0" }}>
                <PageInput
                    key={inputKey} // Add key to force re-render
                    value={value}
                    setValue={setValue}
                    showButton={true}
                    onConfirm={handleConfirm}
                    placeholder="Type a page name..."
                    autoFocus={true}
                    multiline={false}
                    id="page-input"
                />
            </div>
        </div>
    )
}

export default LastContactedPanel
