import React, { useState, useEffect } from "react"
import renderOverlay from "roamjs-components/util/renderOverlay"
import {
    Dialog,
    Classes,
    Tab,
    Tabs,
    InputGroup,
    Button,
    Menu,
    MenuItem,
    Popover,
    Position,
} from "@blueprintjs/core"
const CRMDialog = ({ onClose, isOpen, people }) => {
    const [selectedPersonUID, setSelectedPersonUID] = useState(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [sortOption, setSortOption] = useState("firstName")
    const [sortOrder, setSortOrder] = useState("asc")

    const getPersonTitle = (person) => {
        return person && person.title ? person.title.replace("PERSON: ", "") : "Unknown"
    }

    const getPersonFirstName = (person) => {
        return getPersonTitle(person).split(" ")[0]
    }

    const getPersonLastName = (person) => {
        const nameParts = getPersonTitle(person).split(" ")
        return nameParts[nameParts.length - 1]
    }

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value.toLowerCase())
        setSelectedPersonUID(null)
    }

    const handleSortChange = (option) => {
        setSortOption(option)
    }

    const handleSortOrderChange = (order) => {
        setSortOrder(order)
    }

    const sortPeople = (people) => {
        return [...people].sort((a, b) => {
            let comparison = 0

            if (sortOption === "firstName") {
                comparison = getPersonFirstName(a).localeCompare(getPersonFirstName(b))
            } else if (sortOption === "lastName") {
                comparison = getPersonLastName(a).localeCompare(getPersonLastName(b))
            } else if (sortOption === "lastContacted") {
                const dateA = new Date(a.last_contact)
                const dateB = new Date(b.last_contact)
                comparison = dateA - dateB
            }

            return sortOrder === "asc" ? comparison : -comparison
        })
    }

    const filteredPeople = sortPeople(
        people.filter((person) => getPersonTitle(person).toLowerCase().includes(searchQuery)),
    )

    const selectedPerson = people.find((person) => person.uid === selectedPersonUID)
    // MARK:useEffect
    useEffect(() => {
        const blockContainer1 = document.getElementById("block-container-1")

        if (blockContainer1) {
            // Unmount previous blocks if they exist
            window.roamAlphaAPI.ui.components
                .unmountNode({
                    el: blockContainer1,
                })
                .then(() => {
                    if (selectedPerson) {
                        // Render new block
                        window.roamAlphaAPI.ui.components.renderBlock({
                            uid: selectedPerson.uid,
                            el: blockContainer1,
                        })
                    }
                })
        }
    }, [selectedPerson])

    const PeopleList = () => (
        <Menu className="main-section" style={{ flex: "1", overflowY: "auto", padding: "10px" }}>
            {filteredPeople.map((person) => (
                <MenuItem
                    key={person.uid}
                    text={getPersonTitle(person)}
                    active={person.uid === selectedPersonUID}
                    onClick={() => setSelectedPersonUID(person.uid)}
                />
            ))}
        </Menu>
    )

    const SortMenu = () => (
        <Menu>
            <MenuItem text="First Name" onClick={() => handleSortChange("firstName")} />
            <MenuItem text="Last Name" onClick={() => handleSortChange("lastName")} />
            <MenuItem text="Last Contacted" onClick={() => handleSortChange("lastContacted")} />
            <Menu.Divider />
            <MenuItem text="Ascending" onClick={() => handleSortOrderChange("asc")} />
            <MenuItem text="Descending" onClick={() => handleSortOrderChange("desc")} />
        </Menu>
    )

    return (
        <Dialog
            className="crm-dialog"
            isOpen={isOpen}
            onClose={onClose}
            //   title="CRM Workspace"
            canEscapeKeyClose={true}
            canOutsideClickClose={true}
            style={{
                width: "90vw",
                height: "80vh",
                maxWidth: "none",
                maxHeight: "none",
                paddingBottom: "0",
            }}
        >
            <div
                className={Classes.DIALOG_BODY}
                style={{ display: "flex", height: "100%", margin: "0" }}
            >
                <div
                    className="left-sidebar"
                    style={{ width: "200px", borderRight: "1px solid #e1e8ed", padding: "20px" }}
                >
                    <h4>CRM Workspace</h4>
                    <InputGroup
                        onChange={handleSearchChange}
                        leftIcon="search"
                        placeholder="Search..."
                        style={{ marginBottom: "10px" }}
                    />
                    <Tabs
                        id="tabs"
                        vertical
                        style={{ height: "calc(100% - 100px)" }}
                        defaultSelectedTabId="people"
                    >
                        <Tab id="home" title="Home" panel={<p>Home content</p>} disabled />
                        <Tab id="people" title="People" panel={<div />} />{" "}
                        {/* Empty div as panel */}
                        {/* <Tab id="my-workspace" title="My Workspace" panel={<p>Workspace content</p>} disabled /> */}
                        {/* <Tab id="groups" title="Groups" panel={<p>Groups content</p>} disabled /> */}
                        <Tab
                            id="new-person"
                            title="New Person"
                            panel={<p>Add New Person content</p>}
                            disabled
                        />
                    </Tabs>
                </div>

                {/* Center Section for People List */}
                <div
                    className="people-list-section"
                    style={{
                        flex: "1",
                        padding: "0 10px 10px 10px",
                        overflowY: "auto",
                        position: "relative",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "10px",
                            position: "sticky",
                            top: "0",
                            borderBottom: "1px solid #e1e8ed",
                            backgroundColor: "#ebf1f5",
                            zIndex: "1",
                            padding: "30px 0 10px 0",
                        }}
                    >
                        <h4
                            style={{
                                margin: 0,
                            }}
                        >
                            People ({filteredPeople.length})
                        </h4>
                        <InputGroup
                            onChange={handleSearchChange}
                            leftIcon="search"
                            placeholder="Search..."
                            style={{ width: "200px" }}
                        />
                        <Popover content={<SortMenu />} position={Position.BOTTOM_RIGHT}>
                            <Button icon="sort" minimal />
                        </Popover>
                    </div>
                    <PeopleList />
                </div>
                {/* Right Details Section */}
                <div
                    className="details-section"
                    style={{ width: "300px", padding: "10px", overflowY: "auto", padding: "20px" }}
                >
                    {selectedPerson ? (
                        <>
                            <h4
                                style={{
                                    marginTop: "10px",
                                    borderBottom: "1px solid rgb(225, 232, 237)",
                                    padding: "7px 0 10px 0",
                                }}
                            >
                                {getPersonTitle(selectedPerson)}
                            </h4>
                            {/* manually show the name so that I could potentially add extra buttons here */}
                            <div id="block-container-1" style={{ marginTop: "10px" }}></div>
                        </>
                    ) : (
                        <div>Select a person to view details</div>
                    )}
                </div>
            </div>
        </Dialog>
    )
}

const displayCRMDialog = async (people) => {
    if (document.getElementsByClassName("crm-dialog").length === 0) {
        renderOverlay({
            Overlay: CRMDialog,
            props: { isOpen: true, people },
        })
    }
}

export default displayCRMDialog
