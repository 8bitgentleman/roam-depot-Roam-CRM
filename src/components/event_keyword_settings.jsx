import React, { useState, useEffect } from "react"
import {
  Button,
  Card,
  Elevation,
  Icon,
  Tooltip,
  Intent,
  FormGroup,
  InputGroup,
  Switch,
  NumericInput
} from "@blueprintjs/core"
import { showToast } from "./toast"

/**
 * Component for managing event keywords in Roam CRM extension settings
 * 
 * @param {Object} props Component props
 * @param {Object} props.extensionAPI The Roam Depot extension API
 */
function EventKeywordSettings({ extensionAPI }) {
  // Default keywords for reference and backward compatibility
  const DEFAULT_EVENT_KEYWORDS = [
    {
      term: "1:1",
      requiresMultipleAttendees: true,
      template: "[[1:1]] with {attendees}",
      priority: 1
    },
    {
      term: "dinner",
      requiresMultipleAttendees: true,
      template: "[[Dinner]] with {attendees}",
      priority: 2
    },
    {
      term: "", // Empty term means this is the fallback/default
      requiresMultipleAttendees: true,
      template: "[[Call]] with {attendees}",
      priority: 999,
      isDefault: true
    }
  ]

  // State for keywords and form
  const [keywords, setKeywords] = useState([])
  const [editingIndex, setEditingIndex] = useState(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  
  // Form state
  const [formTerm, setFormTerm] = useState("")
  const [formTemplate, setFormTemplate] = useState("")
  const [formRequiresMultipleAttendees, setFormRequiresMultipleAttendees] = useState(true)
  const [formPriority, setFormPriority] = useState(10)
  const [formIsDefault, setFormIsDefault] = useState(false)

  // Load keywords on component mount
  useEffect(() => {
    const savedKeywords = extensionAPI.settings.get("event-keywords")
    console.log("Loaded keywords", savedKeywords);
    
    setKeywords(savedKeywords || DEFAULT_EVENT_KEYWORDS)
  }, [extensionAPI])

  // Save keywords to extension settings
  const saveKeywords = (newKeywords) => {
    extensionAPI.settings.set("event-keywords", newKeywords)
    setKeywords(newKeywords)
  }

  // Reset form state
  const resetForm = () => {
    setFormTerm("")
    setFormTemplate("")
    setFormRequiresMultipleAttendees(true)
    setFormPriority(10)
    setFormIsDefault(false)
    setEditingIndex(null)
    setIsAddingNew(false)
  }

  // Start adding a new keyword
  const handleAddClick = () => {
    resetForm()
    setIsAddingNew(true)
  }

  // Start editing an existing keyword
  const handleEditClick = (keyword, index) => {
    setFormTerm(keyword.term)
    setFormTemplate(keyword.template)
    setFormRequiresMultipleAttendees(keyword.requiresMultipleAttendees)
    setFormPriority(keyword.priority)
    setFormIsDefault(keyword.isDefault || false)
    setEditingIndex(index)
    setIsAddingNew(false)
  }

  // Delete a keyword
  const handleDeleteClick = (index) => {
    const newKeywords = [...keywords]
    newKeywords.splice(index, 1)

    // If we're deleting the only default keyword, make sure we still have a default
    if (keywords[index].isDefault && !newKeywords.some(k => k.isDefault)) {
      // Set the last keyword as default if none exists
      if (newKeywords.length > 0) {
        newKeywords[newKeywords.length - 1].isDefault = true
      }
    }

    saveKeywords(newKeywords)
    showToast("Keyword deleted", "SUCCESS")
  }

  // Handle form submission
  const handleSubmit = () => {
    // Validate form
    if (!formTemplate) {
      showToast("Template is required", "WARNING")
      return
    }

    if (formRequiresMultipleAttendees && !formTemplate.includes("{attendees}")) {
      showToast("Template must include {attendees} placeholder when multiple attendees are required", "WARNING")
      return
    }

    // Create the new keyword object
    const newKeyword = {
      term: formTerm,
      template: formTemplate,
      requiresMultipleAttendees: formRequiresMultipleAttendees,
      priority: formPriority,
      isDefault: formIsDefault
    }

    let newKeywords

    if (editingIndex !== null) {
      // Editing existing keyword
      newKeywords = [...keywords]
      newKeywords[editingIndex] = newKeyword
    } else {
      // Adding new keyword
      newKeywords = [...keywords, newKeyword]
    }
    console.log("newKeywords", newKeywords);
    
    // If this is a default keyword, unset any other defaults
    if (formIsDefault) {
      newKeywords = newKeywords.map((k, idx) => {
        if (editingIndex !== null && idx === editingIndex) {
          return k
        }
        return {
          ...k,
          isDefault: false
        }
      })
    }
    console.log("newKeywords", newKeywords);

    // Make sure we have at least one default
    const hasDefault = newKeywords.some(k => k.isDefault)
    if (!hasDefault && newKeywords.length > 0) {
      // Set the highest priority (largest number) as default
      const highestPriorityIndex = newKeywords.reduce(
        (maxIdx, current, idx, arr) =>
          current.priority > arr[maxIdx].priority ? idx : maxIdx,
        0
      )
      newKeywords[highestPriorityIndex].isDefault = true
    }

    // Save keywords and reset form
    saveKeywords(newKeywords)
    resetForm()

    showToast(
      editingIndex !== null ? "Keyword updated" : "Keyword added",
      "SUCCESS"
    )
  }

  // Reset to default keywords
  const handleResetToDefaults = () => {
    if (window.confirm("Are you sure you want to reset to default keywords? This will delete all custom keywords.")) {
      saveKeywords(DEFAULT_EVENT_KEYWORDS)
      showToast("Reset to default keywords", "SUCCESS")
    }
  }

  // Render inline edit form
  const renderForm = () => {
    return (
      <Card
        elevation={Elevation.TWO}
        style={{
          marginBottom: "20px",
          backgroundColor: "#30404D",
          padding: "15px"
        }}
      >
        <h4>{editingIndex !== null ? "Edit Keyword" : "Add New Keyword"}</h4>
        
        <FormGroup
          label="Keyword Term"
          labelInfo="(leave empty for default/fallback)"
          helperText="The text to match in event titles. Case-insensitive."
        >
          <InputGroup
            placeholder="e.g., 1:1, lunch, dinner, interview"
            value={formTerm}
            onChange={e => setFormTerm(e.target.value)}
          />
        </FormGroup>

        <FormGroup
          label="Template"
          labelInfo="(required)"
          helperText={formRequiresMultipleAttendees 
            ? "Use {attendees} as a placeholder for the attendee names (required)." 
            : "Use {attendees} as an optional placeholder for attendee names."}
        >
          <InputGroup
            placeholder="e.g., [[1:1]] with {attendees}"
            value={formTemplate}
            onChange={e => setFormTemplate(e.target.value)}
          />
        </FormGroup>

        <FormGroup
          label="Priority"
          helperText="Lower numbers have higher priority. Default should be high (e.g., 999)."
        >
          <NumericInput
            min={1}
            value={formPriority}
            onValueChange={value => setFormPriority(value)}
          />
        </FormGroup>

        <div style={{ marginBottom: "10px" }}>
          <Switch
            label="Requires multiple attendees"
            checked={formRequiresMultipleAttendees}
            onChange={e => setFormRequiresMultipleAttendees(e.target.checked)}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <Switch
            label="Use as default template (when no keywords match)"
            checked={formIsDefault}
            onChange={e => setFormIsDefault(e.target.checked)}
          />
        </div>
        
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <Button onClick={resetForm}>
            Cancel
          </Button>
          <Button intent={Intent.PRIMARY} onClick={handleSubmit}>
            {editingIndex !== null ? "Update" : "Add"}
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="event-keyword-settings" style={{ padding: "10px" }}>
      <div style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between" }}>
        <Button
          icon="plus"
          onClick={handleAddClick}
          intent={Intent.PRIMARY}
          disabled={isAddingNew || editingIndex !== null}
        >
          Add Keyword
        </Button>
        <span className="bp3-dark">
          <Button
            icon="reset"
            onClick={handleResetToDefaults}
            minimal={true}
          >
            Reset to Defaults
          </Button>
        </span>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <Tooltip content="Keywords define how calendar events are formatted based on text in the event title. Lower priority numbers take precedence.">
          <Icon icon="info-sign" style={{ marginRight: "5px" }} />
          <span>Keywords are matched in priority order</span>
        </Tooltip>
      </div>

      {/* Show the edit form if adding or editing */}
      {(isAddingNew || editingIndex !== null) && renderForm()}

      {keywords.length === 0 && !isAddingNew ? (
        <div>
          <p>No keywords defined. Click "Add Keyword" to create your first custom event keyword, or "Reset to Defaults" to use the standard templates.</p>
        </div>
      ) : (
        <div className="keyword-list">
          {keywords
            .sort((a, b) => a.priority - b.priority)
            .map((keyword, index) => (
              <Card
                key={index}
                elevation={Elevation.ONE}
                style={{
                  marginBottom: "10px",
                  borderLeft: keyword.isDefault ? "3px solid #137CBD" : undefined,
                  backgroundColor: "#182026",
                  padding: "10px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h4 style={{ margin: "0 0 5px 0" }}>
                      {keyword.term ? keyword.term : <em>Default Template</em>}
                      {keyword.isDefault && (
                        <Tooltip content="This is the default template used when no keywords match">
                          <Icon icon="star" style={{ marginLeft: "5px", color: "#137CBD" }} />
                        </Tooltip>
                      )}
                    </h4>
                    <div>Template: <code style={{ backgroundColor: "#394b59", color: "#f5f8fa", padding: "2px 5px", borderRadius: "3px" }}>{keyword.template}</code></div>
                    <div>
                      <small>
                        Priority: {keyword.priority} •
                        {keyword.requiresMultipleAttendees ? " Requires multiple attendees" : " Works with any attendees"}
                      </small>
                    </div>
                  </div>
                  <div>
                    <Button
                      icon="edit"
                      minimal={true}
                      onClick={() => handleEditClick(keyword, index)}
                      style={{ marginRight: "5px" }}
                      disabled={isAddingNew || editingIndex !== null}
                    />
                    <Button
                      icon="trash"
                      minimal={true}
                      intent={Intent.DANGER}
                      onClick={() => handleDeleteClick(index)}
                      disabled={isAddingNew || editingIndex !== null}
                    />
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}
    </div>
  )
}

export default EventKeywordSettings