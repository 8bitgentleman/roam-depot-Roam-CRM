import React, { useState, useEffect } from "react";
import {
    Menu,
    MenuItem,
    Button,
    Popover,
    Position,
    HTMLTable,
    Icon,
} from "@blueprintjs/core";

const PeopleList = ({ filteredPeople = [], setSelectedPersonUID, selectedPersonUID }) => {
    console.log(filteredPeople);
    
    const [columns, setColumns] = useState(["name"]);
    const [availableColumns, setAvailableColumns] = useState([]);
    const [sortColumn, setSortColumn] = useState("name");
    const [sortDirection, setSortDirection] = useState("asc");

    useEffect(() => {
        if (filteredPeople.length > 0) {
            const samplePerson = filteredPeople[0];
            const allColumns = Object.keys(samplePerson).filter(
                (key) => typeof samplePerson[key] !== "object" || key === "birthday"
            );
            setAvailableColumns(allColumns.filter((col) => col !== "name"));
        }
    }, [filteredPeople]);

    const toggleColumn = (column) => {
        setColumns((prevColumns) =>
            prevColumns.includes(column)
                ? prevColumns.filter((col) => col !== column)
                : [...prevColumns, column]
        );
    };

    const ColumnCustomizer = () => (
        <Menu>
            {availableColumns.map((column) => (
                <MenuItem
                    key={column}
                    text={column}
                    icon={columns.includes(column) ? "tick" : "blank"}
                    onClick={() => toggleColumn(column)}
                />
            ))}
        </Menu>
    );

    const formatCellValue = (person, column) => {
        if (column === "birthday") {
            return person[column] ? new Date(person[column]).toLocaleDateString() : "";
        }
        return person[column] || "";
    };

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const sortedPeople = [...filteredPeople].sort((a, b) => {
        if (a[sortColumn] < b[sortColumn]) return sortDirection === "asc" ? -1 : 1;
        if (a[sortColumn] > b[sortColumn]) return sortDirection === "asc" ? 1 : -1;
        return 0;
    });

    return (
        <div className="people-table-container">
            <div className="table-header">
                <Popover content={<ColumnCustomizer />} position={Position.BOTTOM_RIGHT}>
                    <Button icon="properties" text="Customize Columns" />
                </Popover>
            </div>
            <HTMLTable interactive striped className="people-table">
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th key={column} onClick={() => handleSort(column)}>
                                {column.charAt(0).toUpperCase() + column.slice(1)}
                                {sortColumn === column && (
                                    <Icon icon={sortDirection === "asc" ? "sort-asc" : "sort-desc"} />
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedPeople.map((person) => (
                        <tr
                            key={person.uid}
                            onClick={() => setSelectedPersonUID(person.uid)}
                            className={person.uid === selectedPersonUID ? "bp4-selected" : ""}
                        >
                            {columns.map((column) => (
                                <td key={`${person.uid}-${column}`}>
                                    {formatCellValue(person, column)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </HTMLTable>
        </div>
    );
};

export default PeopleList;